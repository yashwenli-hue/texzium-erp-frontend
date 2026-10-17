"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, DesignNote } from "../../components/ui/PageHeader";
import { StatCard, StatRow, Panel } from "../../components/ui/Card";
import { Button, EmptyState } from "../../components/ui/Button";
import { OpportunityStageTag, ChipGroup, Chip } from "../../components/ui/Tag";
import { DataTable, Column, toggleSortDirection } from "../../components/ui/DataTable";
import { Pagination, paginate } from "../../components/ui/Button";
import { OpportunityForm } from "../../components/forms/OpportunityForm";
import { useOpportunities } from "../../lib/hooks/useOpportunities";
import { useLeads } from "../../lib/hooks/useLeads";
import { useAuth } from "../../lib/auth/AuthContext";
import { Opportunity, OPPORTUNITY_STAGES, formatOpportunityStage } from "../../lib/types/domain";
import { formatInr, formatDate } from "../../lib/format";
import { SortState } from "../../lib/types/common";
import { OpportunitySortField } from "../../lib/repository/interfaces";

const PAGE_SIZE = 8;

export default function OpportunitiesPage() {
  const router = useRouter();
  const { opportunities, loading, error, createOpportunity, refetch, sort, setSort } = useOpportunities();
  const { leads } = useLeads();
  const { hasPermission } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [stageChip, setStageChip] = useState<string>("All");
  const [page, setPage] = useState(1);

  // Product isn't an Opportunity field — it's surfaced from the linked
  // Lead's existing uiContext.productInterest (mock/UI-only, see
  // LeadUIContext in lib/types/domain.ts). No new relation invented.
  const productByLeadId = useMemo(() => new Map(leads.map((l) => [l.id, l.uiContext?.productInterest])), [leads]);

  const open = opportunities.filter((o) => o.stage !== "WON" && o.stage !== "LOST");
  const weighted = open.reduce((s, o) => s + (o.expectedValue * o.probability) / 100, 0);
  const avgDeal = open.length ? Math.round(open.reduce((s, o) => s + o.expectedValue, 0) / open.length) : 0;
  const won = opportunities.filter((o) => o.stage === "WON").length;
  const winRate = opportunities.length ? Math.round((won / opportunities.length) * 100) : 0;

  const stageCounts = useMemo(() => {
    const map: Record<string, number> = {};
    opportunities.forEach((o) => (map[o.stage] = (map[o.stage] ?? 0) + 1));
    return map;
  }, [opportunities]);

  const filtered = stageChip === "All" ? opportunities : opportunities.filter((o) => o.stage === stageChip);
  const rows = paginate(filtered, page, PAGE_SIZE);

  const columns: Column<Opportunity>[] = [
    {
      key: "title",
      header: "Opportunity",
      render: (o) => (
        <div>
          <b style={{ fontSize: 13.5, fontWeight: 600 }}>{o.title}</b>
          <small style={{ display: "block", color: "var(--muted)", fontSize: 12, marginTop: 1 }}>
            {o.customer ? o.customer.customerName : o.customerName}
            {!o.customerId && <span style={{ color: "var(--warn)", fontWeight: 600 }}> · no customer yet</span>}
          </small>
        </div>
      ),
    },
    { key: "stage", header: "Stage", render: (o) => <OpportunityStageTag stage={o.stage} /> },
    {
      key: "product",
      header: "Product",
      render: (o) => productByLeadId.get(o.leadId) ?? <span style={{ color: "var(--faint-text)" }}>—</span>,
    },
    { key: "expectedValue", header: "Expected Value", sortable: true, render: (o) => formatInr(o.expectedValue) },
    {
      key: "probability",
      header: "Probability",
      sortable: true,
      render: (o) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 90 }}>
          <div className="bar" style={{ flex: 1 }}>
            <i style={{ width: `${o.probability}%` }} />
          </div>
          <span className="tnum" style={{ fontSize: 12, color: "var(--muted)" }}>{o.probability}%</span>
        </div>
      ),
    },
    { key: "expectedCloseDate", header: "Expected Close", sortable: true, render: (o) => formatDate(o.expectedCloseDate) },
    { key: "ownerName", header: "Owner", render: (o) => o.ownerName },
  ];

  if (loading && opportunities.length === 0) {
    return (
      <div className="page">
        <div className="skeleton" style={{ height: 220, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 300 }} />
      </div>
    );
  }

  // A failed fetch must not read as "zero opportunities" — that's the
  // DataTable's own empty state below, reserved for a genuine zero-result response.
  if (error && opportunities.length === 0) {
    return (
      <div className="page">
        <PageHeader
          eyebrow="RevenueOS · Pipeline · Opportunities"
          title="Opportunities"
          subtitle="Qualified, forecastable deals — value, probability and expected close."
        />
        <Panel title="Opportunities">
          <EmptyState
            icon="alert"
            title="Couldn't load opportunities"
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
        eyebrow="RevenueOS · Pipeline · Opportunities"
        title="Opportunities"
        subtitle="Qualified, forecastable deals — value, probability and expected close."
        cta={
          <Button
            variant="primary"
            icon="plus"
            onClick={() => setShowForm(true)}
            disabled={!hasPermission("opportunities.create")}
            title={hasPermission("opportunities.create") ? undefined : "You don't have permission to create opportunities"}
          >
            New Opportunity
          </Button>
        }
      />

      <StatRow>
        <StatCard label="Open Opportunities" value={String(open.length)} note={`across ${new Set(open.map((o) => o.customerName)).size} accounts`} />
        <StatCard label="Weighted Forecast" value={formatInr(weighted)} note="estimate — probability-adjusted, not a backend figure" />
        <StatCard label="Avg Deal Size" value={formatInr(avgDeal)} note="open opportunities" />
        <StatCard label="Win Rate" value={`${winRate}%`} note="of all opportunities" />
      </StatRow>

      <ChipGroup>
        <Chip label={`All ${opportunities.length}`} active={stageChip === "All"} onClick={() => { setStageChip("All"); setPage(1); }} />
        {OPPORTUNITY_STAGES.filter((s) => stageCounts[s]).map((s) => (
          <Chip key={s} label={`${formatOpportunityStage(s)} ${stageCounts[s]}`} active={stageChip === s} onClick={() => { setStageChip(s); setPage(1); }} />
        ))}
      </ChipGroup>

      <div style={{ marginTop: 14 }}>
        <Panel title="Opportunities" flush>
          <DataTable
            columns={columns}
            rows={rows}
            sort={sort}
            onSort={(field) =>
              setSort((s) => toggleSortDirection(s, field) as SortState<OpportunitySortField>)
            }
            onRowClick={(o) => router.push(`/opportunities/${o.id}`)}
            emptyTitle="No opportunities yet"
            emptyBody="Opportunities appear here once a lead is qualified and converted."
          />
          <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
        </Panel>
      </div>

      <DesignNote>
        <b>Design note.</b> The probability bar lets a sales head scan likelihood without reading every
        number. Weighted Forecast is a frontend estimate for presentation only — it is not authoritative
        unless the backend supplies a real forecast figure.
      </DesignNote>

      {showForm && <OpportunityForm onClose={() => setShowForm(false)} onSubmit={createOpportunity} />}
    </div>
  );
}
