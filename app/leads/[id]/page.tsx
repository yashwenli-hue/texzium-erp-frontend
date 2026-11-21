"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Icon } from "../../../components/ui/Icon";
import { Panel } from "../../../components/ui/Card";
import { OpportunityStageTag, QuotationStatusTag, LeadStatusTag, LeadDeactivatedTag, LeadScoreTag, Tag } from "../../../components/ui/Tag";
import { SourceBadge } from "../../../components/ui/SourceBadge";
import { FollowupTag } from "../../../components/ui/FollowupTag";
import { QuickActions } from "../../../components/ui/QuickActions";
import { BackLink } from "../../../components/ui/BackLink";
import { DataTable, Column } from "../../../components/ui/DataTable";
import { Button } from "../../../components/ui/Button";
import { DesignNote } from "../../../components/ui/PageHeader";
import { DocumentTrail } from "../../../components/ui/DocumentTrail";
import { NoteForm } from "../../../components/forms/NoteForm";
import { NoteDetailModal } from "../../../components/forms/NoteDetailModal";
import { LeadActivityForm } from "../../../components/forms/LeadActivityForm";
import { LeadHistoryTimeline } from "../../../components/ui/LeadHistoryTimeline";
import { LeadDeactivationBanner } from "../../../components/ui/LeadDeactivationBanner";
import { DeactivateLeadDialog } from "../../../components/forms/DeactivateLeadDialog";
// Unassign remarks follow the same rule as stage-change remarks (the backend uses the same limit).
import {
  OPPORTUNITY_STAGE_REMARK_MAX_LENGTH as LEAD_UNASSIGN_REMARK_MAX_LENGTH,
  OPPORTUNITY_STAGE_REMARK_MAX_LENGTH as LEAD_REJECT_REASON_MAX_LENGTH,
} from "../../../lib/repository/shared/opportunityStage";
import { AssignLeadDialog } from "../../../components/forms/AssignLeadDialog";
import { EditLeadDialog } from "../../../components/forms/EditLeadDialog";
import { QualifyLeadDialog } from "../../../components/forms/QualifyLeadDialog";
import { LeadBantPanel } from "../../../components/leads/LeadBantPanel";
import { LeadQuotationsPanel } from "../../../components/leads/LeadQuotationsPanel";
import { FollowupForm } from "../../../components/forms/FollowupForm";
import { OpportunityForm } from "../../../components/forms/OpportunityForm";
import { ShareContentDialog } from "../../../components/content/ShareContentDialog";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { EmptyState } from "../../../components/ui/Button";
import { useLeadDetail, useLeadDuplicates } from "../../../lib/hooks/useLeads";
import { StatusMoveDialog } from "../../../components/forms/StatusMoveDialog";
import { LeadDuplicatesPanel } from "../../../components/ui/LeadDuplicatesPanel";
import { useNotesByRelated } from "../../../lib/hooks/useNotes";
import { useLeadFollowups } from "../../../lib/hooks/useLeadFollowups";
import { useQuotations } from "../../../lib/hooks/useQuotations";
import { useOpportunities } from "../../../lib/hooks/useOpportunities";
import { useRepository } from "../../../lib/repository/RepositoryProvider";
import { useAuth } from "../../../lib/auth/AuthContext";
import { useToast } from "../../../components/ui/Toast";
import { DeleteRecordDialog } from "../../../components/governance/DeleteRecordDialog";
import { DeletedRecordNotice } from "../../../components/governance/DeletedRecordNotice";
import { initials } from "../../../components/ui/Who";
import { formatInr, formatDate, formatDateTime } from "../../../lib/format";
import { nextPendingFollowup } from "../../../lib/followup";
import { formatLeadLocation, formatLeadLocationShort } from "../../../lib/geo/leadLocation";
import { canAssignLeadFrom, canQualifyLeadFrom, canRejectLeadFrom, isQualifiedLeadStatus, leadActionBlockedReason, leadActivityMeta, LeadActivityType, LeadFollowup, Quotation, Opportunity, Note, canReopenLeadFrom, canMoveLeadStatus, LEAD_STATUS_MOVE_TARGETS, CallOutcome, formatLeadStatus, LeadOpportunity } from "../../../lib/types/domain";

