"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Icon } from "../../../components/ui/Icon";
import { Panel } from "../../../components/ui/Card";
import { StatusTag, LeadStatusTag, LeadScoreTag, Tag } from "../../../components/ui/Tag";
import { SourceBadge } from "../../../components/ui/SourceBadge";
import { FollowupTag } from "../../../components/ui/FollowupTag";
import { QuickActions } from "../../../components/ui/QuickActions";
import { DataTable, Column } from "../../../components/ui/DataTable";
import { Button } from "../../../components/ui/Button";
import { DesignNote } from "../../../components/ui/PageHeader";
import { DocumentTrail } from "../../../components/ui/DocumentTrail";
import { NoteForm } from "../../../components/forms/NoteForm";
import { NoteDetailModal } from "../../../components/forms/NoteDetailModal";
import { ActivityForm } from "../../../components/forms/ActivityForm";
import { AssignLeadDialog } from "../../../components/forms/AssignLeadDialog";
import { EditLeadDialog } from "../../../components/forms/EditLeadDialog";
import { QualifyLeadDialog } from "../../../components/forms/QualifyLeadDialog";
import { FollowupForm } from "../../../components/forms/FollowupForm";
import { OpportunityForm } from "../../../components/forms/OpportunityForm";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { EmptyState } from "../../../components/ui/Button";
import { useLeadDetail } from "../../../lib/hooks/useLeads";
import { useNotesByRelated } from "../../../lib/hooks/useNotes";
import { useLeadFollowups } from "../../../lib/hooks/useLeadFollowups";
import { useQuotations } from "../../../lib/hooks/useQuotations";
import { useOpportunities } from "../../../lib/hooks/useOpportunities";
import { useRepository } from "../../../lib/repository/RepositoryProvider";
import { useAuth } from "../../../lib/auth/AuthContext";
import { useToast } from "../../../components/ui/Toast";
import { initials } from "../../../components/ui/Who";
import { formatInr, formatDateTime } from "../../../lib/format";
import { nextPendingFollowup } from "../../../lib/followup";
import { isQualifiedLeadStatus, LeadFollowup, Quotation, Opportunity, Note } from "../../../lib/types/domain";

const ACTIVITY_TYPES = ["Call", "Email", "Meeting", "WhatsApp"] as const;
const ACTIVITY_ICONS: Record<string, string> = { Call: "phone", Email: "mail", Meeting: "cal", WhatsApp: "wa" };

