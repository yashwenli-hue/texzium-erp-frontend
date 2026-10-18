"use client";

import { useRouter } from "next/navigation";
import { PageHeader, PageHelp } from "../../components/ui/PageHeader";
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
    const from = leads.find((l) => l.id === id)?.status;
    try {
      // The status the card showed: a board that is out of date is refused, not applied.
      await updateStatus(id, status, from ? { expectedStatus: from } : undefined);
      toast.success(`Moved to ${formatLeadStatus(status)}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not move this lead. Please try again.");
    }
  }

  const boardLeads = leads.filter((l) => LEAD_BOARD_STATUSES.includes(l.status));
  const newCount = leads.filter((l) => l.status === "NEW").length;
  const contactedCount = leads.filter((l) => l.status === "CONTACTED").length;
  const underqualifiedCount = leads.filter((l) => l.status === "UNDERQUALIFIED").length;
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
        subtitle="Pre-qualification board — move a lead between New, Contacted and Underqualified here; Qualify, Reject or Reopen from its detail page."
      />

      <StatRow>
        <StatCard label="New" value={String(newCount)} note="not yet contacted" />
        <StatCard label="Contacted" value={String(contactedCount)} note={`in progress · ${underqualifiedCount} underqualified`} />
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
            gridColumns={3}
            colorMap={LEAD_STATUS_STYLE}
            onMove={canUpdateStatus ? handleMove : undefined}
            onCardClick={(id) => router.push(`/leads/${id}`)}
          />
        </Panel>
      </div>

      <PageHelp title="Moving leads">
        Drag a card between New and Contacted. Qualifying or rejecting a lead needs a decision and a reason, so
        it is done on the lead&apos;s own page. A qualified lead continues as an opportunity.
      </PageHelp>
    </div>
  );
}
