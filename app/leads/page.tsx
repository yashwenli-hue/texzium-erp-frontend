"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, DesignNote } from "../../components/ui/PageHeader";
import { Panel } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { StatusTag } from "../../components/ui/Tag";
import { SourceBadge, SourceTag } from "../../components/ui/SourceBadge";
import { FollowupTag } from "../../components/ui/FollowupTag";
import { initials } from "../../components/ui/Who";
import { DataTable, Column, toggleSortDirection } from "../../components/ui/DataTable";
import { Pagination, paginate } from "../../components/ui/Button";
import { FilterBar, ActiveFilterChips, FilterGroupConfig, valuesOf } from "../../components/ui/FilterButton";
import { LeadForm } from "../../components/forms/LeadForm";
import { useLeads, useLeadSources } from "../../lib/hooks/useLeads";
import { useTasks } from "../../lib/hooks/useTasks";
import { Lead } from "../../lib/types/domain";
import { formatRelative } from "../../lib/format";
import { nextFollowupFor, FollowupInfo } from "../../lib/followup";
import { FilterMap, SortState } from "../../lib/types/common";

const PAGE_SIZE = 8;

export default function LeadsPage() {
  const router = useRouter();
  const { leads: allLeads, createLead } = useLeads();
  const { sources } = useLeadSources();
  const { tasks } = useTasks();
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters] = useState<FilterMap>({});
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortState<string>>({ field: "lastActivityAt", direction: "desc" });
  const [page, setPage] = useState(1);

  const categoryBySourceId = useMemo(() => new Map(sources.map((s) => [s.id, s.category])), [sources]);
  const followupById = useMemo(() => {
    const map = new Map<string, FollowupInfo>();
    for (const l of allLeads) map.set(l.id, nextFollowupFor(l.id, tasks));
    return map;
  }, [allLeads, tasks]);

  const sourceOptions = useMemo(() => [...new Set(allLeads.map((l) => l.sourceName))].sort(), [allLeads]);
  const sourceTypeOptions = useMemo(
    () => [...new Set(sources.map((s) => s.category).filter((c): c is string => !!c))].sort(),
    [sources]
  );
  const cityOptions = useMemo(
    () => [...new Set(allLeads.map((l) => l.uiContext?.city).filter((c): c is string => !!c))].sort(),
    [allLeads]
  );

  const filterGroups: FilterGroupConfig[] = [
    { key: "status", label: "Status", options: ["New", "Contacted", "Qualified", "Rejected"] },
    { key: "source", label: "Source", options: sourceOptions },
    { key: "sourceType", label: "Source Type", options: sourceTypeOptions },
    { key: "followup", label: "Follow-up", options: ["Overdue", "Due Today", "Tomorrow", "Scheduled", "None"] },
    { key: "city", label: "City", options: cityOptions },
    { key: "assignment", label: "Assignment", options: ["Unassigned"] },
  ];

  const filtered = useMemo(() => {
    let rows = [...allLeads];
    const statusF = valuesOf(filters, "status");
    const sourceF = valuesOf(filters, "source");
    const sourceTypeF = valuesOf(filters, "sourceType");
    const followupF = valuesOf(filters, "followup");
    const cityF = valuesOf(filters, "city");
    const assignmentF = valuesOf(filters, "assignment");

    if (statusF.length) rows = rows.filter((l) => statusF.includes(l.status));
    if (sourceF.length) rows = rows.filter((l) => sourceF.includes(l.sourceName));
    if (sourceTypeF.length) rows = rows.filter((l) => sourceTypeF.includes(categoryBySourceId.get(l.sourceId) ?? ""));
    if (followupF.length) rows = rows.filter((l) => followupF.includes(followupById.get(l.id)?.urgency ?? "None"));
    if (cityF.length) rows = rows.filter((l) => cityF.includes(l.uiContext?.city ?? ""));
    if (assignmentF.includes("Unassigned")) rows = rows.filter((l) => !l.assignedToId);

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(
        (l) =>
          l.customerName.toLowerCase().includes(q) ||
          (l.companyName ?? "").toLowerCase().includes(q) ||
          (l.uiContext?.productInterest ?? "").toLowerCase().includes(q) ||
          (l.assignedToName ?? "").toLowerCase().includes(q)
      );
    }
    rows.sort((a, b) => {
      const av = (a as any)[sort.field];
      const bv = (b as any)[sort.field];
      const cmp = typeof av === "number" ? av - bv : String(av ?? "").localeCompare(String(bv ?? ""));
      return sort.direction === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [allLeads, filters, search, sort, categoryBySourceId, followupById]);

  const pageRows = paginate(filtered, page, PAGE_SIZE);

  const columns: Column<Lead>[] = [
    {
      key: "customerName",
      header: "Lead",
      sortable: true,
      render: (l) => (
        <div className="who">
          <div className="av-wrap">
            <div className="av">{initials(l.customerName)}</div>
            <span className="av-source-dot"><SourceBadge source={l.sourceName} size={15} /></span>
          </div>
          <div>
            <b>{l.customerName}</b>
            <small>{[l.companyName, l.uiContext?.city].filter(Boolean).join(" · ") || l.sourceName}</small>
          </div>
        </div>
      ),
    },
    { key: "sourceName", header: "Source", render: (l) => <SourceTag source={l.sourceName} /> },
    {
      key: "productInterest",
      header: "Product / Interest",
      render: (l) => l.uiContext?.productInterest ?? <span style={{ color: "var(--faint)" }}>—</span>,
    },
    { key: "score", header: "Score", render: (l) => <StatusTag status={l.score} /> },
    { key: "status", header: "Status", render: (l) => <StatusTag status={l.status} /> },
    {
      key: "followup",
      header: "Follow-up",
      render: (l) => {
        const info = followupById.get(l.id) ?? { urgency: "None" as const, dueAt: null };
        return <FollowupTag urgency={info.urgency} dueAt={info.dueAt} />;
      },
    },
    {
      key: "assignedToName",
      header: "Assigned To",
      render: (l) => l.assignedToName ?? <span style={{ color: "var(--faint)" }}>Unassigned</span>,
    },
    { key: "lastActivityAt", header: "Last Activity", sortable: true, render: (l) => formatRelative(l.lastActivityAt) },
  ];

  return (
    <div className="page">
      <PageHeader
        eyebrow="RevenueOS · Pipeline · Leads"
        title="Leads"
        subtitle="Every inbound and outbound lead, from first contact to qualification."
        cta={
          <Button variant="primary" icon="plus" onClick={() => setShowForm(true)}>
            New Lead
          </Button>
        }
      />

      <div style={{ marginBottom: 6 }}>
        <input
          style={{ maxWidth: 320, width: "100%", padding: "9px 13px", borderRadius: 10, border: "1px solid var(--line)", fontSize: 13.5, fontFamily: "inherit", outline: "none" }}
          placeholder="Search leads by name, company, product, owner…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      <FilterBar groups={filterGroups} value={filters} onChange={(f) => { setFilters(f); setPage(1); }} />
      <ActiveFilterChips groups={filterGroups} value={filters} onChange={(f) => { setFilters(f); setPage(1); }} />

      <div style={{ marginTop: 14 }}>
        <Panel title={`Lead Master · ${filtered.length}`} flush>
          <DataTable
            columns={columns}
            rows={pageRows}
            sort={sort}
            onSort={(field) => setSort((s) => toggleSortDirection(s, field))}
            onRowClick={(l) => router.push(`/leads/${l.id}`)}
            emptyTitle="No leads match these filters"
            emptyBody="Try clearing the search or filters above."
          />
          <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
        </Panel>
      </div>

      <DesignNote>
        <b>Design note.</b> Follow-up urgency and Product/Interest are presentation-only (derived from
        mock Task data and a UI-only lead field respectively — see lib/followup.ts and LeadUIContext in
        lib/types/domain.ts). Click any row to open the full Lead workspace.
      </DesignNote>

      {showForm && <LeadForm onClose={() => setShowForm(false)} onSubmit={createLead} />}
    </div>
  );
}
