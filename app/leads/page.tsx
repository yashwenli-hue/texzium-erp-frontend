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
import { Lead, LEAD_STAGES } from "../../lib/types/domain";
import { formatInr, formatRelative } from "../../lib/format";
import { SortState } from "../../lib/types/common";


const PAGE_SIZE = 6;

export default function LeadsPage() {
  const router = useRouter();
  const { leads: allLeads, loading, createLead } = useLeads();
  const [showForm, setShowForm] = useState(false);
  const [stageChip, setStageChip] = useState<string>("All");
  const [filters, setFilters] = useState<Record<string, string | undefined>>({});
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortState<string>>({ field: "lastActivityAt", direction: "desc" });
  const [page, setPage] = useState(1);

  const stageCounts = useMemo(() => {
    const map: Record<string, number> = {};
    allLeads.forEach((l) => (map[l.stage] = (map[l.stage] ?? 0) + 1));
    return map;
  }, [allLeads]);

  const sourceOptions = useMemo(
    () => [...new Set(allLeads.map((l) => l.source))].sort(),
    [allLeads]
  );

  const filtered = useMemo(() => {
    let rows = [...allLeads];
    if (stageChip !== "All") rows = rows.filter((l) => l.stage === stageChip);
    if (filters.source) rows = rows.filter((l) => l.source === filters.source);
    if (filters.score) rows = rows.filter((l) => l.score === filters.score);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.industry.toLowerCase().includes(q) ||
          l.city.toLowerCase().includes(q) ||
          l.ownerName.toLowerCase().includes(q)
      );
    }
    rows.sort((a, b) => {
      const av = (a as any)[sort.field];
      const bv = (b as any)[sort.field];
      const cmp = typeof av === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sort.direction === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [allLeads, stageChip, filters, search, sort]);

  const pageRows = paginate(filtered, page, PAGE_SIZE);

  const columns: Column<Lead>[] = [
    { key: "name", header: "Lead", sortable: true, render: (l) => <Who name={l.name} sub={`${l.industry} · ${l.city}`} /> },
    { key: "source", header: "Source", render: (l) => l.source },
    { key: "stage", header: "Stage", render: (l) => <StatusTag status={l.stage} /> },
    { key: "ownerName", header: "Owner", render: (l) => l.ownerName },
    { key: "value", header: "Value", sortable: true, render: (l) => formatInr(l.value) },
    { key: "score", header: "Score", render: (l) => <StatusTag status={l.score} /> },
    { key: "lastActivityAt", header: "Last Activity", sortable: true, render: (l) => formatRelative(l.lastActivityAt) },
  ];

  return (
    <div className="page">
      <PageHeader
        eyebrow="RevenueOS · Leads"
        title="Leads"
        subtitle="Every inbound and outbound lead, from first contact to qualification."
        cta={
          <>
            <FilterButton
              groups={[
                { key: "source", label: "Source", options: sourceOptions },
                { key: "score", label: "Score", options: ["Hot", "Warm", "Cold"] },
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
          placeholder="Search leads by name, city, owner…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      <ChipGroup>
        <Chip label={`All ${allLeads.length}`} active={stageChip === "All"} onClick={() => { setStageChip("All"); setPage(1); }} />
        {LEAD_STAGES.filter((s) => stageCounts[s]).map((s) => (
          <Chip
            key={s}
            label={`${s} ${stageCounts[s]}`}
            active={stageChip === s}
            onClick={() => { setStageChip(s); setPage(1); }}
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
        full timeline and quick actions. Stage chip counts are computed live from the current dataset,
        not hardcoded.
      </DesignNote>

      {showForm && <LeadForm onClose={() => setShowForm(false)} onSubmit={createLead} />}
    </div>
  );
}
