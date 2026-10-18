import type { NextUpItem } from "../../ui/attention";
import {
  CallOutcome,
  Lead,
  LeadFollowup,
  LeadTimelineEntry,
  Opportunity,
  canAssignLeadFrom,
  canMoveLeadStatus,
  canQualifyLeadFrom,
  canRejectLeadFrom,
  canReopenLeadFrom,
  formatLeadStatus,
  formatOpportunityStage,
  isQualifiedLeadStatus,
  leadActionBlockedReason,
  LEAD_BEFORE_QUALIFICATION_STATUSES,
  LEAD_STATUS_MOVE_TARGETS,
} from "../../types/domain";
import { formatDateTime, formatRelative } from "../../format";

/**
 * The lead workspace: what this lead needs next, and which of its actions the person can take.
 * Presentation only. Every suggestion points at an action that already exists (the same dialogs,
 * routes and permissions as before), nothing happens without the person pressing it, and the
 * backend still decides (status rules, record scope, permissions). Nothing here changes a lead.
 */

export type LeadActionKey =
  | "assign"
  | "unassign"
  | "qualify"
  | "reject"
  | "reopen"
  | "status"
  | "logCall"
  | "logCnc"
  | "logActivity"
  | "followup"
  | "convert"
  | "reactivate"
  | "edit"
  | "share"
  | "deactivate"
  | "delete";

export type LeadAction = { type: LeadActionKey };

export interface LeadPermissions {
  assign: boolean;
  qualify: boolean;
  reject: boolean;
  reopen: boolean;
  statusUpdate: boolean;
  edit: boolean;
  followupCreate: boolean;
  createOpportunity: boolean;
  deactivate: boolean;
  delete: boolean;
  share: boolean;
}

export function leadPermissions(has: (code: string) => boolean): LeadPermissions {
  return {
    assign: has("leads.assign"),
    qualify: has("leads.qualify"),
    reject: has("leads.reject"),
    reopen: has("leads.reopen"),
    statusUpdate: has("leads.status.update"),
    edit: has("leads.edit"),
    followupCreate: has("leads.followups.create"),
    createOpportunity: has("opportunities.create"),
    deactivate: has("leads.deactivate"),
    delete: has("leads.delete"),
    share: has("content.view") && has("content.share"),
  };
}

export interface LeadWorkspaceContext {
  lead: Pick<Lead, "status" | "isActive" | "assignedToId" | "assignedToName" | "customerName" | "deactivationReason">;
  followups: LeadFollowup[];
  timeline: LeadTimelineEntry[];
  opportunities: Pick<Opportunity, "id" | "title" | "stage">[];
  potentialDuplicates: number;
  may: LeadPermissions;
  now: Date;
}

export interface LastCall {
  outcome?: CallOutcome;
  at: string;
  actorName: string;
}

/** The latest call logged on the lead (its history is newest first, but this does not rely on it). */
export function lastCallOf(timeline: LeadTimelineEntry[]): LastCall | null {
  let last: LeadTimelineEntry | null = null;
  for (const t of timeline) {
    if (t.source === "EMPLOYEE" && t.activityType === "CALL" && (!last || t.occurredAt > last.occurredAt)) last = t;
  }
  return last ? { outcome: last.outcome, at: last.occurredAt, actorName: last.actorName } : null;
}

export function pendingFollowups(followups: LeadFollowup[]): LeadFollowup[] {
  return followups.filter((f) => f.status === "PENDING").sort((a, b) => a.followupDate.localeCompare(b.followupDate));
}

const TONE_ORDER: Record<NextUpItem["tone"], number> = { bad: 0, warn: 1, action: 2, info: 3, good: 4 };

const INACTIVE = "Reactivate this lead first.";
/** One wording for every action the person's role lacks, so the page lists them together on one line. */
export const NOT_IN_ROLE = "Not part of your role. Ask an administrator if you need it.";

/** Where the lead stands, in the order the sales journey goes. */
export type JourneyStepKey = "received" | "presales" | "qualified" | "opportunity" | "quotation";

/**
 * The lead's next steps, most urgent first. Each one says what is true and offers the existing action
 * for it; an action the person may not take stays listed with the reason, so nobody wonders why.
 */