function goBackOrTo(router: ReturnType<typeof useRouter>, fallback: string) {
  if (typeof window !== "undefined" && window.history.length > 1) {
    router.back();
  } else {
    router.push(fallback);
  }
}

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
  const { lead, timeline, loading, error, refetch, appendActivity, assignLead, qualifyLead, rejectLead, updateLead } = useLeadDetail(id);
  const { notes, refetch: refetchNotes } = useNotesByRelated(id);
  const { followups, createFollowup, completeFollowup, rescheduleFollowup, cancelFollowup } = useLeadFollowups(id);
  const { quotations } = useQuotations();
  const { opportunities, createOpportunity } = useOpportunities();
  const repo = useRepository();
  const { hasPermission } = useAuth();
  const isReal = repo.kind === "real";
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [showQualify, setShowQualify] = useState(false);
  const [showReject, setShowReject] = useState(false);
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

  // Mock-only prioritization surface — see the Activity & History panel below.
  // Real timeline action codes never start with these prefixes, so this is
  // always 0 for a real lead; the panel itself is gated on !isReal anyway.
  const activityCounts = useMemo(() => {
    const counts: Record<string, number> = { Call: 0, Email: 0, Meeting: 0, WhatsApp: 0 };
    for (const t of timeline) {
      for (const type of ACTIVITY_TYPES) {
        if (t.title.startsWith(`${type}:`)) counts[type] += 1;
      }
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
        <a className="back-link" onClick={() => goBackOrTo(router, "/leads")}>
          <Icon name="back" size={14} /> Back to Leads
        </a>
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
        <a className="back-link" onClick={() => goBackOrTo(router, "/leads")}>
          <Icon name="back" size={14} /> Back to Leads
        </a>
        <Panel title="Lead not found">
          <p style={{ color: "var(--muted)", fontSize: 13.5 }}>
            This lead may have been removed, or the link is out of date.
          </p>
        </Panel>
      </div>
    );
  }

  const opportunityIds = new Set(relatedOpportunities.map((o) => o.id));
  const relatedQuotes = quotations.filter((q) => q.opportunityId && opportunityIds.has(q.opportunityId));
  const canQualify = !isQualifiedLeadStatus(lead.status) && lead.status !== "REJECTED";
  const canReject = lead.status !== "REJECTED";

  const quoteColumns: Column<Quotation>[] = [
    { key: "quoteNo", header: "No.", render: (q) => q.quoteNo },
    { key: "amount", header: "Amount", render: (q) => `${formatInr(q.amount)} · V${q.version}` },
    { key: "status", header: "Status", render: (q) => <StatusTag status={q.status} /> },
  ];

  const oppColumns: Column<Opportunity>[] = [
    { key: "title", header: "Opportunity", render: (o) => o.title },
    { key: "stage", header: "Stage", render: (o) => <StatusTag status={o.stage} /> },
    { key: "expectedValue", header: "Value", render: (o) => formatInr(o.expectedValue) },
  ];

  // Real notes are read-only (no create endpoint exists — docs/backend-ui-contract.md
  // §20); mock keeps the original cross-entity Note demo experience.
  const displayNotes = isReal
    ? (lead.notes ?? []).map((n) => ({ id: n.id, text: n.note, createdAt: n.createdAt, authorName: "", pinned: false }))
    : notes.map((n) => ({ id: n.id, text: n.text, createdAt: n.createdAt, authorName: n.authorName, pinned: n.pinned }));

  return (
    <div className="page">
      <a className="back-link" onClick={() => goBackOrTo(router, "/leads")}>
        <Icon name="back" size={14} /> Back to Leads
      </a>
      <div className="crm-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card panel">
            <div className="profile-head">
              <div className="top">
                <div className="av-lg">{initials(lead.customerName)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <h3>{lead.customerName}</h3>
                    {hasPermission("leads.edit") && (
                      <button className="iconlink" onClick={() => setShowEdit(true)} aria-label="Edit lead">
                        <Icon name="edit" size={14} /> Edit
                      </button>
                    )}
                  </div>
                  <div className="co">
                    {[lead.companyName, lead.uiContext?.city].filter(Boolean).join(" · ") || "No company on file"}
                  </div>
                </div>
              </div>
              <div className="tagrow">
                <LeadStatusTag status={lead.status} />
                <SourceBadge source={lead.sourceName} size={18} />
                <Tag color="n">{lead.sourceName}</Tag>
                <Tag color="n">{lead.assignedToName ? `Assigned: ${lead.assignedToName}` : "Unassigned"}</Tag>
                {lead.score && <LeadScoreTag score={lead.score} suffix="lead" />}
              </div>
              <QuickActions phone={lead.phone} email={lead.email} contactName={lead.customerName} />
              <div className="lead-action-row">
                <Button
                  variant="ghost"
                  icon="user"
                  onClick={() => setShowAssign(true)}
                  disabled={!hasPermission("leads.assign")}
                  title={hasPermission("leads.assign") ? undefined : "You don't have permission to assign leads"}
                >
                  {lead.assignedToId ? "Reassign" : "Assign"}
                </Button>
                <Button
                  variant="ghost"
                  icon="check"
                  onClick={() => setShowQualify(true)}
                  disabled={!canQualify || !hasPermission("leads.qualify")}
                  title={hasPermission("leads.qualify") ? undefined : "You don't have permission to qualify leads"}
                >
                  Qualify
                </Button>
                <Button
                  variant="ghost"
                  className="danger-ghost"
                  icon="close"
                  onClick={() => setShowReject(true)}
                  disabled={!canReject || !hasPermission("leads.reject")}
                  title={hasPermission("leads.reject") ? undefined : "You don't have permission to reject leads"}
                >
                  Reject
                </Button>
              </div>
            </div>
            <div className="info-grid">
              <div className="f"><label>Phone</label><div>{lead.phone}</div></div>
              <div className="f"><label>Email</label><div style={{ wordBreak: "break-all" }}>{lead.email ?? "—"}</div></div>
              <div className="f"><label>Product / Interest</label><div>{lead.uiContext?.productInterest ?? "—"}</div></div>
              <div className="f">
                <label>Next Follow-up</label>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <FollowupTag urgency={nextFollowup.urgency} dueAt={nextFollowup.dueAt} />
                  {hasPermission("leads.followups.create") && (
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
                    <Button variant="primary" icon="brief" onClick={() => setShowConvert(true)}>
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
                                toast.show("Follow-up completed", "check");
                              } catch (err) {
                                toast.show(err instanceof Error ? err.message : "Could not complete this follow-up. Please try again.", "alert");
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
                                toast.show("Follow-up cancelled", "close");
                              } catch (err) {
                                toast.show(err instanceof Error ? err.message : "Could not cancel this follow-up. Please try again.", "alert");
                              }
                            }}
                          >
                            <Icon name="close" size={13} /> Cancel
                          </a>
                        </div>
                      )}
                      {f.status === "COMPLETED" && f.completedByName && (
                        <p style={{ color: "var(--faint)", fontSize: 11.5 }}>Completed by {f.completedByName}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel
            title="Activity & History"
            flush
            extraHead={
              !isReal ? (
                <a className="more" href="#" onClick={(e) => { e.preventDefault(); setShowActivityForm(true); }}>
                  <Icon name="plus" size={14} /> Log Activity
                </a>
              ) : undefined
            }
          >
            {!isReal && (
              <div className="activity-summary">
                {ACTIVITY_TYPES.map((type) => (
                  <div className="as-item" key={type}>
                    <Icon name={ACTIVITY_ICONS[type]} size={14} />
                    <b>{activityCounts[type]}</b>
                    <span>{type}{activityCounts[type] === 1 ? "" : "s"}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="tl">
              {timeline.length === 0 && (
                <p style={{ color: "var(--muted)", fontSize: 13, padding: "4px 0 12px" }}>No activity logged yet.</p>
              )}
              {timeline.map((t) => (
                <div className="tl-item" key={t.id}>
                  <div className="dot"><Icon name={t.icon} size={14} /></div>
                  <div className="body">
                    <div className="r1">
                      <b>{t.title}</b>
                      <span className="when">{formatDateTime(t.occurredAt)}</span>
                    </div>
                    {t.detail && <p>{t.detail}</p>}
                    {t.actorName && <p>{t.actorName}</p>}
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Panel title="Related Opportunities" flush>
            <DataTable
              columns={oppColumns}
              rows={relatedOpportunities}
              onRowClick={(o) => router.push(`/opportunities/${o.id}`)}
              emptyTitle="No opportunities yet"
              emptyBody="Qualify this lead, then convert it above."
            />
          </Panel>
          <Panel title="Related Quotations" flush>
            <DataTable
              columns={quoteColumns}
              rows={relatedQuotes}
              onRowClick={(q) => router.push(`/quotations/${q.id}`)}
              emptyTitle="No quotations yet"
              emptyBody="Create one from the Opportunity once it's ready."
            />
          </Panel>
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
            <p style={{ color: "var(--faint)", fontSize: 11.5, marginBottom: 10 }}>
              {isReal
                ? "Notes recorded against this lead in the connected backend. Note creation isn't available from RevenueOS yet."
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
        <ActivityForm
          onClose={() => setShowActivityForm(false)}
          onSubmit={async (input) => {
            await appendActivity(
              input.type === "Call" ? "phone" : input.type === "Email" ? "mail" : input.type === "WhatsApp" ? "wa" : input.type === "Meeting" ? "cal" : "pulse",
              `${input.type}: ${input.note}`,
              input.ownerName
            );
          }}
          defaultRelatedType="Lead"
          defaultRelatedName={lead.customerName}
          defaultRelatedId={lead.id}
        />
      )}
      {showAssign && (
        <AssignLeadDialog
          currentAssigneeId={lead.assignedToId}
          onClose={() => setShowAssign(false)}
          onSubmit={(assignedToId, assignedToName) => assignLead(assignedToId, assignedToName)}
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
            await rejectLead(reason!);
            toast.show(`${lead.customerName} rejected`, "close");
          }}
        />
      )}
      {showConvert && (
        <OpportunityForm
          defaultLeadId={lead.id}
          onClose={() => setShowConvert(false)}
          onSubmit={(input) => createOpportunity(input)}
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