const SUMMARY_TYPES: LeadActivityType[] = ["CALL", "MEETING", "EMAIL", "WHATSAPP"];

const FOLLOWUP_STATUS_STYLE: Record<LeadFollowup["status"], { bg: string; fg: string }> = {
  PENDING: { bg: "var(--info-bg)", fg: "var(--info)" },
  COMPLETED: { bg: "var(--good-bg)", fg: "var(--good)" },
  CANCELLED: { bg: "var(--line-2)", fg: "var(--muted)" },
};

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const id = params?.id;
  const { lead, timeline, loading, error, refetch, refreshAll, logActivity, deactivateLead, reactivateLead, assignLead, unassignLead, qualifyLead, rejectLead, updateLead, moveStatus, reopenLead } = useLeadDetail(id);
  const { duplicates } = useLeadDuplicates(id);
  const [showStatusMove, setShowStatusMove] = useState(false);
  const [showReopen, setShowReopen] = useState(false);
  const [activityPreset, setActivityPreset] = useState<{ outcome?: CallOutcome } | null>(null);
  const { notes, refetch: refetchNotes } = useNotesByRelated(id);
  const { followups, createFollowup, completeFollowup, rescheduleFollowup, cancelFollowup, refetch: refetchFollowups } = useLeadFollowups(id);
  const { quotations } = useQuotations();
  const { opportunities, createOpportunity } = useOpportunities();
  const repo = useRepository();
  const { hasPermission } = useAuth();
  const isReal = repo.kind === "real";
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [showUnassign, setShowUnassign] = useState(false);
  const [showQualify, setShowQualify] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [showDeactivate, setShowDeactivate] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [reactivating, setReactivating] = useState(false);
  const [showConvert, setShowConvert] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [followupDialog, setFollowupDialog] = useState<{ mode: "create" | "reschedule"; target?: LeadFollowup } | null>(null);
  const [activeNote, setActiveNote] = useState<Note | null>(null);

  const relatedOpportunities = useMemo(
    () => opportunities.filter((o) => o.leadId === id),
    [opportunities, id]
  );
  const primaryOpportunity = relatedOpportunities[0];
  const nextFollowup = useMemo(() => nextPendingFollowup(followups), [followups]);

  // Employee activity counts by type, from the same history stream in connected and mock mode.
  const activityCounts = useMemo(() => {
    const counts: Record<string, number> = { CALL: 0, MEETING: 0, EMAIL: 0, WHATSAPP: 0 };
    for (const t of timeline) {
      if (t.source === "EMPLOYEE" && t.activityType && t.activityType in counts) counts[t.activityType] += 1;
    }
    return counts;
  }, [timeline]);

  if (loading && !lead) {
    return (
      <div className="page">
        <div className="skeleton" style={{ height: 220, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 300 }} />
      </div>
    );
  }

  // A fetch failure (403/network/5xx) is not the same as a genuine 404 — only
  // getById() resolving to null means the lead truly doesn't exist.
  if (error) {
    return (
      <div className="page">
        <BackLink fallback="/leads">Back to Leads</BackLink>
        <Panel title="Couldn't load this lead">
          <EmptyState
            icon="alert"
            title="Something went wrong"
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

  if (!lead) {
    return (
      <div className="page">
        <BackLink fallback="/leads">Back to Leads</BackLink>
        <DeletedRecordNotice entityType="LEAD" id={id ?? ""} onRestored={() => {
          refetch();
          refetchFollowups();
          refetchNotes();
        }} />
      </div>
    );
  }

  const opportunityIds = new Set(relatedOpportunities.map((o) => o.id));
  const relatedQuotes = quotations.filter((q) => q.opportunityId && opportunityIds.has(q.opportunityId));
  // The backend enforces which statuses each action may start from (409 otherwise);
  // these mirror it so the buttons and hints match (see canAssignLeadFrom & co.).
  const canAssign = canAssignLeadFrom(lead.status);
  const canQualify = canQualifyLeadFrom(lead.status);
  // The backend qualifies a lead only once its BANT analysis is complete (409 otherwise).
  const bantComplete = !!lead.bant?.completedAt;
  const canReject = canRejectLeadFrom(lead.status);
  // Only a pre-sales assignment that nothing has built on yet can be undone (the backend
  // refuses anything else with a 409).
  const canUnassign = lead.status === "PRE_SALES_ASSIGNED" && !!lead.assignedToId;
  // A deactivated lead takes no normal sales actions until it is reactivated.
  const inactive = !lead.isActive;
  const INACTIVE_HINT = "Reactivate this lead to make changes.";
  const actionHint = (action: "assign" | "qualify" | "reject", permission: string, noPermission: string) =>
    inactive ? INACTIVE_HINT : !hasPermission(permission) ? noPermission : leadActionBlockedReason(action, lead.status);
  const unassignHint = inactive
    ? INACTIVE_HINT
    : !hasPermission("leads.assign")
      ? "You don't have permission to assign leads"
      : !canUnassign
        ? "Only a lead that is assigned to pre-sales (Pre Sales Assigned) can be unassigned"
        : "Remove the assignee and return this lead to New";
  const pendingFollowupCount = followups.filter((f) => f.status === "PENDING").length;

  async function handleReactivate() {
    setReactivating(true);
    try {
      await reactivateLead();
      toast.success(`${lead!.customerName} reactivated`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reactivate this lead. Please try again.");
    } finally {
      setReactivating(false);
    }
  }

  const quoteColumns: Column<Quotation>[] = [
    { key: "quoteNo", header: "No.", render: (q) => q.quoteNo },
    { key: "amount", header: "Amount", render: (q) => formatInr(q.amount) },
    { key: "status", header: "Status", render: (q) => <QuotationStatusTag status={q.status} /> },
  ];

  const oppColumns: Column<Opportunity>[] = [
    { key: "title", header: "Opportunity", render: (o) => o.title },
    { key: "stage", header: "Stage", render: (o) => <OpportunityStageTag stage={o.stage} /> },
    { key: "expectedValue", header: "Value", render: (o) => formatInr(o.expectedValue) },
  ];

  // Without opportunities.view / quotations.view (Pre-Sales) the lead's own deals and a
  // price-free quotation list are shown instead: what happened, never the money.
  const canSeeOpportunities = hasPermission("opportunities.view");
  const canSeeQuotations = hasPermission("quotations.view");
  const leadDealColumns: Column<LeadOpportunity>[] = [
    { key: "title", header: "Opportunity", render: (o) => o.title },
    { key: "stage", header: "Stage", render: (o) => <OpportunityStageTag stage={o.stage} /> },
    { key: "createdAt", header: "Opened", render: (o) => <span className="cell-nowrap">{formatDate(o.createdAt)}</span> },
  ];

  // Real notes are the read-only text imported with the lead (e.g. a webhook's
  // requirement); employee remarks live in Activity & History. Mock keeps the
  // original cross-entity Note demo experience.
  const displayNotes = isReal
    ? (lead.notes ?? []).map((n) => ({ id: n.id, text: n.note, createdAt: n.createdAt, authorName: "", pinned: false }))
    : notes.map((n) => ({ id: n.id, text: n.text, createdAt: n.createdAt, authorName: n.authorName, pinned: n.pinned }));

  return (
    <div className="page">
      <BackLink fallback="/leads">Back to Leads</BackLink>
      <div className="crm-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {inactive && (
            <LeadDeactivationBanner
              deactivatedAt={lead.deactivatedAt}
              deactivatedByName={lead.deactivatedByName}
              reason={lead.deactivationReason}
              canReactivate={hasPermission("leads.deactivate")}
              busy={reactivating}
              onReactivate={handleReactivate}
            />
          )}
          <div className="card panel">
            <div className="profile-head">
              <div className="top">
                <div className="av-lg">{initials(lead.customerName)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <h3>{lead.customerName}</h3>
                    {hasPermission("leads.edit") && !inactive && (
                      <button className="iconlink" onClick={() => setShowEdit(true)} aria-label="Edit lead">
                        <Icon name="edit" size={14} /> Edit
                      </button>
                    )}
                  </div>
                  <div className="co">
                    {[lead.companyName, formatLeadLocationShort(lead)].filter(Boolean).join(" · ") || "No company on file"}
                  </div>
                </div>
              </div>
              <div className="tagrow">
                <LeadStatusTag status={lead.status} />
                {inactive && <LeadDeactivatedTag />}
                <SourceBadge source={lead.sourceName} size={18} />
                <Tag color="n">{lead.sourceName}</Tag>
                <Tag color="n">{lead.assignedToName ? `Assigned: ${lead.assignedToName}` : "Unassigned"}</Tag>
                {lead.score && <LeadScoreTag score={lead.score} suffix="lead" />}
              </div>
              <QuickActions
                phone={lead.phone}
                email={lead.email}
                contactName={lead.customerName}
                country={lead.country ?? null}
                share={
                  hasPermission("content.view") && hasPermission("content.share")
                    ? { onShare: () => setShowShare(true), unavailable: inactive ? "Reactivate this lead before sharing content with it." : undefined }
                    : undefined
                }
              />
              <div className="lead-action-row">
                <Button
                  variant="ghost"
                  icon="user"
                  onClick={() => setShowAssign(true)}
                  disabled={inactive || !hasPermission("leads.assign") || !canAssign}
                  title={actionHint("assign", "leads.assign", "You don't have permission to assign leads")}
                >
                  {lead.assignedToId ? "Reassign" : "Assign"}
                </Button>
                {lead.assignedToId && (
                  <Button
                    variant="ghost"
                    icon="user"
                    onClick={() => setShowUnassign(true)}
                    disabled={inactive || !hasPermission("leads.assign") || !canUnassign}
                    title={unassignHint}
                  >
                    Unassign
                  </Button>
                )}
                <Button
                  variant="ghost"
                  icon="check"
                  onClick={() => setShowQualify(true)}
                  disabled={inactive || !canQualify || !hasPermission("leads.qualify") || !bantComplete}
                  title={
                    canQualify && !inactive && hasPermission("leads.qualify") && !bantComplete
                      ? "Complete the BANT analysis below (Budget, Authority, Need, Timeline) to qualify this lead"
                      : actionHint("qualify", "leads.qualify", "You don't have permission to qualify leads")
                  }
                >
                  Qualify
                </Button>
                <Button
                  variant="ghost"
                  className="danger-ghost"
                  icon="close"
                  onClick={() => setShowReject(true)}
                  disabled={inactive || !canReject || !hasPermission("leads.reject")}
                  title={actionHint("reject", "leads.reject", "You don't have permission to reject leads")}
                >
                  Reject
                </Button>
                {canReopenLeadFrom(lead.status) && (
                  <Button
                    variant="ghost"
                    icon="restore"
                    onClick={() => setShowReopen(true)}
                    disabled={inactive || !hasPermission("leads.reopen")}
                    title={inactive ? INACTIVE_HINT : hasPermission("leads.reopen") ? "Take this rejected lead back to Contacted (the rejection stays in its history)" : "You don't have permission to reopen leads"}
                  >
                    Reopen
                  </Button>
                )}
                {LEAD_STATUS_MOVE_TARGETS.some((t) => canMoveLeadStatus(lead.status, t)) && (
                  <Button
                    variant="ghost"
                    icon="pulse"
                    onClick={() => setShowStatusMove(true)}
                    disabled={inactive || !hasPermission("leads.status.update")}
                    title={inactive ? INACTIVE_HINT : hasPermission("leads.status.update") ? "Mark New, Contacted or Underqualified" : "You don't have permission to update lead status"}
                  >
                    Update status
                  </Button>
                )}
                {hasPermission("leads.delete") && (
                  <Button
                    variant="ghost"
                    className="danger-ghost"
                    icon="trash"
                    onClick={() => setShowDelete(true)}
                    title="Move this lead to the Recycle Bin (only for a lead that was entered by mistake and has had no real work done on it)"
                  >
                    Delete
                  </Button>
                )}
                {!inactive && (
                  <Button
                    variant="ghost"
                    className="danger-ghost"
                    icon="alert"
                    onClick={() => setShowDeactivate(true)}
                    disabled={!hasPermission("leads.deactivate")}
                    title={hasPermission("leads.deactivate") ? "Take this lead out of active sales without deleting it" : "You don't have permission to deactivate leads"}
                  >
                    Deactivate
                  </Button>
                )}
              </div>
            </div>
            <div className="info-grid">
              <div className="f"><label>Phone</label><div>{lead.phone}</div></div>
              <div className="f" data-testid="lead-location">
                <label>Location</label>
                <div>{formatLeadLocation(lead) || <span style={{ color: "var(--text-2)" }}>Not set</span>}</div>
              </div>
              <div className="f"><label>Email</label><div style={{ wordBreak: "break-all" }}>{lead.email ?? "—"}</div></div>
              <div className="f" data-testid="lead-product">
                <label>Product / machine</label>
                <div>{lead.product?.name ?? lead.uiContext?.productInterest ?? <span style={{ color: "var(--text-2)" }}>Not recorded</span>}</div>
              </div>
              <div className="f">
                <label>Next Follow-up</label>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <FollowupTag urgency={nextFollowup.urgency} dueAt={nextFollowup.dueAt} />
                  {hasPermission("leads.followups.create") && !inactive && (
                    <button className="iconlink" style={{ fontSize: 11.5 }} onClick={() => setFollowupDialog({ mode: "create" })}>
                      <Icon name="plus" size={12} /> Schedule
                    </button>
                  )}
                </div>
              </div>
            </div>
            {lead.uiContext?.remarks && (
              <div style={{ padding: "0 19px 16px" }}>
                <div className="f">
                  <label>Remarks</label>
                  <div style={{ fontWeight: 400, color: "var(--text)" }}>{lead.uiContext.remarks}</div>
                </div>
              </div>
            )}
            <div style={{ padding: "0 19px 19px" }}>
              <DocumentTrail
                nodes={[
                  { key: "lead", label: lead.customerName, sublabel: "Lead", current: !primaryOpportunity },
                  ...(primaryOpportunity
                    ? [{
                        key: "opp",
                        label: primaryOpportunity.title,
                        sublabel: "Opportunity",
                        href: `/opportunities/${primaryOpportunity.id}`,
                        current: true,
                      }]
                    : []),
                ]}
              />
              {!primaryOpportunity && (
                <div style={{ marginTop: 10 }}>
                  {isQualifiedLeadStatus(lead.status) ? (
                    <Button
                      variant="primary"
                      icon="brief"
                      onClick={() => setShowConvert(true)}
                      disabled={inactive || !hasPermission("opportunities.create")}
                      title={inactive ? INACTIVE_HINT : hasPermission("opportunities.create") ? undefined : "You don't have permission to create opportunities"}
                    >
                      Convert to Opportunity
                    </Button>
                  ) : (
                    <p style={{ fontSize: 12.5, color: "var(--muted)" }}>
                      Qualify this lead to create an opportunity from it.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <LeadBantPanel
            leadId={lead.id}
            canEdit={!inactive && hasPermission("leads.edit")}
            readOnlyReason={inactive ? INACTIVE_HINT : "You don't have permission to edit this lead."}
            onSaved={refetch}
          />

          <Panel title="Follow-ups" flush>
            {followups.length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: 13, padding: "4px 0 12px" }}>No follow-ups scheduled yet.</p>
            ) : (
              <div className="tl">
                {followups.map((f) => (
                  <div className="tl-item" key={f.id}>
                    <div className="dot"><Icon name="cal" size={14} /></div>
                    <div className="body">
                      <div className="r1">
                        <b>{formatDateTime(f.followupDate)}</b>
                        <span
                          className="tag"
                          style={{ background: FOLLOWUP_STATUS_STYLE[f.status].bg, color: FOLLOWUP_STATUS_STYLE[f.status].fg }}
                        >
                          {f.status}
                        </span>
                      </div>
                      {f.remarks && <p>{f.remarks}</p>}
                      {f.status === "PENDING" && hasPermission("leads.followups.create") && (
                        <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
                          <a
                            className="more"
                            href="#"
                            onClick={async (e) => {
                              e.preventDefault();
                              try {
                                await completeFollowup(f.id);
                                toast.success("Follow-up completed");
                              } catch (err) {
                                toast.error(err instanceof Error ? err.message : "Could not complete this follow-up. Please try again.");
                              }
                            }}
                          >
                            <Icon name="check" size={13} /> Complete
                          </a>
                          <a className="more" href="#" onClick={(e) => { e.preventDefault(); setFollowupDialog({ mode: "reschedule", target: f }); }}>
                            <Icon name="clock" size={13} /> Reschedule
                          </a>
                          <a
                            className="more"
                            href="#"
                            onClick={async (e) => {
                              e.preventDefault();
                              try {
                                await cancelFollowup(f.id);
                                toast.success("Follow-up cancelled");
                              } catch (err) {
                                toast.error(err instanceof Error ? err.message : "Could not cancel this follow-up. Please try again.");
                              }
                            }}
                          >
                            <Icon name="close" size={13} /> Cancel
                          </a>
                        </div>
                      )}
                      {f.status === "COMPLETED" && f.completedByName && (
                        <p style={{ color: "var(--faint-text)", fontSize: 11.5 }}>Completed by {f.completedByName}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <LeadDuplicatesPanel
            result={duplicates}
            canResolve={hasPermission("leads.deactivate") || hasPermission("leads.delete")}
            routing={{
              leadStatus: lead.status,
              assignedToId: lead.assignedToId,
              canAssign: hasPermission("leads.assign") && !inactive,
              onAssign: async (personId, name) => {
                await assignLead(personId, name);
                toast.success(`Lead assigned to ${name}`);
              },
            }}
          />

          <Panel
            title="Activity & History"
            flush
            extraHead={
              hasPermission("leads.edit") && !inactive ? (
                <span className="panel-acts">
                  <button type="button" className="more" onClick={() => { setActivityPreset({ outcome: "NOT_CONNECTED" }); setShowActivityForm(true); }}>
                    <Icon name="phone" size={14} /> Log CNC
                  </button>
                  <button type="button" className="more" onClick={() => { setActivityPreset(null); setShowActivityForm(true); }}>
                    <Icon name="plus" size={14} /> Log Activity
                  </button>
                </span>
              ) : undefined
            }
          >
            <div className="activity-summary">
              {SUMMARY_TYPES.map((type) => {
                const meta = leadActivityMeta(type);
                return (
                  <div className="as-item" key={type}>
                    <Icon name={meta.icon} size={14} />
                    <b>{activityCounts[type]}</b>
                    <span>{meta.label}{activityCounts[type] === 1 ? "" : "s"}</span>
                  </div>
                );
              })}
            </div>
            <LeadHistoryTimeline entries={timeline} />
          </Panel>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Panel title="Related Opportunities" flush>
            {canSeeOpportunities ? (
              <DataTable
                columns={oppColumns}
                rows={relatedOpportunities}
                onRowClick={(o) => router.push(`/opportunities/${o.id}`)}
                emptyTitle="No opportunities yet"
                emptyBody="Qualify this lead, then convert it above."
              />
            ) : (
              <DataTable
                columns={leadDealColumns}
                rows={lead.opportunities ?? []}
                emptyTitle="No opportunities yet"
                emptyBody="Sales opens the deal once the lead is qualified."
              />
            )}
          </Panel>
          {canSeeQuotations ? (
            <Panel title="Related Quotations" flush>
              <DataTable
                columns={quoteColumns}
                rows={relatedQuotes}
                onRowClick={(q) => router.push(`/quotations/${q.id}`)}
                emptyTitle="No quotations yet"
                emptyBody="Create one from the Opportunity once it's ready."
              />
            </Panel>
          ) : (
            <LeadQuotationsPanel leadId={lead.id} />
          )}
          <Panel
            title="Notes"
            extraHead={
              isReal ? undefined : (
                <a className="more" href="#" onClick={(e) => { e.preventDefault(); setShowNoteForm(true); }}>
                  <Icon name="plus" size={14} /> Add
                </a>
              )
            }
          >
            <p style={{ color: "var(--faint-text)", fontSize: 11.5, marginBottom: 10 }}>
              {isReal
                ? "Text imported with this lead, for example the requirement from a connected lead source. Log your own calls, meetings and remarks under Activity & History."
                : "General context that stays useful across every call and meeting — not a record of a specific interaction. Log what happened on a call or email above instead."}
            </p>
            {displayNotes.length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: 13 }}>No notes yet for this lead.</p>
            ) : (
              <div className="notes-grid" style={{ gridTemplateColumns: "1fr" }}>
                {displayNotes.map((n) => (
                  <div
                    className={`note ${isReal ? "" : "clickable"} ${n.pinned ? "pinned" : ""}`}
                    key={n.id}
                    onClick={isReal ? undefined : () => setActiveNote(notes.find((x) => x.id === n.id) ?? null)}
                  >
                    {n.pinned && (
                      <div style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--m)", fontSize: 11, fontWeight: 700 }}>
                        <Icon name="pin" size={14} /> PINNED
                      </div>
                    )}
                    <div className="txt">{n.text}</div>
                    <div className="foot">
                      <small>{[n.authorName, formatDateTime(n.createdAt)].filter(Boolean).join(" · ")}</small>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>

      <DesignNote>
        <b>Design note.</b> Assign, Qualify and Reject are explicit gated actions — each mirrors a
        dedicated backend endpoint with its own permission. Follow-ups use the backend&apos;s own
        PENDING/COMPLETED/CANCELLED lifecycle, not local task data.
      </DesignNote>

      {showNoteForm && (
        <NoteForm
          onClose={() => { setShowNoteForm(false); refetchNotes(); }}
          onSubmit={(input) => repo.notes.create(input)}
          defaultLinkedType="Lead"
          defaultLinkedName={lead.customerName}
          defaultLinkedId={lead.id}
        />
      )}
      {activeNote && (
        <NoteDetailModal
          note={activeNote}
          onClose={() => { setActiveNote(null); refetchNotes(); }}
          onUpdate={(noteId, input) => repo.notes.update(noteId, input)}
        />
      )}
      {showActivityForm && (
        <LeadActivityForm
          customerName={lead.customerName}
          initialOutcome={activityPreset?.outcome}
          onClose={() => setShowActivityForm(false)}
          onSubmit={(input) => logActivity(input)}
        />
      )}
      {showAssign && (
        <AssignLeadDialog
          currentAssigneeId={lead.assignedToId}
          excludeUserId={lead.status === "PRE_SALES_ASSIGNED" ? lead.assignedToId : undefined}
          onClose={() => setShowAssign(false)}
          onSubmit={(assignedToId, assignedToName) => assignLead(assignedToId, assignedToName)}
        />
      )}
      {showUnassign && lead.assignedToId && (
        <ConfirmDialog
          title="Unassign Lead"
          body={`Remove ${lead.assignedToName ?? "the assignee"} from ${lead.customerName}? The lead goes back to New with no assignee. Its history is kept, and this change is added to it.`}
          confirmLabel="Unassign"
          noteLabel="Remark (optional)"
          onClose={() => setShowUnassign(false)}
          onConfirm={async (remark) => {
            if (remark && remark.length > LEAD_UNASSIGN_REMARK_MAX_LENGTH) {
              throw new Error(`The remark can be at most ${LEAD_UNASSIGN_REMARK_MAX_LENGTH} characters.`);
            }
            // The assignee shown here: if the lead was reassigned meanwhile, the backend refuses (409).
            await unassignLead(lead.assignedToId!, remark);
            toast.success(`${lead.customerName} unassigned`);
          }}
        />
      )}
      {showEdit && (
        <EditLeadDialog
          lead={lead}
          onClose={() => setShowEdit(false)}
          onSubmit={(input) => updateLead(input)}
        />
      )}
      {showQualify && (
        <QualifyLeadDialog
          customerName={lead.customerName}
          onClose={() => setShowQualify(false)}
          onSubmit={(salesUserId) => qualifyLead(salesUserId)}
        />
      )}
      {showReject && (
        <ConfirmDialog
          title="Reject Lead"
          body={`Reject ${lead.customerName}? This closes out the lead — it can no longer be qualified.`}
          confirmLabel="Reject Lead"
          destructive
          noteLabel="Reason"
          noteRequired
          onClose={() => setShowReject(false)}
          onConfirm={async (reason) => {
            if (reason && reason.length > LEAD_REJECT_REASON_MAX_LENGTH) {
              throw new Error(`The reason can be at most ${LEAD_REJECT_REASON_MAX_LENGTH} characters.`);
            }
            await rejectLead(reason!);
            toast.success(`${lead.customerName} rejected`);
          }}
        />
      )}
      {showStatusMove && (
        <StatusMoveDialog
          current={lead.status}
          customerName={lead.customerName}
          onClose={() => setShowStatusMove(false)}
          onSubmit={async (status, remark) => {
            await moveStatus(status, remark);
            toast.success(`${lead.customerName} marked ${formatLeadStatus(status)}`);
          }}
        />
      )}
      {showReopen && (
        <ConfirmDialog
          title="Reopen Lead"
          body={`Reopen ${lead.customerName}? It goes back to Contacted so it can be worked and qualified again. The rejection stays in its history.`}
          confirmLabel="Reopen Lead"
          noteLabel="Why it is being reopened"
          noteRequired
          onClose={() => setShowReopen(false)}
          onConfirm={async (reason) => {
            if (reason && reason.length > LEAD_REJECT_REASON_MAX_LENGTH) {
              throw new Error(`The reason can be at most ${LEAD_REJECT_REASON_MAX_LENGTH} characters.`);
            }
            await reopenLead(reason!);
            toast.success(`${lead.customerName} reopened`);
          }}
        />
      )}
      {showDelete && (
        <DeleteRecordDialog
          entityType="LEAD"
          id={lead.id}
          name={lead.customerName}
          onClose={() => setShowDelete(false)}
          onDeactivateInstead={
            inactive || !hasPermission("leads.deactivate")
              ? undefined
              : () => {
                  setShowDelete(false);
                  setShowDeactivate(true);
                }
          }
          onDeleted={(result) => {
            setShowDelete(false);
            toast.success(`Lead "${result.label}" moved to the Recycle Bin`);
            router.push("/leads");
          }}
        />
      )}
      {showDeactivate && (
        <DeactivateLeadDialog
          customerName={lead.customerName}
          opportunities={relatedOpportunities.length}
          pendingFollowups={pendingFollowupCount}
          onClose={() => setShowDeactivate(false)}
          onSubmit={(reason) => deactivateLead(reason)}
        />
      )}
      {showConvert && (
        <OpportunityForm
          defaultLeadId={lead.id}
          onClose={() => setShowConvert(false)}
          onSubmit={(input) => createOpportunity(input)}
        />
      )}
      {showShare && (
        <ShareContentDialog
          target={{ type: "LEAD", id: lead.id, name: lead.customerName, phone: lead.phone, country: lead.country ?? null }}
          onShared={refreshAll}
          onClose={() => setShowShare(false)}
        />
      )}
      {followupDialog && (
        <FollowupForm
          mode={followupDialog.mode}
          initialDate={followupDialog.target?.followupDate}
          onClose={() => setFollowupDialog(null)}
          onSubmit={(followupDate, remarks) =>
            followupDialog.mode === "create"
              ? createFollowup({ leadId: lead.id, followupDate, remarks })
              : rescheduleFollowup(followupDialog.target!.id, followupDate)
          }
        />
      )}
    </div>
  );
}
