"use client";

import { useRouter } from "next/navigation";
import { PageHeader, DesignNote } from "../../components/ui/PageHeader";
import { StatCard, StatRow, Panel } from "../../components/ui/Card";
import { KanbanBoard, KanbanColumnConfig } from "../../components/kanban/KanbanBoard";
import { Icon } from "../../components/ui/Icon";
import { LEAD_STATUS_STYLE } from "../../components/ui/Tag";
import { useToast } from "../../components/ui/Toast";
import { useLeads } from "../../lib/hooks/useLeads";
import { useAuth } from "../../lib/auth/AuthContext";
import { Lead, LeadStatus, LEAD_BOARD_STATUSES, formatLeadStatus, isQualifiedLeadStatus } from "../../lib/types/domain";
import { formatRelative } from "../../lib/format";

const BOARD_COLUMNS: KanbanColumnConfig<LeadStatus>[] = LEAD_BOARD_STATUSES.map((status) => ({
  key: status,
  label: formatLeadStatus(status),
}));

export default function PipelinePage() {
  const router = useRouter();
  const toast = useToast();
  const { hasPermission } = useAuth();
  const { leads, updateStatus } = useLeads();
  const canUpdateStatus = hasPermission("leads.status.update");

  async function handleMove(id: string, status: LeadStatus) {
    try {
      await updateStatus(id, status);
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Could not move this lead. Please try again.", "alert");
    }
  }

  const boardLeads = leads.filter((l) => LEAD_BOARD_STATUSES.includes(l.status));
  const newCount = leads.filter((l) => l.status === "NEW").length;
  const contactedCount = leads.filter((l) => l.status === "CONTACTED").length;
  const qualifiedCount = leads.filter((l) => isQualifiedLeadStatus(l.status)).length;
  const rejectedCount = leads.filter((l) => l.status === "REJECTED").length;
  const qualificationRate = leads.length ? Math.round((qualifiedCount / leads.length) * 100) : 0;

  function renderCard(lead: Lead) {
    return (
      <>
        <div className="co">{lead.customerName}</div>
        <div className="amt" style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>{lead.sourceName}</div>
        <div className="ppl">
          <Icon name="user" size={14} /> {lead.assignedToName ?? "Unassigned"}
        </div>
        <div className="days">
          <span className="tag n" style={{ fontSize: 10.5, padding: "2px 8px" }}>
            {formatRelative(lead.lastActivityAt)}
          </span>
        </div>
      </>
    );
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="RevenueOS · Pipeline · Lead Pipeline"
        title="Lead Pipeline"
        subtitle="Pre-qualification board — move a lead from New to Contacted here; Qualify or Reject from its detail page."
      />

      <StatRow>
        <StatCard label="New" value={String(newCount)} note="not yet contacted" />
        <StatCard label="Contacted" value={String(contactedCount)} note="in progress" />
        <StatCard label="Qualification Rate" value={`${qualificationRate}%`} note={`${qualifiedCount} of ${leads.length} leads`} />
        <StatCard label="Rejected" value={String(rejectedCount)} note="did not qualify" />
      </StatRow>

      <div style={{ marginTop: 16 }}>
        <Panel title="Pre-Qualification Board">
          {!canUpdateStatus && (
            <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "-4px 0 14px" }}>
              You don&apos;t have permission to update lead status, so cards on this board can&apos;t be moved.
            </p>
          )}
          <KanbanBoard
            columns={BOARD_COLUMNS}
            items={boardLeads}
            getStage={(l) => l.status}
            renderCard={renderCard}
            gridColumns={2}
            colorMap={LEAD_STATUS_STYLE}
            onMove={canUpdateStatus ? handleMove : undefined}
            onCardClick={(id) => router.push(`/leads/${id}`)}
          />
        </Panel>
      </div>

      <DesignNote>
        <b>Design note.</b> Only New and Contacted are drag targets here — Qualify and Reject are
        permission-gated backend actions, so they live as explicit confirmations on the lead&apos;s
        detail page rather than a casual drag on this board. Qualified leads move straight to the
        Opportunities pipeline.
      </DesignNote>
    </div>
  );
}
