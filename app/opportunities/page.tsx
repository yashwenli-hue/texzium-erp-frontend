"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatCard, StatRow, Panel } from "../../components/ui/Card";
import { Button, EmptyState } from "../../components/ui/Button";
import { OpportunityStageTag, ChipGroup, Chip } from "../../components/ui/Tag";
import { ResponsiveList, ResponsiveColumn, ListCard } from "../../components/ui/ResponsiveList";
import { ListSearch } from "../../components/ui/ListSearch";
import { LoadingRegion } from "../../components/ui/LoadingRegion";
import { matchesText } from "../../lib/ui/listSearch";
import { Pagination, paginate } from "../../components/ui/Button";
import { OpportunityForm } from "../../components/forms/OpportunityForm";
import { useOpportunities } from "../../lib/hooks/useOpportunities";
import { useLeads } from "../../lib/hooks/useLeads";
import { useAuth } from "../../lib/auth/AuthContext";
import { Opportunity, OPPORTUNITY_STAGES, formatOpportunityStage } from "../../lib/types/domain";
import { formatInr, formatDate } from "../../lib/format";
import { OpportunitySortField } from "../../lib/repository/interfaces";

const PAGE_SIZE = 8;

export default function OpportunitiesPage() {
  const { opportunities, loading, error, createOpportunity, refetch, sort, setSort } = useOpportunities();
  const { leads } = useLeads();
  const { hasPermission } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [stageChip, setStageChip] = useState<string>("All");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  // Product isn't an Opportunity field: it is the product recorded on the lead the deal came from
  // (Lead.inventoryItem), or, for older leads, the free-text interest kept with the lead in this browser.
  const productByLeadId = useMemo(() => new Map(leads.map((l) => [l.id, l.product?.name ?? l.uiContext?.productInterest])), [leads]);
  const productOf = (o: Opportunity) => productByLeadId.get(o.leadId);
  const opportunitySort = {
    key: sort?.field ?? "default",
    direction: sort?.direction ?? ("desc" as const),
    options: [
      { key: "default", label: "Default order" },
      { key: "expectedValue", label: "Expected value" },
      { key: "probability", label: "Probability" },
      { key: "expectedCloseDate", label: "Expected close" },
    ],
    onChange: (key: string, direction?: "asc" | "desc") => {
      setPage(1);
      if (key === "default") return setSort(undefined);
      setSort({ field: key as OpportunitySortField, direction: direction ?? (key === sort?.field ? (sort.direction === "asc" ? "desc" : "asc") : key === "expectedCloseDate" ? "asc" : "desc") });
    },
  };

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

  const byStatus = stageChip === "All" ? opportunities : opportunities.filter((o) => o.stage === stageChip);
  const filtered = search.trim() ? byStatus.filter((o) => matchesText([o.title, o.customer?.customerName ?? o.customerName, o.ownerName, productOf(o)], search)) : byStatus;
  const rows = paginate(filtered, page, PAGE_SIZE);

  const columns: ResponsiveColumn<Opportunity>[] = [
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
      render: (o) => productOf(o) ?? <span className="cell-none">Not recorded</span>,
    },
    { key: "expectedValue", header: "Expected Value", sortKey: "expectedValue", render: (o) => formatInr(o.expectedValue) },
    {
      key: "probability",
      header: "Probability",
      sortKey: "probability",
      render: (o) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 90 }}>
          <div className="bar" style={{ flex: 1 }}>
            <i style={{ width: `${o.probability}%` }} />
          </div>
          <span className="tnum" style={{ fontSize: 12, color: "var(--muted)" }}>{o.probability}%</span>
        </div>
      ),
    },
    { key: "expectedCloseDate", header: "Expected Close", sortKey: "expectedCloseDate", render: (o) => formatDate(o.expectedCloseDate) },
    { key: "ownerName", header: "Owner", render: (o) => o.ownerName },
  ];

  if (loading && opportunities.length === 0) {
    return (
      <div className="page">
        <LoadingRegion label="Loading opportunities">
          <div className="skeleton" style={{ height: 220, marginBottom: 16 }} />
          <div className="skeleton" style={{ height: 300 }} />
        </LoadingRegion>
      </div>
    );
  }

  // A failed fetch must not read as "zero opportunities" — that's the
  // DataTable's own empty state below, reserved for a genuine zero-result response.
  if (error && opportunities.length === 0) {
    const forbidden = (error as { status?: number }).status === 403;
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
            title={forbidden ? "You don't have access to opportunities" : "Couldn't load opportunities"}
            body={forbidden ? "Viewing opportunities needs the opportunities.view permission. Ask an administrator to grant it, then sign in again." : error.message || "Something went wrong reaching the RevenueOS backend. Please try again."}
            action={
              forbidden ? undefined : (
                <Button variant="ghost" onClick={refetch}>
                  Retry
                </Button>
              )
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

      <div className="list-toolbar">
        <ListSearch value={search} onChange={(t) => { setSearch(t); setPage(1); }} label="Search opportunities" placeholder="Search opportunity, customer, product, owner…" />
        <p className="list-status" role="status">{search.trim() ? `${filtered.length} of ${byStatus.length}` : ""}</p>
      </div>
      <ChipGroup>
        <Chip label={`All ${opportunities.length}`} active={stageChip === "All"} onClick={() => { setStageChip("All"); setPage(1); }} />
        {OPPORTUNITY_STAGES.filter((s) => stageCounts[s]).map((s) => (
          <Chip key={s} label={`${formatOpportunityStage(s)} ${stageCounts[s]}`} active={stageChip === s} onClick={() => { setStageChip(s); setPage(1); }} />
        ))}
      </ChipGroup>

      <div style={{ marginTop: 14 }}>
        <Panel title="Opportunities" flush>
          <ResponsiveList
            rows={rows}
            columns={columns}
            getHref={(o) => `/opportunities/${o.id}`}
            getLabel={(o) => `Open opportunity ${o.title}, ${o.customer ? o.customer.customerName : o.customerName}`}
            card={(o) => <ListCard title={o.title} sub={o.customer ? o.customer.customerName : `${o.customerName} · no customer yet`} status={<OpportunityStageTag stage={o.stage} />} amount={formatInr(o.expectedValue)} meta={[`${o.probability}% likely`, `Close ${formatDate(o.expectedCloseDate)}`, o.ownerName, productOf(o)]} />}
            caption="Opportunities"
            emptyTitle={search.trim() ? "Nothing matches this search" : "No opportunities yet"}
            emptyBody={search.trim() ? "Try another name or number, or clear the search." : "Opportunities appear here once a lead is qualified and converted."}
            sort={opportunitySort}
          />
          <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
        </Panel>
      </div>


      {showForm && <OpportunityForm onClose={() => setShowForm(false)} onSubmit={createOpportunity} />}
    </div>
  );
}
