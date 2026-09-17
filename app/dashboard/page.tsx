"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, DesignNote } from "../../components/ui/PageHeader";
import { StatCard, StatRow, Panel, Cols } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Who } from "../../components/ui/Who";
import { StatusTag } from "../../components/ui/Tag";
import { Icon } from "../../components/ui/Icon";
import { DataTable, Column } from "../../components/ui/DataTable";
import { KanbanBoard, KanbanColumnConfig } from "../../components/kanban/KanbanBoard";
import { LeadFunnel } from "../../components/ui/Funnel";
import { SourceBreakdown } from "../../components/ui/SourceBreakdown";
import { LeadForm } from "../../components/forms/LeadForm";
import { useLeads } from "../../lib/hooks/useLeads";
import { useOpportunities } from "../../lib/hooks/useOpportunities";
import { Lead, Opportunity, OpportunityStage, OPPORTUNITY_STEPS } from "../../lib/types/domain";
import { formatInr, formatRelative } from "../../lib/format";

const SNAPSHOT_COLUMNS: KanbanColumnConfig<OpportunityStage>[] = OPPORTUNITY_STEPS.map((stage) => ({
  key: stage,
  label: stage,
}));

export default function DashboardPage() {
  const router = useRouter();
  const { leads, createLead } = useLeads();
  const { opportunities, updateStage } = useOpportunities();
  const [showLeadForm, setShowLeadForm] = useState(false);

  const openOpportunities = useMemo(
    () => opportunities.filter((o) => o.stage !== "Won" && o.stage !== "Lost"),
    [opportunities]
  );
  const openPipelineValue = useMemo(
    () => openOpportunities.reduce((s, o) => s + o.expectedValue, 0),
    [openOpportunities]
  );
  const wonValue = useMemo(
    () => opportunities.filter((o) => o.stage === "Won").reduce((s, o) => s + o.expectedValue, 0),
    [opportunities]
  );
  const openLeadsCount = leads.filter((l) => l.status !== "Rejected").length;

  const recentColumns: Column<Lead>[] = [
    { key: "customerName", header: "Lead", render: (l) => <Who name={l.customerName} sub={l.companyName ?? l.sourceName} /> },
    { key: "sourceName", header: "Source", render: (l) => l.sourceName },
    { key: "status", header: "Status", render: (l) => <StatusTag status={l.status} /> },
    { key: "assignedToName", header: "Assigned To", render: (l) => l.assignedToName ?? "Unassigned" },
    { key: "score", header: "Score", render: (l) => <StatusTag status={l.score} /> },
  ];

  const recentLeads = [...leads]
    .sort((a, b) => (a.lastActivityAt < b.lastActivityAt ? 1 : -1))
    .slice(0, 5);

  function renderOppCard(o: Opportunity) {
    return (
      <>
        <div className="co">{o.customerName}</div>
        <div className="amt">{formatInr(o.expectedValue)}</div>
        <div className="ppl">
          <Icon name="user" size={14} /> {o.ownerName}
        </div>
        <div className="days">
          <span className="tag n" style={{ fontSize: 10.5, padding: "2px 8px" }}>{o.probability}% probability</span>
        </div>
      </>
    );
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="RevenueOS · Dashboard"
        title="Dashboard"
        subtitle="Your pipeline, today's activity and what needs attention across RevenueOS."
        cta={
          <Button variant="primary" icon="plus" onClick={() => setShowLeadForm(true)}>
            New Lead
          </Button>
        }
      />

      <StatRow>
        <StatCard label="Open Leads" value={String(openLeadsCount)} note="not yet rejected" />
        <StatCard label="Open Pipeline" value={formatInr(openPipelineValue)} note={`${openOpportunities.length} open opportunities`} />
        <StatCard label="Won Value" value={formatInr(wonValue)} note={`${opportunities.filter((o) => o.stage === "Won").length} deals`} />
        <StatCard label="Total Leads" value={String(leads.length)} note="in the system" />
      </StatRow>

      <Cols>
        <Panel title="Opportunity Pipeline" more={{ label: "Open opportunities", onClick: () => router.push("/opportunities") }}>
          <KanbanBoard
            columns={SNAPSHOT_COLUMNS}
            items={openOpportunities}
            getStage={(o) => o.stage}
            renderCard={renderOppCard}
            gridColumns={4}
            onMove={(id, stage) => updateStage(id, stage)}
            onCardClick={(id) => router.push(`/opportunities/${id}`)}
          />
        </Panel>
        <Panel title="Lead Qualification Funnel">
          <LeadFunnel leads={leads} />
        </Panel>
      </Cols>

      <div style={{ marginTop: 16 }}>
        <Panel title="Leads by Source">
          <SourceBreakdown leads={leads} />
        </Panel>
      </div>

      <div style={{ marginTop: 16 }}>
        <Panel title="Recent Leads" more={{ label: "View all", onClick: () => router.push("/leads") }} flush>
          <DataTable
            columns={recentColumns}
            rows={recentLeads}
            onRowClick={(l) => router.push(`/leads/${l.id}`)}
            emptyTitle="No leads yet"
            emptyBody="Create your first lead to see it here."
          />
        </Panel>
      </div>

      <DesignNote>
        <b>Design note.</b> The Opportunity Pipeline panel (not Leads) carries deal value and
        probability now — a Lead&apos;s own lifecycle ends at Qualified/Rejected, matching the backend&apos;s
        separate Lead/Opportunity models. Every count here recomputes live; nothing is hardcoded.
      </DesignNote>

      {showLeadForm && (
        <LeadForm onClose={() => setShowLeadForm(false)} onSubmit={createLead} />
      )}
    </div>
  );
}
