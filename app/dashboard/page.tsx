"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, DesignNote } from "../../components/ui/PageHeader";
import { StatCard, StatRow, Panel, Cols } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Who } from "../../components/ui/Who";
import { StatusTag } from "../../components/ui/Tag";
import { DataTable, Column } from "../../components/ui/DataTable";
import { KanbanBoard } from "../../components/kanban/KanbanBoard";
import { LeadFunnel } from "../../components/ui/Funnel";
import { SourceBreakdown } from "../../components/ui/SourceBreakdown";
import { LeadForm } from "../../components/forms/LeadForm";
import { useLeads } from "../../lib/hooks/useLeads";
import { useOpportunities } from "../../lib/hooks/useOpportunities";
import { Lead, LeadStage } from "../../lib/types/domain";
import { formatInr } from "../../lib/format";

const SNAPSHOT_STAGES: { key: LeadStage; label: string }[] = [
  { key: "Qualified", label: "Qualified" },
  { key: "Proposal", label: "Proposal" },
  { key: "Negotiation", label: "Negotiation" },
  { key: "Won", label: "Won" },
];

export default function DashboardPage() {
  const router = useRouter();
  const { leads, loading, createLead, updateStage } = useLeads();
  const { opportunities } = useOpportunities();
  const [showLeadForm, setShowLeadForm] = useState(false);

  const openPipelineValue = useMemo(
    () => opportunities.filter((o) => o.stage !== "Won" && o.stage !== "Lost").reduce((s, o) => s + o.amount, 0),
    [opportunities]
  );
  const wonValue = useMemo(
    () => leads.filter((l) => l.stage === "Won").reduce((s, l) => s + l.value, 0),
    [leads]
  );

  const recentColumns: Column<Lead>[] = [
    { key: "name", header: "Lead", render: (l) => <Who name={l.name} sub={`${l.industry} · ${l.city}`} /> },
    { key: "source", header: "Source", render: (l) => l.source },
    { key: "stage", header: "Stage", render: (l) => <StatusTag status={l.stage} /> },
    { key: "ownerName", header: "Owner", render: (l) => l.ownerName },
    { key: "value", header: "Value", render: (l) => formatInr(l.value) },
    { key: "score", header: "Score", render: (l) => <StatusTag status={l.score} /> },
  ];

  const recentLeads = [...leads]
    .sort((a, b) => (a.lastActivityAt < b.lastActivityAt ? 1 : -1))
    .slice(0, 5);

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
        <StatCard label="Open Leads" value={String(leads.filter((l) => !["Won", "Lost"].includes(l.stage)).length)} note="active right now" />
        <StatCard label="Pipeline Value" value={formatInr(openPipelineValue)} note={`${opportunities.length} open deals`} />
        <StatCard label="Won Value" value={formatInr(wonValue)} note={`${leads.filter((l) => l.stage === "Won").length} deals`} />
        <StatCard label="Total Leads" value={String(leads.length)} note="in the system" />
      </StatRow>

      <Cols>
        <Panel title="Pipeline Snapshot" more={{ label: "Open pipeline", onClick: () => router.push("/pipeline") }}>
          <KanbanBoard
            stages={SNAPSHOT_STAGES}
            leads={leads}
            columns={4}
            onMove={(id, stage) => updateStage(id, stage)}
            onCardClick={(id) => router.push(`/leads/${id}`)}
          />
        </Panel>
        <Panel title="Lead Funnel">
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
        <b>Design note.</b> Dashboard opens on the pipeline and funnel because that&apos;s the sales team&apos;s
        daily read. Every row in Recent Leads is clickable straight into Lead Details, and stage/kanban
        counts recompute live from whatever leads currently exist — there are no hardcoded totals here.
      </DesignNote>

      {showLeadForm && (
        <LeadForm onClose={() => setShowLeadForm(false)} onSubmit={createLead} />
      )}
    </div>
  );
}
