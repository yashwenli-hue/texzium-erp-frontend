"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, DesignNote } from "../../components/ui/PageHeader";
import { Panel } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Who } from "../../components/ui/Who";
import { StatusTag } from "../../components/ui/Tag";
import { ChipGroup, Chip } from "../../components/ui/Tag";
import { DataTable, Column, toggleSortDirection } from "../../components/ui/DataTable";
import { Pagination, paginate } from "../../components/ui/Button";
import { FilterButton } from "../../components/ui/FilterButton";
import { LeadForm } from "../../components/forms/LeadForm";
import { useLeads } from "../../lib/hooks/useLeads";
import { Lead, LEAD_STATUSES } from "../../lib/types/domain";
import { formatRelative } from "../../lib/format";
import { FilterMap, SortState } from "../../lib/types/common";


const PAGE_SIZE = 8;

export default function LeadsPage() {
  const router = useRouter();
  const { leads: allLeads, loading, createLead } = useLeads();
  const [showForm, setShowForm] = useState(false);
  const [statusChip, setStatusChip] = useState<string>("All");
  const [filters, setFilters] = useState<FilterMap>({});
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortState<string>>({ field: "lastActivityAt", direction: "desc" });
  const [page, setPage] = useState(1);

  const statusCounts = useMemo(() => {
    const map: Record<string, number> = {};
    allLeads.forEach((l) => (map[l.status] = (map[l.status] ?? 0) + 1));
    return map;
  }, [allLeads]);

  const sourceOptions = useMemo(
    () => [...new Set(allLeads.map((l) => l.sourceName))].sort(),
    [allLeads]
  );

  const filtered = useMemo(() => {
    let rows = [...allLeads];
    if (statusChip !== "All") rows = rows.filter((l) => l.status === statusChip);
    if (filters.source) rows = rows.filter((l) => l.sourceName === filters.source);
    if (filters.score) rows = rows.filter((l) => l.score === filters.score);
    if (filters.assignment === "Unassigned") rows = rows.filter((l) => !l.assignedToId);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(
        (l) =>
          l.customerName.toLowerCase().includes(q) ||
          (l.companyName ?? "").toLowerCase().includes(q) ||
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
  }, [allLeads, statusChip, filters, search, sort]);

  const pageRows = paginate(filtered, page, PAGE_SIZE);

  const columns: Column<Lead>[] = [
    {
      key: "customerName",
      header: "Lead",
      sortable: true,
      render: (l) => <Who name={l.customerName} sub={l.companyName ?? l.sourceName} />,
    },
    { key: "sourceName", header: "Source", render: (l) => l.sourceName },
    { key: "status", header: "Status", render: (l) => <StatusTag status={l.status} /> },
    {
      key: "assignedToName",
      header: "Assigned To",
      render: (l) => l.assignedToName ?? <span style={{ color: "var(--faint)" }}>Unassigned</span>,
    },
    { key: "score", header: "Score", render: (l) => <StatusTag status={l.score} /> },
    { key: "lastActivityAt", header: "Last Activity", sortable: true, render: (l) => formatRelative(l.lastActivityAt) },
  ];

  return (
    <div className="page">
      <PageHeader
        eyebrow="RevenueOS · Pipeline · Leads"
        title="Leads"
        subtitle="Every inbound and outbound lead, from first contact to qualification."
        cta={
          <>
            <FilterButton
              groups={[
                { key: "source", label: "Source", options: sourceOptions },
                { key: "score", label: "Score", options: ["Hot", "Warm", "Cold"] },
                { key: "assignment", label: "Assignment", options: ["Unassigned"] },
              ]}
              value={filters}
              onChange={(f) => { setFilters(f); setPage(1); }}
            />
            <Button variant="primary" icon="plus" onClick={() => setShowForm(true)}>
              New Lead
            </Button>
          </>
        }
      />

      <div style={{ marginBottom: 6 }}>
        <input
          style={{ maxWidth: 320, width: "100%", padding: "9px 13px", borderRadius: 10, border: "1px solid var(--line)", fontSize: 13.5, fontFamily: "inherit", outline: "none" }}
          placeholder="Search leads by name, company, owner…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      <ChipGroup>
        <Chip label={`All ${allLeads.length}`} active={statusChip === "All"} onClick={() => { setStatusChip("All"); setPage(1); }} />
        {LEAD_STATUSES.filter((s) => statusCounts[s]).map((s) => (
          <Chip
            key={s}
            label={`${s} ${statusCounts[s]}`}
            active={statusChip === s}
            onClick={() => { setStatusChip(s); setPage(1); }}
          />
        ))}
      </ChipGroup>

      <div style={{ marginTop: 14 }}>
        <Panel title="Lead Master" flush>
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
        <b>Design note.</b> Leads is a list+detail pattern — click any row to open Lead Details with
        full timeline, assignment and qualify/reject actions. A lead only carries status here; deal
        value, probability and close date live on the Opportunity created once it&apos;s qualified.
      </DesignNote>

      {showForm && <LeadForm onClose={() => setShowForm(false)} onSubmit={createLead} />}
    </div>
  );
}
