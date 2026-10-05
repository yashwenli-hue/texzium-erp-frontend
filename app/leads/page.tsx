"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, DesignNote } from "../../components/ui/PageHeader";
import { Panel } from "../../components/ui/Card";
import { Button, EmptyState } from "../../components/ui/Button";
import { LeadStatusTag, LeadDeactivatedTag, LeadScoreTag, Chip, ChipGroup } from "../../components/ui/Tag";
import { SourceTag } from "../../components/ui/SourceBadge";
import { FollowupTag } from "../../components/ui/FollowupTag";
import { initials } from "../../components/ui/Who";
import { DataTable, Column, toggleSortDirection } from "../../components/ui/DataTable";
import { Pagination, paginate } from "../../components/ui/Button";
import { FilterBar, ActiveFilterChips, FilterGroupConfig, valuesOf, DateRangeFilter, DateRangeValue } from "../../components/ui/FilterButton";
import { LeadForm } from "../../components/forms/LeadForm";
import { useLeads, useLeadSources } from "../../lib/hooks/useLeads";
import { useAuth } from "../../lib/auth/AuthContext";
import { Lead, formatLeadStatus } from "../../lib/types/domain";
import { formatRelative, formatDate } from "../../lib/format";
import { nextPendingFollowup, FollowupInfo } from "../../lib/followup";
import { FilterMap, SortState } from "../../lib/types/common";

const PAGE_SIZE = 8;

