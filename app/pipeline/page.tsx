"use client";

import { useRouter } from "next/navigation";
import { PageHeader, DesignNote } from "../../components/ui/PageHeader";
import { StatCard, StatRow, Panel } from "../../components/ui/Card";
import { KanbanBoard } from "../../components/kanban/KanbanBoard";
import { useLeads } from "../../lib/hooks/useLeads";
import { LeadStage } from "../../lib/types/domain";
import { formatInr } from "../../lib/format";

const PIPELINE_STAGES: { key: LeadStage; label: string }[] = [
  { key: "New", label: "New" },
  { key: "Contacted", label: "Contacted" },
  { key: "Qualified", label: "Qualified" },
  { key: "Proposal", label: "Proposal" },
  { key: "Negotiation", label: "Negotiation" },
  { key: "Won", label: "Won" },
];

export default function PipelinePage() {
  const router = useRouter();
  const { leads, updateStage } = useLeads();

  const openLeads = leads.filter((l) => l.stage !== "Lost");
  const totalOpenValue = openLeads
    .filter((l) => l.stage !== "Won")
    .reduce((s, l) => s + l.value, 0);
  const avgDeal = openLeads.length ? Math.round(openLeads.reduce((s, l) => s + l.value, 0) / openLeads.length) : 0;
  const wonCount = leads.filter((l) => l.stage === "Won").length;
  const winRate = leads.length ? Math.round((wonCount / leads.length) * 100) : 0;

  return (
    <div className="page">
      <PageHeader
        eyebrow="RevenueOS · Lead Pipeline"
        title="Lead Pipeline"
        subtitle="Visual, stage-by-stage view of every open deal in motion."
      />

      <StatRow>
        <StatCard label="Open Pipeline" value={formatInr(totalOpenValue)} note={`${openLeads.length} active deals`} />
        <StatCard label="Avg Deal Size" value={formatInr(avgDeal)} note="across all stages" />
        <StatCard label="Win Rate" value={`${winRate}%`} note="of all leads" />
        <StatCard label="Total Leads" value={String(leads.length)} note="in the system" />
      </StatRow>

      <div style={{ marginTop: 16 }}>
        <Panel title="Pipeline Board">
          <KanbanBoard
            stages={PIPELINE_STAGES}
            leads={openLeads}
            onMove={(id, stage) => updateStage(id, stage)}
            onCardClick={(id) => router.push(`/leads/${id}`)}
          />
        </Panel>
      </div>

      <DesignNote>
        <b>Design note.</b> Drag any card to a different column to change its stage — the board and
        every count updates immediately. On a touch device without drag support, use the &quot;Move
        to…&quot; selector at the bottom of each card instead; it performs the same stage change.
      </DesignNote>
    </div>
  );
}
