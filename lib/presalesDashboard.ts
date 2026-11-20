import { classifyFollowup } from "./followup";
import { ID } from "./types/common";
import { Lead, LeadOpportunity, LeadStatus, OpportunityStage, isQualifiedLeadStatus } from "./types/domain";

/**
 * The Pre-Sales dashboard, worked out from the leads the backend lets this person see
 * (GET /leads is record-scoped: a Pre-Sales user receives the leads assigned to them
 * or that they worked on). Each lead carries its follow-ups and opportunities, so
 * nothing here needs a list Pre-Sales cannot open. All counts are of real records;
 * nothing is estimated.
 */

/** Statuses in which a lead is still Pre-Sales' to work. */
export const PRESALES_OPEN_STATUSES: LeadStatus[] = ["NEW", "ASSIGNED", "PRE_SALES_ASSIGNED", "CONTACTED", "UNDERQUALIFIED"];
/** Not yet spoken to: the first call is still to be made. */
const NOT_CONTACTED: LeadStatus[] = ["NEW", "ASSIGNED", "PRE_SALES_ASSIGNED"];
/** Statuses a lead only reaches after Pre-Sales qualified it and handed it to Sales. */
const HANDED_OVER: LeadStatus[] = ["QUALIFIED", "SALES_ASSIGNED", "PROPOSAL_SENT", "NEGOTIATION", "WON", "LOST"];

export const isHandedOver = (status: LeadStatus): boolean => isQualifiedLeadStatus(status) || HANDED_OVER.includes(status);
const isOpen = (l: Lead) => l.isActive && PRESALES_OPEN_STATUSES.includes(l.status);
const pending = (l: Lead) => (l.followups ?? []).filter((f) => f.status === "PENDING");
const leadName = (l: Lead) => l.companyName || l.customerName;

/** The leads currently assigned to this person that are still in Pre-Sales. */
export function myOpenLeads(leads: Lead[], me: ID): Lead[] {
  return leads.filter((l) => l.assignedToId === me && isOpen(l));
}

export interface WorkStatus {
  /** Assigned to me and still in Pre-Sales. */
  open: number;
  /** Of those, not contacted yet. */
  notContacted: number;
  followupsToday: number;
  followupsOverdue: number;
  /** Leads I worked on that went on to Sales. */
  handedOver: number;
  rejected: number;
}

export function workStatus(leads: Lead[], me: ID): WorkStatus {
  const mine = myOpenLeads(leads, me);
  const due = mine.flatMap(pending).map((f) => classifyFollowup(f.followupDate));
  return {
    open: mine.length,
    notContacted: mine.filter((l) => NOT_CONTACTED.includes(l.status)).length,
    followupsToday: due.filter((u) => u === "Due Today").length,
    followupsOverdue: due.filter((u) => u === "Overdue").length,
    handedOver: leads.filter((l) => isHandedOver(l.status)).length,
    rejected: leads.filter((l) => l.status === "REJECTED").length,
  };
}

export type FocusKind = "overdue" | "today" | "new" | "decide" | "tomorrow" | "upcoming";

export interface FocusTask {
  id: string;
  kind: FocusKind;
  title: string;
  leadId: ID;
  leadName: string;
  /** When it is due (a follow-up) or since when it has waited (a new lead). */
  at: string;
}

const FOCUS_ORDER: FocusKind[] = ["overdue", "today", "new", "decide", "tomorrow", "upcoming"];
const UPCOMING_DAYS = 7;

/**
 * What this person should do next, most urgent first: their scheduled follow-ups
 * (overdue, today, tomorrow, the next week), new leads waiting for a first call, and
 * underqualified leads waiting for a decision. Only leads assigned to them count.
 */
export function focusTasks(leads: Lead[], me: ID, now: Date = new Date()): FocusTask[] {
  const horizon = now.getTime() + UPCOMING_DAYS * 86_400_000;
  const tasks: FocusTask[] = [];
  for (const l of myOpenLeads(leads, me)) {
    const open = pending(l);
    for (const f of open) {
      const u = classifyFollowup(f.followupDate);
      const kind: FocusKind | null =
        u === "Overdue" ? "overdue" : u === "Due Today" ? "today" : u === "Tomorrow" ? "tomorrow" : new Date(f.followupDate).getTime() <= horizon ? "upcoming" : null;
      if (kind) tasks.push({ id: `followup-${f.id}`, kind, title: f.remarks || "Follow-up call", leadId: l.id, leadName: leadName(l), at: f.followupDate });
    }
    if (open.length === 0 && NOT_CONTACTED.includes(l.status))
      tasks.push({ id: `new-${l.id}`, kind: "new", title: "New lead: make the first call", leadId: l.id, leadName: leadName(l), at: l.createdAt });
    if (open.length === 0 && l.status === "UNDERQUALIFIED")
      tasks.push({ id: `decide-${l.id}`, kind: "decide", title: "Underqualified: qualify, reject or follow up", leadId: l.id, leadName: leadName(l), at: l.updatedAt });
  }
  return tasks.sort((a, b) => FOCUS_ORDER.indexOf(a.kind) - FOCUS_ORDER.indexOf(b.kind) || a.at.localeCompare(b.at));
}

export interface PipelineDeal extends LeadOpportunity {
  leadId: ID;
  leadName: string;
}

/** The opportunities opened from the leads this person worked on. */
export function pipelineDeals(leads: Lead[]): PipelineDeal[] {
  return leads.flatMap((l) => (l.opportunities ?? []).map((o) => ({ ...o, leadId: l.id, leadName: leadName(l) })));
}

export function dealsByStage(deals: PipelineDeal[]): Record<OpportunityStage, { count: number; value: number }> {
  const out = {} as Record<OpportunityStage, { count: number; value: number }>;
  for (const d of deals) {
    const s = (out[d.stage] ??= { count: 0, value: 0 });
    s.count += 1;
    s.value += d.expectedValue;
  }
  return out;
}

export interface ConversionStep {
  label: string;
  count: number;
  /** Share of the step before, in whole percent; absent for the first step. */
  rate?: number;
}

/**
 * From the leads this person worked on to won deals: handled → handed to Sales →
 * an opportunity opened → won. "Won" is the deal's saved stage; the backend does not
 * give Pre-Sales a link from a lead to its sales orders.
 */
export function leadToWinConversion(leads: Lead[]): ConversionStep[] {
  const handled = leads.filter((l) => l.isActive || l.status === "REJECTED");
  const handedOver = handled.filter((l) => isHandedOver(l.status));
  const withDeal = handedOver.filter((l) => (l.opportunities ?? []).length > 0);
  const won = withDeal.filter((l) => (l.opportunities ?? []).some((o) => o.stage === "WON"));
  const counts = [handled.length, handedOver.length, withDeal.length, won.length];
  const labels = ["Leads I handled", "Qualified to Sales", "Opportunity opened", "Won"];
  return labels.map((label, i) => ({
    label,
    count: counts[i],
    ...(i > 0 ? { rate: counts[i - 1] ? Math.round((counts[i] / counts[i - 1]) * 100) : 0 } : {}),
  }));
}
