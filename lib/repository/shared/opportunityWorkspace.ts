import type { NextUpItem } from "../../ui/attention";
import { LeadTimelineEntry, Opportunity, OpportunityStage, OPPORTUNITY_STEPS, Quotation, formatOpportunityStage } from "../../types/domain";
import { canMoveOpportunityStage, isOpportunityStageFinal } from "./opportunityStage";
import { NextStep } from "./commercialChain";
import { formatDate } from "../../format";

/**
 * The opportunity workspace: what stands between this deal and its next commercial step, most
 * urgent first. Presentation only: every suggestion opens an existing dialog or record, and the
 * backend still decides (stage rules, customer link rules, quotation validation, permissions).
 */
export type OpportunityActionKey = "link" | "quote" | "moveNext" | "lost" | "logCall";
export type OpportunityAction = { type: OpportunityActionKey };

/** How long without a logged call or meeting before the deal is flagged as quiet. A display heuristic, not a business rule. */
export const QUIET_DAYS = 14;

export interface OpportunityWorkspaceContext {
  opportunity: Pick<Opportunity, "stage" | "customerId" | "expectedCloseDate" | "title">;
  leadActive: boolean;
  quotations: Array<Pick<Quotation, "id" | "quoteNo" | "status" | "createdAt"> & { next: NextStep }>;
  timeline: LeadTimelineEntry[];
  may: { editStage: boolean; editOpportunity: boolean; createQuotation: boolean; logActivity: boolean };
  /** The customer-link action as the existing rules decide it. */
  linkState: { enabled: boolean; reason?: string };
  now: Date;
}

const TONE_ORDER: Record<NextUpItem["tone"], number> = { bad: 0, warn: 1, action: 2, info: 3, good: 4 };
const DAY = 86_400_000;

export function nextStageOf(stage: OpportunityStage): OpportunityStage | undefined {
  const i = OPPORTUNITY_STEPS.indexOf(stage);
  const after = i >= 0 ? OPPORTUNITY_STEPS[i + 1] : undefined;
  return after && canMoveOpportunityStage(stage, after) ? after : undefined;
}

/** When the last call, meeting or message was logged on the lead behind the deal. */
export function lastContactAt(timeline: LeadTimelineEntry[]): string | null {
  let at: string | null = null;
  for (const t of timeline) if (t.source === "EMPLOYEE" && (!at || t.occurredAt > at)) at = t.occurredAt;
  return at;
}

export function opportunityAttention(ctx: OpportunityWorkspaceContext): Array<NextUpItem<OpportunityAction>> {
  const { opportunity: o, may, now } = ctx;
  const items: Array<NextUpItem<OpportunityAction>> = [];
  const final = isOpportunityStageFinal(o.stage);
  const latest = [...ctx.quotations].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const cta = (label: string, type: OpportunityActionKey, enabled: boolean, reason?: string) => ({ label, action: { type } as OpportunityAction, enabled, reason: enabled ? undefined : reason });

  if (final) {
    items.push({
      key: "final",
      tone: o.stage === "WON" ? "good" : "info",
      title: o.stage === "WON" ? "Won" : "Lost — this opportunity is closed",
      detail: latest ? `Latest quotation ${latest.quoteNo}: ${latest.next.label}.` : undefined,
      cta: latest ? { label: `Open ${latest.quoteNo}`, action: { type: "open", href: `/quotations/${latest.id}` }, enabled: true } : undefined,
    });
    return items;
  }

  if (!ctx.leadActive) {
    items.push({ key: "lead-inactive", tone: "bad", title: "The lead behind this deal is deactivated", detail: "Its opportunity can't be changed until the lead is reactivated." });
  }

  const close = o.expectedCloseDate ? new Date(o.expectedCloseDate) : null;
  if (close && close.getTime() < new Date(now).setHours(0, 0, 0, 0)) {
    items.push({
      key: "close-passed",
      tone: "warn",
      title: `Expected close date passed (${formatDate(o.expectedCloseDate)})`,
      detail: "Move the deal on, or mark it lost if it has gone cold.",
    });
  }

  if (!o.customerId) {
    items.push({
      key: "no-customer",
      tone: "action",
      title: "Link a customer before quoting",
      detail: "A quotation is made for a customer and uses its GST registration. Linking never creates or merges a customer.",
      cta: cta("Link a customer", "link", ctx.linkState.enabled, ctx.linkState.reason),
    });
  } else if (ctx.quotations.length === 0) {
    items.push({
      key: "quote",
      tone: "action",
      title: "Ready for a quotation",
      detail: "The system works out the tax and totals from the item, quantity, rate and both GST registrations.",
      cta: cta("Create quotation", "quote", may.createQuotation && ctx.leadActive, !may.createQuotation ? "Creating quotations needs the quotations.create permission." : "Reactivate the lead first."),
    });
  } else if (latest) {
    items.push({
      key: "quotation",
      tone: latest.next.tone === "action" ? "action" : "info",
      title: `${latest.quoteNo}: ${latest.next.label}`,
      cta: { label: `Open ${latest.quoteNo}`, action: { type: "open", href: `/quotations/${latest.id}` }, enabled: true },
    });
  }

  const last = lastContactAt(ctx.timeline);
  const quietFor = last ? Math.floor((now.getTime() - new Date(last).getTime()) / DAY) : null;
  if (quietFor === null || quietFor >= QUIET_DAYS) {
    items.push({
      key: "quiet",
      tone: "warn",
      title: quietFor === null ? "No call or meeting logged on this deal yet" : `No contact logged for ${quietFor} days`,
      cta: cta("Log a call", "logCall", may.logActivity && ctx.leadActive, !may.logActivity ? "Logging needs the leads.edit permission." : "Reactivate the lead first."),
    });
  }

  const next = nextStageOf(o.stage);
  if (next) {
    items.push({
      key: "next-stage",
      tone: "info",
      title: next === "WON" ? "When the order is confirmed, mark it Won" : `When it's time, move it to ${formatOpportunityStage(next)}`,
      detail: "Every stage move asks you to confirm, and your remark is kept in its history.",
      cta: cta(next === "WON" ? "Mark Won" : `Move to ${formatOpportunityStage(next)}`, "moveNext", may.editStage, "Changing stages needs the opportunities.edit permission."),
    });
  }

  return items.sort((a, b) => TONE_ORDER[a.tone] - TONE_ORDER[b.tone]);
}
