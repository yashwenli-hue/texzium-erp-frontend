"use client";

import { PageHeader, DesignNote } from "../../components/ui/PageHeader";
import { StatCard, StatRow, Panel } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { StatusTag } from "../../components/ui/Tag";
import { DataTable, Column, toggleSortDirection } from "../../components/ui/DataTable";
import { OpportunityForm } from "../../components/forms/OpportunityForm";
import { useOpportunities } from "../../lib/hooks/useOpportunities";
import { useState } from "react";
import { Opportunity } from "../../lib/types/domain";
import { formatInr, formatDate } from "../../lib/format";
import { SortState } from "../../lib/types/common";
import { OpportunitySortField } from "../../lib/repository/interfaces";

export default function OpportunitiesPage() {
  const { opportunities, createOpportunity, sort, setSort } = useOpportunities();
  const [showForm, setShowForm] = useState(false);

  const open = opportunities.filter((o) => o.stage !== "Won" && o.stage !== "Lost");
  const weighted = open.reduce((s, o) => s + (o.amount * o.probability) / 100, 0);
  const avgDeal = open.length ? Math.round(open.reduce((s, o) => s + o.amount, 0) / open.length) : 0;
  const won = opportunities.filter((o) => o.stage === "Won").length;
  const winRate = opportunities.length ? Math.round((won / opportunities.length) * 100) : 0;

  const columns: Column<Opportunity>[] = [
    { key: "name", header: "Opportunity", render: (o) => o.name },
    { key: "customerName", header: "Customer", render: (o) => o.customerName },
    { key: "stage", header: "Stage", render: (o) => <StatusTag status={o.stage} /> },
    { key: "amount", header: "Amount", sortable: true, render: (o) => formatInr(o.amount) },
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
    { key: "expectedCloseAt", header: "Expected Close", sortable: true, render: (o) => formatDate(o.expectedCloseAt) },
    { key: "ownerName", header: "Owner", render: (o) => o.ownerName },
  ];

  return (
    <div className="page">
      <PageHeader
        eyebrow="RevenueOS · Opportunities"
        title="Opportunities"
        subtitle="Qualified, forecastable deals — value, probability and expected close."
        cta={
          <Button variant="primary" icon="plus" onClick={() => setShowForm(true)}>
            New Opportunity
          </Button>
        }
      />

      <StatRow>
        <StatCard label="Open Opportunities" value={String(open.length)} note={`across ${new Set(open.map((o) => o.customerName)).size} accounts`} />
        <StatCard label="Weighted Forecast" value={formatInr(weighted)} note="probability-adjusted" />
        <StatCard label="Avg Deal Size" value={formatInr(avgDeal)} note="open opportunities" />
        <StatCard label="Win Rate" value={`${winRate}%`} note="of all opportunities" />
      </StatRow>

      <div style={{ marginTop: 16 }}>
        <Panel title="Open Opportunities" flush>
          <DataTable
            columns={columns}
            rows={opportunities}
            sort={sort}
            onSort={(field) =>
              setSort((s) => toggleSortDirection(s, field) as SortState<OpportunitySortField>)
            }
            emptyTitle="No opportunities yet"
            emptyBody="Opportunities appear here once a lead is qualified."
          />
        </Panel>
      </div>

      <DesignNote>
        <b>Design note.</b> Opportunities is the forecastable view of the pipeline. The probability bar
        lets a sales head scan likelihood without reading every number.
      </DesignNote>

      {showForm && <OpportunityForm onClose={() => setShowForm(false)} onSubmit={createOpportunity} />}
    </div>
  );
}
