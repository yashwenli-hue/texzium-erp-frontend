"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Icon } from "../../../components/ui/Icon";
import { Panel } from "../../../components/ui/Card";
import { OpportunityStageTag, QuotationStatusTag, LeadStatusTag, LeadDeactivatedTag, Tag } from "../../../components/ui/Tag";
import { SourceBadge } from "../../../components/ui/SourceBadge";
import { FollowupTag } from "../../../components/ui/FollowupTag";
import { QuickActions } from "../../../components/ui/QuickActions";
import { BackLink } from "../../../components/ui/BackLink";
import Link from "next/link";
import { DocumentActions, DocumentAction } from "../../../components/ui/DocumentActions";
import { ActionMenu } from "../../../components/ui/ActionMenu";
import { NextUp } from "../../../components/ui/NextUp";
import { RecordJourney } from "../../../components/ui/RecordJourney";
import { RecordPager } from "../../../components/ui/RecordPager";
import { Button } from "../../../components/ui/Button";

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
import { FollowupForm } from "../../../components/forms/FollowupForm";
import { FollowupActions } from "../../../components/followups/FollowupActions";
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
import { formatInr, formatDate, formatDateTime, formatRelative } from "../../../lib/format";
import { LeadActionKey, lastCallOf, leadActionStates, leadAttention, leadJourney, leadPermissions, pendingFollowups } from "../../../lib/repository/shared/leadWorkspace";
import { nextPendingFollowup } from "../../../lib/followup";
import { formatLeadLocation, formatLeadLocationShort } from "../../../lib/geo/leadLocation";
import { isQualifiedLeadStatus, leadActivityMeta, LeadActivityType, LeadFollowup, Note, CallOutcome, formatLeadStatus } from "../../../lib/types/domain";

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
  // A refusal (403) is not a failure to retry: say what access it needs.
  const forbidden = (error as { status?: number } | null)?.status === 403;
  if (error) {
    return (
      <div className="page">
        <BackLink fallback="/leads">Back to Leads</BackLink>
        <Panel title={forbidden ? "No access" : "Couldn't load this lead"}>
          <EmptyState
            icon={forbidden ? "lock" : "alert"}
            title={forbidden ? "You don't have access to this lead" : "Something went wrong"}
            body={forbidden ? "Viewing it needs the leads.view permission. Ask an administrator, then sign in again." : error.message || "Something went wrong reaching the RevenueOS backend. Please try again."}
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
  // Which actions apply to this status, and who may use them, is worked out in leadWorkspace.ts
  // (mirroring the backend's rules, which still decide). A deactivated lead takes no sales actions.
  const inactive = !lead.isActive;
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



  // Real notes are the read-only text imported with the lead (e.g. a webhook's
  // requirement); employee remarks live in Activity & History. Mock keeps the
  // original cross-entity Note demo experience.
  const displayNotes = isReal
    ? (lead.notes ?? []).map((n) => ({ id: n.id, text: n.note, createdAt: n.createdAt, authorName: "", pinned: false }))
    : notes.map((n) => ({ id: n.id, text: n.text, createdAt: n.createdAt, authorName: n.authorName, pinned: n.pinned }));

  const may = leadPermissions(hasPermission);
  const states = leadActionStates({ lead, may });
  const attention = leadAttention({
    lead,
    followups,
    timeline,
    opportunities: relatedOpportunities,
    potentialDuplicates: duplicates.summary.potentialDuplicates,
    may,
    now: new Date(),
  });
  const journey = leadJourney(lead, primaryOpportunity, relatedQuotes.length);
  const lastCall = lastCallOf(timeline);
  const pending = pendingFollowups(followups);
  const owner = lead.assignedToName
    ? `${lead.assignedToName}${lead.status === "PRE_SALES_ASSIGNED" ? " (pre-sales)" : isQualifiedLeadStatus(lead.status) ? " (sales)" : ""}`
    : "Nobody yet";

  // Every button and every "Next up" suggestion runs one of the existing dialogs; nothing changes the lead directly.
  function run(key: LeadActionKey) {
    switch (key) {
      // No outcome chosen in advance: the person records what happened.
      case "logCall": setActivityPreset(null); setShowActivityForm(true); break;
      case "logCnc": setActivityPreset({ outcome: "NOT_CONNECTED" }); setShowActivityForm(true); break;
      case "logActivity": setActivityPreset(null); setShowActivityForm(true); break;
      case "followup": setFollowupDialog({ mode: "create" }); break;
      case "assign": setShowAssign(true); break;
      case "unassign": setShowUnassign(true); break;
      case "qualify": setShowQualify(true); break;
      case "reject": setShowReject(true); break;
      case "reopen": setShowReopen(true); break;
      case "status": setShowStatusMove(true); break;
      case "convert": setShowConvert(true); break;
      case "edit": setShowEdit(true); break;
      case "share": setShowShare(true); break;
      case "reactivate": void handleReactivate(); break;
      case "deactivate": setShowDeactivate(true); break;
      case "delete": setShowDelete(true); break;
    }
  }
  const asAction = (key: LeadActionKey, variant?: "primary"): DocumentAction => {
    const s = states[key];
    return { key, label: key === "reactivate" && reactivating ? "Reactivating…" : s.label, icon: s.icon, variant, className: s.tone === "danger" ? "danger-ghost" : undefined, state: { enabled: s.enabled && !(key === "reactivate" && reactivating), reason: s.reason }, onClick: () => run(key) };
  };
  // Working the lead (calls, follow-ups) first; then the lifecycle decisions that apply to its status.
  const workActions = (["logCall", "logCnc", "followup"] as LeadActionKey[]).map((k) => asAction(k));
  const lifecycleKeys = (["convert", "assign", "qualify", "status", "reopen", "reject"] as LeadActionKey[]).filter((k) => states[k].available && !(k === "convert" && primaryOpportunity));
  const lifecycleActions = lifecycleKeys.map((k) => asAction(k, k === "convert" ? "primary" : undefined));
  const menuItems = (["edit", "unassign", "reactivate", "deactivate", "delete"] as LeadActionKey[])
    .filter((k) => states[k].available)
    .map((k) => ({ key: k, label: states[k].label, icon: states[k].icon, tone: states[k].tone, state: { enabled: states[k].enabled, reason: states[k].reason }, onClick: () => run(k) }));

  return (
    <div className="page lead-ws">
      <div className="ws-top">
        <BackLink fallback="/leads">Back to Leads</BackLink>
        <RecordPager kind="lead" id={lead.id} hrefOf={(x) => `/leads/${x}`} />
      </div>

      {inactive && (
        <LeadDeactivationBanner
          deactivatedAt={lead.deactivatedAt}
          deactivatedByName={lead.deactivatedByName}
          reason={lead.deactivationReason}
          canReactivate={may.deactivate}
          busy={reactivating}
          onReactivate={handleReactivate}
        />
      )}

      <header className="card ws-head">
        <div className="ws-id">
          <div className="av-lg" aria-hidden="true">{initials(lead.customerName)}</div>
          <div className="ws-title">
            <p className="ws-kind">Lead</p>
            <h1>{lead.customerName}</h1>
            <p className="co">{[lead.companyName, formatLeadLocationShort(lead)].filter(Boolean).join(" · ") || "No company on file"}</p>
            <div className="tagrow">
              <LeadStatusTag status={lead.status} />
              {inactive && <LeadDeactivatedTag />}
              <SourceBadge source={lead.sourceName} size={18} />
              <Tag color="n">{lead.sourceName}</Tag>
              {lead.product && <Tag color="n">{lead.product.name}</Tag>}
            </div>
          </div>
          {menuItems.length > 0 && <ActionMenu items={menuItems} label={`More actions for ${lead.customerName}`} />}
        </div>
        <dl className="ws-facts">
          <div><dt>Held by</dt><dd>{owner}</dd></div>
          <div><dt>Received</dt><dd>{formatDate(lead.createdAt)} <small>({formatRelative(lead.createdAt)})</small></dd></div>
          <div>
            <dt>Last call</dt>
            <dd>{lastCall ? <>{lastCall.outcome === "NOT_CONNECTED" ? "Not connected" : lastCall.outcome === "CONNECTED" ? "Connected" : "Logged"} <small>{formatRelative(lastCall.at)}{lastCall.actorName ? ` · ${lastCall.actorName}` : ""}</small></> : "None logged"}</dd>
          </div>
          <div><dt>Next follow-up</dt><dd><FollowupTag urgency={nextFollowup.urgency} dueAt={nextFollowup.dueAt} /></dd></div>
        </dl>
        <QuickActions
          phone={lead.phone}
          email={lead.email}
          contactName={lead.customerName}
          country={lead.country ?? null}
          share={may.share ? { onShare: () => setShowShare(true), unavailable: inactive ? "Reactivate this lead before sharing content with it." : undefined } : undefined}
        />
        <div className="ws-actions">
          <DocumentActions actions={workActions} testId="lead-work-actions" />
          {lifecycleActions.length > 0 && <DocumentActions actions={lifecycleActions} testId="lead-lifecycle-actions" />}
        </div>
        <div className="ws-journey">
          <RecordJourney steps={journey} />
        </div>
      </header>

      <NextUp items={attention} onAction={(a) => run(a.type)} />

      <div className="ws-grid">
        <div className="ws-main">
          <Panel
            title={`Follow-ups${pending.length ? ` · ${pending.length} pending` : ""}`}
            flush
            extraHead={
              states.followup.enabled ? (
                <span className="panel-acts">
                  <button type="button" className="more" onClick={() => run("followup")}>
                    <Icon name="plus" size={14} /> Schedule
                  </button>
                </span>
              ) : undefined
            }
          >
            {followups.length === 0 ? (
              <p className="ws-empty">No follow-ups yet.{states.followup.enabled ? " Schedule one so the next contact isn't forgotten." : ""}</p>
            ) : (
              <ul className="tl ws-fu">
                {[...pending, ...followups.filter((f) => f.status !== "PENDING")].map((f) => (
                  <li className="tl-item" key={f.id}>
                    <div className="dot" aria-hidden="true"><Icon name="cal" size={14} /></div>
                    <div className="body">
                      <div className="r1">
                        <b>{formatDateTime(f.followupDate)}</b>
                        <span className="tag" style={{ background: FOLLOWUP_STATUS_STYLE[f.status].bg, color: FOLLOWUP_STATUS_STYLE[f.status].fg }}>
                          {formatLeadStatus(f.status)}
                        </span>
                      </div>
                      {f.remarks && <p>{f.remarks}</p>}
                      {f.status === "PENDING" && may.followupCreate && !inactive && (
                        <FollowupActions followup={f} onComplete={completeFollowup} onReschedule={rescheduleFollowup} onCancel={cancelFollowup} compact />
                      )}
                      {f.status === "COMPLETED" && f.completedByName && <p className="ws-sub">Completed by {f.completedByName}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel
            title="Calls, meetings & history"
            flush
            extraHead={
              states.logCall.enabled ? (
                <span className="panel-acts">
                  <button type="button" className="more" onClick={() => run("logCnc")}>
                    <Icon name="phone" size={14} /> Log CNC
                  </button>
                  <button type="button" className="more" onClick={() => run("logCall")}>
                    <Icon name="plus" size={14} /> Log call or meeting
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

        <aside className="ws-side" aria-label="Lead details and related records">
          <Panel title="Deal" flush>
            {relatedOpportunities.length === 0 ? (
              <p className="ws-empty">
                {isQualifiedLeadStatus(lead.status)
                  ? "Qualified. Create the opportunity to track value, probability and quotations."
                  : "An opportunity is created once the lead is qualified."}
              </p>
            ) : (
              <ul className="ws-links">
                {relatedOpportunities.map((o) => (
                  <li key={o.id}>
                    <Link href={`/opportunities/${o.id}`} className="ws-link">
                      <span className="wl-main"><b>{o.title}</b><small>Opportunity · {formatInr(o.expectedValue)} · {o.probability}%</small></span>
                      <OpportunityStageTag stage={o.stage} />
                    </Link>
                  </li>
                ))}
                {relatedQuotes.map((q) => (
                  <li key={q.id}>
                    <Link href={`/quotations/${q.id}`} className="ws-link">
                      <span className="wl-main"><b>{q.quoteNo}</b><small>Quotation · {formatInr(q.amount)}</small></span>
                      <QuotationStatusTag status={q.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Contact & details" extraHead={states.edit.available && states.edit.enabled ? <span className="panel-acts"><button type="button" className="more" onClick={() => run("edit")}><Icon name="edit" size={14} /> Edit</button></span> : undefined}>
            <dl className="ws-details">
              <div><dt>Phone</dt><dd>{lead.phone}</dd></div>
              <div><dt>Email</dt><dd className="ws-break">{lead.email ?? "—"}</dd></div>
              <div data-testid="lead-location"><dt>Location</dt><dd>{formatLeadLocation(lead) || "Not set"}</dd></div>
              <div data-testid="lead-product"><dt>Product / machine</dt><dd>{lead.product?.name ?? lead.uiContext?.productInterest ?? "Not recorded"}</dd></div>
              {lead.uiContext?.remarks && <div><dt>Remarks</dt><dd>{lead.uiContext.remarks}</dd></div>}
            </dl>
            {displayNotes.length > 0 && (
              <div className="ws-notes">
                <h4>{isReal ? "Imported with the lead" : "Notes"}</h4>
                {displayNotes.map((n) => (
                  <div key={n.id} className="ws-note">
                    <p>{n.text}</p>
                    <small>{[n.authorName, formatDateTime(n.createdAt)].filter(Boolean).join(" · ")}</small>
                  </div>
                ))}
              </div>
            )}
            {!isReal && (
              <button type="button" className="more" onClick={() => setShowNoteForm(true)}>
                <Icon name="plus" size={14} /> Add note
              </button>
            )}
          </Panel>

          <div id="duplicates" tabIndex={-1}>
            <LeadDuplicatesPanel
              result={duplicates}
              canResolve={hasPermission("leads.deactivate") || hasPermission("leads.delete")}
              routing={{
                leadStatus: lead.status,
                assignedToId: lead.assignedToId,
                canAssign: may.assign && !inactive,
                onAssign: async (personId, name) => {
                  await assignLead(personId, name);
                  toast.success(`Lead assigned to ${name}`);
                },
              }}
            />
          </div>
        </aside>
      </div>

      {/* On a phone the two things done most — call and log it — stay in reach at the bottom. */}
      <div className="ws-mobilebar" aria-label="Quick actions">
        <a className="btn ghost" href={`tel:${lead.phone.replace(/[^\d+]/g, "")}`}>
          <Icon name="phone" size={16} /> Call
        </a>
        <Button variant="primary" icon="plus" onClick={() => run("logCall")} disabled={!states.logCall.enabled}>
          Log call
        </Button>
      </div>
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