export function leadAttention(ctx: LeadWorkspaceContext): Array<NextUpItem<LeadAction>> {
  const { lead, may, now } = ctx;
  const items: Array<NextUpItem<LeadAction>> = [];
  const preQual = LEAD_BEFORE_QUALIFICATION_STATUSES.includes(lead.status);
  const pending = pendingFollowups(ctx.followups);
  const overdue = pending.filter((f) => new Date(f.followupDate).getTime() < now.getTime());
  const call = lastCallOf(ctx.timeline);
  const opp = ctx.opportunities[0];
  const cta = (label: string, type: LeadActionKey, enabled: boolean, reason?: string) => ({ label, action: { type } as LeadAction, enabled, reason: enabled ? undefined : reason });

  if (!lead.isActive) {
    items.push({
      key: "inactive",
      tone: "bad",
      title: "This lead is deactivated",
      detail: lead.deactivationReason ? `Reason: ${lead.deactivationReason}. It takes no sales actions until it is reactivated.` : "It takes no sales actions until it is reactivated.",
      cta: cta("Reactivate", "reactivate", may.deactivate, "Reactivating needs the leads.deactivate permission."),
    });
    return items;
  }

  if (canReopenLeadFrom(lead.status)) {
    items.push({
      key: "rejected",
      tone: "info",
      title: "This lead was rejected",
      detail: "Reopening takes it back to Contacted so it can be worked again; the rejection stays in its history.",
      cta: cta("Reopen", "reopen", may.reopen, "Reopening needs the leads.reopen permission."),
    });
  }

  if (lead.status === "WON" || lead.status === "LOST") {
    items.push({
      key: "closed",
      tone: "info",
      title: `This lead is closed (${formatLeadStatus(lead.status)})`,
      cta: opp ? { label: "Open the opportunity", action: { type: "open", href: `/opportunities/${opp.id}` }, enabled: true } : undefined,
    });
  }

  if (overdue.length > 0) {
    const f = overdue[0];
    items.push({
      key: "overdue",
      tone: "bad",
      title: `Follow-up overdue since ${formatDateTime(f.followupDate)}`,
      detail: f.remarks ? `"${f.remarks}"` : overdue.length > 1 ? `${overdue.length} follow-ups are overdue.` : undefined,
      cta: cta("Log the call", "logCall", may.edit, "Logging a call needs the leads.edit permission."),
    });
  }

  if (ctx.potentialDuplicates > 0) {
    items.push({
      key: "duplicates",
      tone: "warn",
      title: ctx.potentialDuplicates === 1 ? "Another open enquiry looks like this one" : `${ctx.potentialDuplicates} open enquiries look like this one`,
      detail: "Nothing has been merged or changed. Check who is handling them before you call.",
      cta: { label: "See why", action: { type: "open", href: "#duplicates" }, enabled: true },
    });
  }

  if (preQual) {
    if (!lead.assignedToId) {
      items.push({
        key: "unassigned",
        tone: "action",
        title: "Nobody is working this lead yet",
        detail: "Assigning it gives it to a pre-sales person; it is recorded in its history.",
        cta: cta("Assign", "assign", may.assign && canAssignLeadFrom(lead.status), may.assign ? leadActionBlockedReason("assign", lead.status) : "Assigning needs the leads.assign permission."),
      });
    }
    if (!call) {
      items.push({
        key: "no-call",
        tone: "action",
        title: "No call has been logged yet",
        detail: "Log the first call, connected or not, so everyone sees where this lead stands.",
        cta: cta("Log a call", "logCall", may.edit, "Logging a call needs the leads.edit permission."),
      });
    } else if (call.outcome === "NOT_CONNECTED") {
      items.push({
        key: "cnc",
        tone: "warn",
        title: `Last call didn't connect (${formatRelative(call.at)})`,
        detail: pending.length === 0 ? "Schedule a follow-up so the next attempt isn't forgotten." : undefined,
        cta: pending.length === 0
          ? cta("Schedule follow-up", "followup", may.followupCreate, "Scheduling needs the leads.followups.create permission.")
          : cta("Log another call", "logCall", may.edit, "Logging a call needs the leads.edit permission."),
      });
    }
    if (pending.length === 0 && call?.outcome !== "NOT_CONNECTED") {
      items.push({
        key: "no-followup",
        tone: "info",
        title: "No follow-up is scheduled",
        cta: cta("Schedule follow-up", "followup", may.followupCreate, "Scheduling needs the leads.followups.create permission."),
      });
    }
    if (call && call.outcome !== "NOT_CONNECTED") {
      items.push({
        key: "decide",
        tone: "info",
        title: "Spoken to — qualify or reject when you've decided",
        detail: "Qualifying hands the lead to a salesperson. Nothing changes until you confirm.",
        cta: cta("Qualify", "qualify", may.qualify && canQualifyLeadFrom(lead.status), may.qualify ? leadActionBlockedReason("qualify", lead.status) : "Qualifying needs the leads.qualify permission."),
      });
    }
  }

  if (isQualifiedLeadStatus(lead.status) && !opp) {
    items.push({
      key: "convert",
      tone: "action",
      title: "Qualified — no opportunity yet",
      detail: "Create the opportunity to track the deal's value, probability and quotations.",
      cta: cta("Create opportunity", "convert", may.createOpportunity, "Creating opportunities needs the opportunities.create permission."),
    });
  }

  if (opp && lead.status !== "WON" && lead.status !== "LOST") {
    items.push({
      key: "opportunity",
      tone: "info",
      title: `The deal continues as "${opp.title}" (${formatOpportunityStage(opp.stage)})`,
      cta: { label: "Open the opportunity", action: { type: "open", href: `/opportunities/${opp.id}` }, enabled: true },
    });
  }

  if (items.length === 0) items.push({ key: "clear", tone: "good", title: "Nothing needs doing on this lead right now" });
  return items.sort((a, b) => TONE_ORDER[a.tone] - TONE_ORDER[b.tone]);
}