export default function LeadsPage() {
  const router = useRouter();
  // Deactivated leads stay out of the normal list; the toggle below brings them in.
  const [showDeactivated, setShowDeactivated] = useState(false);
  const { leads: allLeads, loading, error, createLead, refetch } = useLeads({ includeInactive: showDeactivated });
  const { sources } = useLeadSources();
  const { hasPermission } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters] = useState<FilterMap>({});
  const [dateRange, setDateRange] = useState<DateRangeValue>({ from: "", to: "" });
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortState<string>>({ field: "lastActivityAt", direction: "desc" });
  const [page, setPage] = useState(1);

  const categoryBySourceId = useMemo(() => new Map(sources.map((s) => [s.id, s.category])), [sources]);
  const followupById = useMemo(() => {
    const map = new Map<string, FollowupInfo>();
    for (const l of allLeads) map.set(l.id, nextPendingFollowup(l.followups));
    return map;
  }, [allLeads]);

  const sourceOptions = useMemo(() => [...new Set(allLeads.map((l) => l.sourceName))].sort(), [allLeads]);
  const sourceTypeOptions = useMemo(
    () => [...new Set(sources.map((s) => s.category).filter((c): c is string => !!c))].sort(),
    [sources]
  );
  const cityOptions = useMemo(
    () => [...new Set(allLeads.map((l) => l.uiContext?.city).filter((c): c is string => !!c))].sort(),
    [allLeads]
  );
  const statusOptions = useMemo(
    () => [...new Set(allLeads.map((l) => formatLeadStatus(l.status)))].sort(),
    [allLeads]
  );

  // Groups with zero options (e.g. Source Type/City have no backend basis once
  // real leads have no uiContext/source-category data) are dropped rather than
  // shown as a permanently-empty dropdown.
  const filterGroups: FilterGroupConfig[] = [
    { key: "status", label: "Status", options: statusOptions },
    { key: "source", label: "Source", options: sourceOptions },
    { key: "sourceType", label: "Source Type", options: sourceTypeOptions },
    { key: "followup", label: "Follow-up", options: ["Overdue", "Due Today", "Tomorrow", "Scheduled", "None"] },
    { key: "city", label: "City", options: cityOptions },
    { key: "assignment", label: "Assignment", options: ["Unassigned"] },
  ].filter((g) => g.options.length > 0);

  const filtered = useMemo(() => {
    let rows = [...allLeads];
    const statusF = valuesOf(filters, "status");
    const sourceF = valuesOf(filters, "source");
    const sourceTypeF = valuesOf(filters, "sourceType");
    const followupF = valuesOf(filters, "followup");
    const cityF = valuesOf(filters, "city");
    const assignmentF = valuesOf(filters, "assignment");

    if (statusF.length) rows = rows.filter((l) => statusF.includes(formatLeadStatus(l.status)));
    if (sourceF.length) rows = rows.filter((l) => sourceF.includes(l.sourceName));
    if (sourceTypeF.length) rows = rows.filter((l) => sourceTypeF.includes(categoryBySourceId.get(l.sourceId) ?? ""));
    if (followupF.length) rows = rows.filter((l) => followupF.includes(followupById.get(l.id)?.urgency ?? "None"));
    if (cityF.length) rows = rows.filter((l) => cityF.includes(l.uiContext?.city ?? ""));
    if (assignmentF.includes("Unassigned")) rows = rows.filter((l) => !l.assignedToId);

    // Filters the same createdAt field that powers the Received column and
    // its sort — not a separate/invented date source (design review Stage
    // 1.3.2 §2).
    if (dateRange.from) {
      const fromTs = new Date(`${dateRange.from}T00:00:00`).getTime();
      rows = rows.filter((l) => new Date(l.createdAt).getTime() >= fromTs);
    }
    if (dateRange.to) {
      const toTs = new Date(`${dateRange.to}T23:59:59.999`).getTime();
      rows = rows.filter((l) => new Date(l.createdAt).getTime() <= toTs);
    }

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
  }, [allLeads, filters, dateRange, search, sort, categoryBySourceId, followupById]);

  const pageRows = paginate(filtered, page, PAGE_SIZE);

  const columns: Column<Lead>[] = [
    {
      key: "customerName",
      header: "Lead",
      sortable: true,
      render: (l) => (
        <div className="who" style={l.isActive ? undefined : { opacity: 0.65 }}>
          <div className="av">{initials(l.customerName)}</div>
          <div className="lead-id">
            <b>{l.customerName}</b>
            <small>{[l.companyName, l.uiContext?.city].filter(Boolean).join(" · ") || l.sourceName}</small>
          </div>
        </div>
      ),
    },
    { key: "sourceName", header: "Source", render: (l) => <SourceTag source={l.sourceName} /> },
    { key: "createdAt", header: "Received", sortable: true, render: (l) => formatDate(l.createdAt) },
    {
      key: "productInterest",
      header: "Product / Interest",
      render: (l) => l.uiContext?.productInterest ?? <span style={{ color: "var(--faint)" }}>—</span>,
    },
    { key: "score", header: "Score", render: (l) => (l.score ? <LeadScoreTag score={l.score} /> : <span style={{ color: "var(--faint)" }}>—</span>) },
    {
      key: "status",
      header: "Status",
      render: (l) => (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <LeadStatusTag status={l.status} />
          {!l.isActive && <LeadDeactivatedTag />}
        </div>
      ),
    },
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

  // Without this guard the table briefly renders its "no leads match these
  // filters" empty state during the initial mock fetch (allLeads starts
  // empty until the request resolves), which reads as a real empty result
  // rather than a loading state — same guard Lead Detail already uses.
  if (loading && allLeads.length === 0) {
    return (
      <div className="page">
        <div className="skeleton" style={{ height: 220, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 300 }} />
      </div>
    );
  }

  // A failed fetch must not read as "zero leads" — that's the DataTable's own
  // empty state below, reserved for a genuine successful zero-result response.
  if (error && allLeads.length === 0) {
    return (
      <div className="page">
        <PageHeader
          eyebrow="RevenueOS · Pipeline · Leads"
          title="Leads"
          subtitle="Every inbound and outbound lead, from first contact to qualification."
        />
        <Panel title="Lead Master">
          <EmptyState
            icon="alert"
            title="Couldn't load leads"
            body={error.message || "Something went wrong reaching the RevenueOS backend. Please try again."}
            action={
              <Button variant="ghost" onClick={refetch}>
                Retry
              </Button>
            }
          />
        </Panel>
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="RevenueOS · Pipeline · Leads"
        title="Leads"
        subtitle="Every inbound and outbound lead, from first contact to qualification."
        cta={
          <Button
            variant="primary"
            icon="plus"
            onClick={() => setShowForm(true)}
            disabled={!hasPermission("leads.create")}
            title={hasPermission("leads.create") ? undefined : "You don't have permission to create leads"}
          >
            New Lead
          </Button>
        }
      />

      <div style={{ marginBottom: 6 }}>
        <input
          style={{ maxWidth: 320, width: "100%", padding: "9px 13px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--surface)", color: "var(--text)", fontSize: 13.5, fontFamily: "inherit", outline: "none" }}
          placeholder="Search leads by name, company, product, owner…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      <div style={{ marginBottom: 8 }}>
        <ChipGroup>
          <Chip
            label="Show deactivated"
            active={showDeactivated}
            onClick={() => { setShowDeactivated((v) => !v); setPage(1); }}
          />
        </ChipGroup>
      </div>

      <FilterBar
        groups={filterGroups}
        value={filters}
        onChange={(f) => { setFilters(f); setPage(1); }}
        trailing={
          <DateRangeFilter
            label="Received date"
            value={dateRange}
            onChange={(v) => { setDateRange(v); setPage(1); }}
          />
        }
      />
      <ActiveFilterChips groups={filterGroups} value={filters} onChange={(f) => { setFilters(f); setPage(1); }} />

      <div className="lead-table" style={{ marginTop: 14 }}>
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
        <b>Design note.</b> Follow-up urgency is derived from each lead&apos;s own LeadFollowup records;
        Product/Interest is a UI-only lead field with no backend equivalent yet (see LeadUIContext in
        lib/types/domain.ts). Click any row to open the full Lead workspace.
      </DesignNote>

      {showForm && <LeadForm onClose={() => setShowForm(false)} onSubmit={createLead} />}
    </div>
  );
}