export interface LeadActionState {
  key: LeadActionKey;
  label: string;
  icon: string;
  /** Shown at all: the action exists for this lead's status. */
  available: boolean;
  enabled: boolean;
  reason?: string;
  tone?: "danger";
}

/**
 * Every lifecycle action with whether it applies now and, if not usable, why. The page shows the
 * ones that apply; one the person may not use stays visible with its reason.
 */
export function leadActionStates(ctx: Pick<LeadWorkspaceContext, "lead" | "may">): Record<LeadActionKey, LeadActionState> {
  const { lead, may } = ctx;
  const inactive = !lead.isActive;
  const st = (key: LeadActionKey, label: string, icon: string, available: boolean, permitted: boolean, noPermission: string, blocked?: string, tone?: "danger"): LeadActionState => {
    const reason = inactive && key !== "reactivate" && key !== "delete" ? INACTIVE : !permitted ? noPermission : blocked;
    return { key, label, icon, available, enabled: !reason, reason, tone };
  };
  const canUnassign = lead.status === "PRE_SALES_ASSIGNED" && !!lead.assignedToId;
  return {
    logCall: st("logCall", "Log call", "phone", true, may.edit, NOT_IN_ROLE),
    logCnc: st("logCnc", "Log CNC", "phone", true, may.edit, NOT_IN_ROLE),
    logActivity: st("logActivity", "Log activity", "plus", true, may.edit, NOT_IN_ROLE),
    followup: st("followup", "Schedule follow-up", "cal", true, may.followupCreate, NOT_IN_ROLE),
    assign: st("assign", lead.assignedToId ? "Reassign" : "Assign", "user", canAssignLeadFrom(lead.status), may.assign, NOT_IN_ROLE),
    unassign: st("unassign", "Unassign", "user", canUnassign, may.assign, NOT_IN_ROLE),
    qualify: st("qualify", "Qualify", "check", canQualifyLeadFrom(lead.status), may.qualify, NOT_IN_ROLE),
    reject: st("reject", "Reject", "close", canRejectLeadFrom(lead.status), may.reject, NOT_IN_ROLE, undefined, "danger"),
    reopen: st("reopen", "Reopen", "restore", canReopenLeadFrom(lead.status), may.reopen, NOT_IN_ROLE),
    status: st("status", "Update status", "pulse", LEAD_STATUS_MOVE_TARGETS.some((t) => canMoveLeadStatus(lead.status, t)), may.statusUpdate, NOT_IN_ROLE),
    convert: st("convert", "Create opportunity", "brief", isQualifiedLeadStatus(lead.status), may.createOpportunity, NOT_IN_ROLE),
    edit: st("edit", "Edit details", "edit", true, may.edit, NOT_IN_ROLE),
    share: st("share", "Share content", "layers", may.share, may.share, ""),
    reactivate: st("reactivate", "Reactivate", "restore", inactive, may.deactivate, NOT_IN_ROLE),
    deactivate: st("deactivate", "Deactivate", "alert", !inactive, may.deactivate, NOT_IN_ROLE, undefined, "danger"),
    delete: st("delete", "Move to Recycle Bin", "trash", may.delete, may.delete, "", undefined, "danger"),
  };
}

/** The journey this lead is on, and how far it has come: received → pre-sales → qualified → opportunity → quotation. */
export function leadJourney(
  lead: Pick<Lead, "status" | "assignedToName">,
  opportunity: Pick<Opportunity, "id" | "title" | "stage"> | undefined,
  quotationCount: number
): Array<{ key: JourneyStepKey; label: string; detail?: string; state: "done" | "current" | "todo" | "stopped"; href?: string }> {
  const rejected = lead.status === "REJECTED";
  const qualified = isQualifiedLeadStatus(lead.status) || ["PROPOSAL_SENT", "NEGOTIATION", "WON", "LOST"].includes(lead.status) || !!opportunity;
  const worked = qualified || !["NEW"].includes(lead.status);
  const at: JourneyStepKey = quotationCount > 0 ? "quotation" : opportunity ? "opportunity" : qualified ? "qualified" : worked ? "presales" : "received";
  const order: JourneyStepKey[] = ["received", "presales", "qualified", "opportunity", "quotation"];
  const idx = order.indexOf(at);
  const state = (k: JourneyStepKey) => (rejected && k !== "received" && order.indexOf(k) > idx ? "todo" : rejected && k === at ? "stopped" : order.indexOf(k) < idx ? "done" : order.indexOf(k) === idx ? "current" : "todo");
  return [
    { key: "received", label: "Received", state: state("received") },
    { key: "presales", label: "Pre-sales", detail: rejected ? "Rejected" : lead.assignedToName && !qualified ? lead.assignedToName : undefined, state: state("presales") },
    { key: "qualified", label: "Qualified", state: state("qualified") },
    { key: "opportunity", label: "Opportunity", detail: opportunity ? `Stage: ${formatOpportunityStage(opportunity.stage)}` : undefined, state: state("opportunity"), href: opportunity ? `/opportunities/${opportunity.id}` : undefined },
    { key: "quotation", label: "Quotation", detail: quotationCount > 0 ? `${quotationCount}` : undefined, state: state("quotation") },
  ];
}
