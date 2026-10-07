import type {
  Customer,
  CustomerEvent,
  CustomerLegacyMatch,
  CustomerOverview,
  CustomerOverviewInvoice,
  CustomerOverviewOpportunity,
  CustomerOverviewOrder,
  CustomerOverviewProforma,
  CustomerOverviewQuotation,
  CustomerOverviewReceivable,
} from "../../types/domain";
import type { QuotationStatus } from "../../types/domain";
import { formatOpportunityStage, formatProformaInvoiceStatus, formatQuotationStatus, formatSalesOrderStatus } from "../../types/domain";
import { NextStepTone, buildCommercialChain, quotationNextStep } from "./commercialChain";
import { canGiveAccountsApproval, canRecordCommercialDocuments, canVerifyAdvanceReceipt } from "./salesOrderLifecycle";
import { formatCompactInr } from "./money";

/**
 * What the customer cockpit shows, worked out from the customer and its overview
 * (GET /customers/:id/overview). Pure functions: nothing here reads the clock
 * (the caller passes `now`), calls the backend or writes anything.
 *
 * Everything that is a recorded fact (amounts, statuses, due dates) comes from the
 * backend untouched. What is *derived* here is presentation only and is labelled
 * that way on screen: which step of a deal is current, what needs attention, how
 * much is overdue (a recorded due date in the past with a balance left, the same
 * rule the backend's collection-reminder check uses), the open pipeline value.
 * None of it is persisted or sent anywhere.
 */

const DAY_MS = 86_400_000;

/** One scale for "how much does this need you": the same five words for steps, items and tags. */
export type Tone = "bad" | "warn" | "action" | "info" | "good";
const TONE_RANK: Record<Tone, number> = { bad: 0, warn: 1, action: 2, info: 3, good: 4 };

/** "QT-8F53" style reference: the document's code, or a short id reference when the backend never set one. */
export const documentRef = (id: string, code?: string | null) => code || `#${id.slice(0, 8).toUpperCase()}`;

// ---------------------------------------------------------------------------
// Receivables
// ---------------------------------------------------------------------------

/** Whole days until the due date, negative once it has passed. Same arithmetic as the backend's collection-reminders check. */
export function daysUntilDue(dueDate: string, now: Date): number {
  return Math.ceil((new Date(dueDate).getTime() - now.getTime()) / DAY_MS);
}

/** A receivable that still has something to collect (written-off ones and fully paid ones do not). */
export const isOpenReceivable = (r: Pick<CustomerOverviewReceivable, "paymentStatus" | "balanceAmount">) => r.paymentStatus !== "WRITTEN_OFF" && r.balanceAmount > 0;

export const isOverdueReceivable = (r: CustomerOverviewReceivable, now: Date) => isOpenReceivable(r) && daysUntilDue(r.dueDate, now) < 0;

const isPosted = (i: Pick<CustomerOverviewInvoice, "status">) => i.status !== "DRAFT";

const sumMoney = (values: number[]) => Math.round(values.reduce((t, v) => t + v, 0) * 100) / 100;

// ---------------------------------------------------------------------------
// One quotation and everything built on it
// ---------------------------------------------------------------------------

export type NextKind =
  | "QUOTE_NEEDED"
  | "QUOTATION_APPROVAL"
  | "PROFORMA_NEEDED"
  | "PROFORMA_APPROVAL"
  | "PROFORMA_EXPIRED"
  | "ORDER_NEEDED"
  | "ORDER_APPROVAL"
  | "WITH_OPERATIONS"
  | "INVOICE_DRAFT"
  | "OVERDUE"
  | "PAYMENT_DUE"
  | "COMPLETE"
  | "CLOSED";

/** What a quotation (or a deal) is waiting for, and where to go to do it. */
export interface NextStep {
  kind: NextKind;
  tone: Tone;
  /** "Waiting for store approval", "₹2.9 L overdue since 30 Jun 2026". */
  label: string;
  /** The document to open to deal with it. */
  href?: string;
  /** The money involved, when the step is about money. */
  amount?: number;
}

export interface QuotationTrail {
  quotation: CustomerOverviewQuotation;
  /** Newest first; cancelled ones are history. */
  proformas: CustomerOverviewProforma[];
  /** The one still in play (not cancelled), if any. */
  activeProforma?: CustomerOverviewProforma;
  /** Reachable directly or through one of its Proformas, newest first. */
  orders: CustomerOverviewOrder[];
  liveOrders: CustomerOverviewOrder[];
  invoices: CustomerOverviewInvoice[];
  postedInvoices: CustomerOverviewInvoice[];
  /** Open (still to collect) receivables of the posted invoices. */
  openReceivables: Array<CustomerOverviewReceivable & { invoiceId: string }>;
  /** How far along it is: 0 rejected, 1 draft/revised, 2 approved, +1 for each of Proforma, Order, posted Invoice, fully paid. */
  rank: number;
  next: NextStep;
}

const toTone = (t: NextStepTone): Tone => (t === "neutral" ? "info" : t);


/** What is still owed: overdue (a recorded due date has passed) or simply coming due. undefined when nothing is open. */
function moneyNext(open: Array<CustomerOverviewReceivable & { invoiceId: string }>, now: Date): NextStep | undefined {
  const overdue = open.filter((r) => isOverdueReceivable(r, now));
  if (overdue.length > 0) {
    const oldest = [...overdue].sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate))[0];
    const amount = sumMoney(overdue.map((r) => r.balanceAmount));
    return { kind: "OVERDUE", tone: "bad", label: `${formatCompactInr(amount)} overdue, oldest due ${shortDate(oldest.dueDate)}`, href: `/sales-invoices/${oldest.invoiceId}`, amount };
  }
  if (open.length > 0) {
    const soonest = [...open].sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate))[0];
    const amount = sumMoney(open.map((r) => r.balanceAmount));
    return { kind: "PAYMENT_DUE", tone: "info", label: `${formatCompactInr(amount)} due ${shortDate(soonest.dueDate)}`, href: `/sales-invoices/${soonest.invoiceId}`, amount };
  }
  return undefined;
}

function nextForTrail(t: Omit<QuotationTrail, "next" | "rank">, now: Date): NextStep {
  const q = t.quotation;
  const qHref = `/quotations/${q.id}`;
  // The early stages say what the Quotations list says (one wording for one situation).
  const early = quotationNextStep({ status: q.status as QuotationStatus }, { liveOrders: [], activeProforma: t.activeProforma });

  if (q.status === "REJECTED") return { kind: "CLOSED", tone: toTone(early.tone), label: early.label, href: qHref };
  if (q.status === "DRAFT" || q.status === "REVISED") return { kind: "QUOTATION_APPROVAL", tone: toTone(early.tone), label: early.label, href: qHref };

  // Money first: once something is invoiced, what is still owed matters most.
  const money = moneyNext(t.openReceivables, now);
  if (money) return money;
  const draft = t.invoices.find((i) => i.status === "DRAFT");
  if (draft) return { kind: "INVOICE_DRAFT", tone: "action", label: "Invoice in draft", href: `/sales-invoices/${draft.id}` };
  if (t.postedInvoices.length > 0) return { kind: "COMPLETE", tone: "good", label: "Invoiced and collected", href: `/sales-invoices/${t.postedInvoices[0].id}` };

  if (t.liveOrders.length > 0) {
    const o = t.liveOrders[0];
    const href = `/sales-orders/${o.id}`;
    if (canVerifyAdvanceReceipt(o.status)) return { kind: "ORDER_APPROVAL", tone: "warn", label: "Order waiting for store approval", href };
    if (canGiveAccountsApproval(o.status)) return { kind: "ORDER_APPROVAL", tone: "warn", label: "Order waiting for accounts approval", href };
    // Everything after that is OperationsOS's (or an older status): shown as it is, with no action offered.
    return { kind: "WITH_OPERATIONS", tone: "info", label: `Order: ${formatSalesOrderStatus(o.status)}`, href };
  }

  const p = t.activeProforma;
  const href = p ? `/proforma-invoices/${p.id}` : qHref;
  const kind: NextKind = !p ? "PROFORMA_NEEDED" : p.isExpired ? "PROFORMA_EXPIRED" : p.status === "APPROVED" ? "ORDER_NEEDED" : "PROFORMA_APPROVAL";
  return { kind, tone: toTone(early.tone), label: early.label, href };
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function trailFor(q: CustomerOverviewQuotation, overview: CustomerOverview, now: Date): QuotationTrail {
  // The chain of a quotation is the one the Quotations screens use: its Proformas, the Sales Orders reachable from it, which of them are still live.
  const chain = buildCommercialChain(q.id, overview.proformas, overview.salesOrders);
  const orderIds = new Set(chain.orders.map((o) => o.id));
  const invoices = overview.invoices.filter((i) => orderIds.has(i.salesOrderId));
  const postedInvoices = invoices.filter(isPosted);
  const openReceivables = postedInvoices.flatMap((i) => i.receivables.filter(isOpenReceivable).map((r) => ({ ...r, invoiceId: i.id })));
  const base = {
    quotation: q,
    proformas: chain.proformas,
    activeProforma: chain.activeProforma,
    orders: chain.orders,
    liveOrders: chain.liveOrders,
    invoices,
    postedInvoices,
    openReceivables,
  };
  const paid = postedInvoices.length > 0 && openReceivables.length === 0;
  const rank = q.status === "REJECTED" ? 0 : q.status === "APPROVED" ? 2 + (base.activeProforma ? 1 : 0) + (base.liveOrders.length ? 1 : 0) + (postedInvoices.length ? 1 : 0) + (paid ? 1 : 0) : 1;
  return { ...base, rank, next: nextForTrail(base, now) };
}

// ---------------------------------------------------------------------------
// A deal: an opportunity, its quotations, and the chain they have grown
// ---------------------------------------------------------------------------

export type StepKey = "deal" | "quotation" | "proforma" | "order" | "invoice" | "payment";
export type StepState = "done" | "current" | "attention" | "upcoming" | "closed";

export interface DealStep {
  key: StepKey;
  label: string;
  state: StepState;
  /** One or two words: "Approved", "Pending store approval", "Overdue". */
  summary: string;
  tone: Tone;
  amount?: number;
  /** How many documents sit at this step when there is more than one. */
  count?: number;
  href?: string;
}

export interface Deal {
  opportunity: CustomerOverviewOpportunity;
  /** Every quotation of the deal, most advanced first. */
  trails: QuotationTrail[];
  /** The most advanced quotation: the chain shows its story. */
  primary?: QuotationTrail;
  steps: DealStep[];
  /** The most urgent thing any of the deal's quotations is waiting for. */
  next: NextStep;
  isOpen: boolean;
  outstanding: number;
  overdue: number;
}

const OPEN_STAGES = new Set(["QUALIFIED", "PROPOSAL", "NEGOTIATION"]);

const mostUrgent = (steps: NextStep[]): NextStep | undefined => [...steps].sort((a, b) => TONE_RANK[a.tone] - TONE_RANK[b.tone])[0];

function stepsFor(opp: CustomerOverviewOpportunity, primary: QuotationTrail | undefined, trails: QuotationTrail[], now: Date): DealStep[] {
  const stage = opp.stage;
  const lost = stage === "LOST";
  const dealStep: DealStep = {
    key: "deal",
    label: "Deal",
    summary: formatOpportunityStage(stage),
    state: lost ? "closed" : "done",
    tone: lost ? "info" : stage === "WON" ? "good" : "info",
    amount: opp.expectedValue,
    href: `/opportunities/${opp.id}`,
  };

  if (!primary) {
    return [
      dealStep,
      { key: "quotation", label: "Quotation", summary: "Not quoted yet", state: lost ? "closed" : "current", tone: lost ? "info" : "action" },
      { key: "proforma", label: "Proforma", summary: "—", state: "upcoming", tone: "info" },
      { key: "order", label: "Order", summary: "—", state: "upcoming", tone: "info" },
      { key: "invoice", label: "Invoice", summary: "—", state: "upcoming", tone: "info" },
      { key: "payment", label: "Payment", summary: "—", state: "upcoming", tone: "info" },
    ];
  }

  const q = primary.quotation;
  const rejected = q.status === "REJECTED";
  const quotation: DealStep = {
    key: "quotation",
    label: "Quotation",
    summary: formatQuotationStatus(q.status),
    state: rejected ? "closed" : q.status === "APPROVED" ? "done" : "current",
    tone: rejected ? "info" : q.status === "APPROVED" ? "good" : "action",
    amount: q.totalAmount,
    href: `/quotations/${q.id}`,
  };

  const p = primary.activeProforma;
  const proforma: DealStep = !p
    ? { key: "proforma", label: "Proforma", summary: q.status === "APPROVED" ? "Ready to create" : "—", state: rejected ? "closed" : q.status === "APPROVED" ? "current" : "upcoming", tone: q.status === "APPROVED" ? "action" : "info" }
    : p.isExpired
    ? { key: "proforma", label: "Proforma", summary: "Expired", state: primary.liveOrders.length ? "done" : "attention", tone: primary.liveOrders.length ? "info" : "bad", amount: p.totalAmount, href: `/proforma-invoices/${p.id}` }
    : { key: "proforma", label: "Proforma", summary: formatProformaInvoiceStatus(p.status), state: p.status === "APPROVED" ? "done" : "current", tone: p.status === "APPROVED" ? "good" : "warn", amount: p.totalAmount, href: `/proforma-invoices/${p.id}` };

  const o = primary.liveOrders[0];
  const orderPending = !!o && canRecordCommercialDocuments(o.status);
  const order: DealStep = !o
    ? { key: "order", label: "Order", summary: p && p.status === "APPROVED" && !p.isExpired ? "Ready to create" : "—", state: p && p.status === "APPROVED" && !p.isExpired ? "current" : "upcoming", tone: p && p.status === "APPROVED" && !p.isExpired ? "action" : "info" }
    : { key: "order", label: "Order", summary: formatSalesOrderStatus(o.status), state: orderPending ? "current" : "done", tone: orderPending ? "warn" : "good", amount: o.totalAmount, count: primary.liveOrders.length > 1 ? primary.liveOrders.length : undefined, href: `/sales-orders/${o.id}` };

  const draft = primary.invoices.find((i) => i.status === "DRAFT");
  const posted = primary.postedInvoices[0];
  const invoice: DealStep = posted
    ? { key: "invoice", label: "Invoice", summary: "Posted", state: "done", tone: "good", amount: sumMoney(primary.postedInvoices.map((i) => i.totalAmount)), count: primary.postedInvoices.length > 1 ? primary.postedInvoices.length : undefined, href: `/sales-invoices/${posted.id}` }
    : draft
    ? { key: "invoice", label: "Invoice", summary: "Draft", state: "current", tone: "action", amount: draft.totalAmount, href: `/sales-invoices/${draft.id}` }
    : { key: "invoice", label: "Invoice", summary: "—", state: "upcoming", tone: "info" };

  // Payment speaks for the whole deal (every quotation of it), not only the quotation the chain follows: what is owed is owed.
  const dealOpen = trails.flatMap((t) => t.openReceivables);
  const dealPosted = trails.some((t) => t.postedInvoices.length > 0);
  const overdue = dealOpen.filter((r) => isOverdueReceivable(r, now));
  const owed = sumMoney(dealOpen.map((r) => r.balanceAmount));
  const payment: DealStep = !dealPosted
    ? { key: "payment", label: "Payment", summary: "—", state: "upcoming", tone: "info" }
    : dealOpen.length === 0
    ? { key: "payment", label: "Payment", summary: "Paid", state: "done", tone: "good" }
    : overdue.length > 0
    ? { key: "payment", label: "Payment", summary: "Overdue", state: "attention", tone: "bad", amount: sumMoney(overdue.map((r) => r.balanceAmount)), href: moneyNext(dealOpen, now)?.href }
    : { key: "payment", label: "Payment", summary: "Due", state: "current", tone: "info", amount: owed };

  return [dealStep, quotation, proforma, order, invoice, payment];
}

export function buildDeals(overview: CustomerOverview, now: Date): Deal[] {
  const deals = overview.opportunities.map((opp): Deal => {
    const trails = overview.quotations
      .filter((q) => q.opportunityId === opp.id)
      .map((q) => trailFor(q, overview, now))
      .sort((a, b) => b.rank - a.rank || +new Date(b.quotation.createdAt) - +new Date(a.quotation.createdAt));
    const primary = trails[0];
    const lost = opp.stage === "LOST";
    let next: NextStep = lost
      ? { kind: "CLOSED", tone: "info", label: "Closed: lost", href: `/opportunities/${opp.id}` }
      : trails.length === 0
      ? { kind: "QUOTE_NEEDED", tone: "action", label: "No quotation yet", href: `/opportunities/${opp.id}` }
      : mostUrgent(trails.map((t) => t.next)) ?? primary.next;
    const open = trails.flatMap((t) => t.openReceivables);
    // The money of the whole deal, not just of the quotation that happens to come first.
    if (next.kind === "OVERDUE" || next.kind === "PAYMENT_DUE") next = moneyNext(open, now) ?? next;
    return {
      opportunity: opp,
      trails,
      primary,
      steps: stepsFor(opp, primary, trails, now),
      next,
      isOpen: OPEN_STAGES.has(opp.stage),
      outstanding: sumMoney(open.map((r) => r.balanceAmount)),
      overdue: sumMoney(open.filter((r) => isOverdueReceivable(r, now)).map((r) => r.balanceAmount)),
    };
  });
  // Most in need first, then the most recent deal.
  return deals.sort((a, b) => TONE_RANK[a.next.tone] - TONE_RANK[b.next.tone] || +new Date(b.opportunity.createdAt) - +new Date(a.opportunity.createdAt));
}

// ---------------------------------------------------------------------------
// The commercial snapshot
// ---------------------------------------------------------------------------

export interface Snapshot {
  /** False for a customer with no linked deal: there is nothing to summarise. */
  hasData: boolean;
  openDeals: number;
  /** Derived: the expected value of the deals still open (Qualified, Proposal, Negotiation). Not a backend figure. */
  pipelineValue: number;
  /** Recorded totals, as the backend computed them. */
  quoted: number;
  ordered: number;
  invoiced: number;
  collected: number;
  outstanding: number;
  counts: { quotations: number; salesOrders: number; invoices: number };
  /** Derived: the part of the outstanding amount whose recorded due date has passed. */
  overdue: number;
  overdueCount: number;
}

export function buildSnapshot(overview: CustomerOverview, now: Date): Snapshot {
  const t = overview.totals;
  const open = overview.opportunities.filter((o) => OPEN_STAGES.has(o.stage));
  const receivables = overview.invoices.filter(isPosted).flatMap((i) => i.receivables);
  const overdue = receivables.filter((r) => isOverdueReceivable(r, now));
  return {
    hasData: overview.opportunities.length > 0,
    openDeals: open.length,
    pipelineValue: sumMoney(open.map((o) => o.expectedValue)),
    quoted: t.approvedQuotationValue,
    ordered: t.orderedValue,
    invoiced: t.invoicedValue,
    collected: t.collectedValue,
    outstanding: t.outstandingValue,
    counts: { quotations: t.counts.quotations, salesOrders: t.counts.salesOrders, invoices: t.counts.invoices },
    overdue: sumMoney(overdue.map((r) => r.balanceAmount)),
    overdueCount: overdue.length,
  };
}

// ---------------------------------------------------------------------------
// What needs attention next
// ---------------------------------------------------------------------------

export type AttentionAction =
  | { type: "dialog"; dialog: "reactivate" | "gstAdd" | "newDeal" }
  | { type: "link-deal"; opportunityId: string; title: string; quotationCount: number }
  | { type: "quote"; opportunityId: string }
  | { type: "open"; href: string };

export interface AttentionItem {
  key: string;
  kind: NextKind | "INACTIVE" | "NO_GST" | "LINK_SUGGESTED" | "NO_DEALS" | "ALL_CLEAR";
  tone: Tone;
  title: string;
  detail?: string;
  cta?: { label: string; action: AttentionAction; enabled: boolean; reason?: string };
}

export interface AttentionContext {
  customer: Pick<Customer, "isActive" | "gstRegistrations">;
  /** null while the overview loads or when it could not be read: only what the customer record itself tells is used. */
  overview: CustomerOverview | null;
  now: Date;
  may: { gstManage: boolean; deactivate: boolean; editOpportunity: boolean; createOpportunity: boolean; createQuotation: boolean };
}

const NO_PERMISSION = {
  gst: "You don't have permission to manage GST registrations.",
  reactivate: "You don't have permission to reactivate customers.",
  link: "You don't have permission to edit opportunities.",
  deal: "You don't have permission to create opportunities.",
  inactive: "Reactivate the customer first.",
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * The ordered list of things this customer needs, most pressing first. The first is
 * the headline of the "Next up" strip and the page's primary action; the rest are
 * secondary. A customer with nothing to do gets a single "all clear" item.
 *
 * Order: by urgency (bad, warn, action, info), and within the same urgency in the
 * order a person would work through them: inactive, no GST registration, a deal that
 * looks like this customer, no deals, then the deals' own steps (overdue money, an
 * expired Proforma, a quotation waiting for approval, an approved quotation without a
 * Proforma, a Proforma waiting for approval, an order to make, an order waiting for
 * approval, a draft invoice, money coming due).
 */
export function buildAttention(ctx: AttentionContext): AttentionItem[] {
  const { customer, overview, now, may } = ctx;
  const items: AttentionItem[] = [];
  const active = customer.isActive;
  const activeGst = customer.gstRegistrations.filter((g) => g.isActive).length;

  if (!active) {
    items.push({
      key: "inactive",
      kind: "INACTIVE",
      tone: "warn",
      title: "This customer is inactive",
      detail: "Everything it already has stays readable, but nothing new can be made for it until it is reactivated.",
      cta: { label: "Reactivate", action: { type: "dialog", dialog: "reactivate" }, enabled: may.deactivate, reason: may.deactivate ? undefined : NO_PERMISSION.reactivate },
    });
  }

  if (active && activeGst === 0) {
    items.push({
      key: "no-gst",
      kind: "NO_GST",
      tone: "action",
      title: "Add a GST registration to start quoting",
      detail: "A quotation needs the buyer's GST registration to work out the tax. The first one added becomes the default.",
      cta: { label: "Add GST registration", action: { type: "dialog", dialog: "gstAdd" }, enabled: may.gstManage, reason: may.gstManage ? undefined : NO_PERMISSION.gst },
    });
  }

  if (overview && overview.legacyMatches.length > 0) {
    const m: CustomerLegacyMatch = overview.legacyMatches[0];
    const more = overview.legacyMatches.length - 1;
    items.push({
      key: `link-${m.id}`,
      kind: "LINK_SUGGESTED",
      tone: "action",
      title: more > 0 ? `${overview.legacyMatches.length} existing deals look like this customer` : "An existing deal looks like this customer",
      detail: `“${m.title}” · lead ${m.leadName} · ${plural(m.quotationCount, "quotation", "quotations")}. Linking it brings its documents and totals here. That is a guess by name, so check first.`,
      cta: {
        label: "Review and link",
        action: { type: "link-deal", opportunityId: m.id, title: m.title, quotationCount: m.quotationCount },
        enabled: active && may.editOpportunity,
        reason: !active ? NO_PERMISSION.inactive : may.editOpportunity ? undefined : NO_PERMISSION.link,
      },
    });
  }

  if (overview && overview.opportunities.length === 0 && overview.legacyMatches.length === 0 && active) {
    items.push({
      key: "no-deals",
      kind: "NO_DEALS",
      tone: "action",
      title: "No deals yet",
      detail: "A quotation is made from an opportunity linked to this customer. Start one from a qualified lead.",
      cta: { label: "New deal", action: { type: "dialog", dialog: "newDeal" }, enabled: may.createOpportunity, reason: may.createOpportunity ? undefined : NO_PERMISSION.deal },
    });
  }

  if (overview) {
    const deals = buildDeals(overview, now);
    const byKind = new Map<NextKind, Array<{ deal: Deal; trail?: QuotationTrail; next: NextStep }>>();
    for (const d of deals) {
      if (d.trails.length === 0) {
        if (d.isOpen) byKind.set("QUOTE_NEEDED", [...(byKind.get("QUOTE_NEEDED") ?? []), { deal: d, next: d.next }]);
        continue;
      }
      for (const t of d.trails) byKind.set(t.next.kind, [...(byKind.get(t.next.kind) ?? []), { deal: d, trail: t, next: t.next }]);
    }
    const take = (kind: NextKind) => byKind.get(kind) ?? [];

    const overdue = take("OVERDUE");
    if (overdue.length) {
      const amount = sumMoney(overdue.map((x) => x.next.amount ?? 0));
      const oldest = [...overdue].sort((a, b) => oldestDue(a.trail) - oldestDue(b.trail))[0];
      const invoices = overdue.reduce((n, x) => n + (x.trail?.openReceivables.filter((r) => isOverdueReceivable(r, now)).length ?? 0), 0);
      const oldestMs = oldestDue(oldest.trail);
      items.push({
        key: "overdue",
        kind: "OVERDUE",
        tone: "bad",
        title: `${formatCompactInr(amount)} overdue on ${plural(invoices, "invoice", "invoices")}`,
        detail: `Oldest due ${shortDate(new Date(oldestMs).toISOString())}. As recorded by FinanceOS; overdue is worked out from the recorded due dates.`,
        cta: oldest.next.href ? { label: "Open oldest invoice", action: { type: "open", href: oldest.next.href }, enabled: true } : undefined,
      });
    }

    const group = (kind: NextKind, tone: Tone, title: (n: number) => string, label: string, detail?: string) => {
      const found = take(kind);
      if (!found.length) return;
      const first = found[0].next;
      items.push({ key: kind.toLowerCase(), kind, tone, title: title(found.length), detail, cta: first.href ? { label, action: { type: "open", href: first.href }, enabled: true } : undefined });
    };

    group("PROFORMA_EXPIRED", "bad", (n) => `${plural(n, "Proforma has", "Proformas have")} expired without an order`, "Open Proforma");
    group("QUOTATION_APPROVAL", "action", (n) => `${plural(n, "quotation is", "quotations are")} waiting for approval`, "Open quotation");
    group("PROFORMA_NEEDED", "action", (n) => `${plural(n, "approved quotation needs", "approved quotations need")} a Proforma Invoice`, "Open quotation");
    group("PROFORMA_APPROVAL", "warn", (n) => `${plural(n, "Proforma is", "Proformas are")} waiting for approval`, "Open Proforma");
    group("ORDER_NEEDED", "action", (n) => `${plural(n, "approved Proforma is", "approved Proformas are")} ready for a Sales Order`, "Open Proforma");
    group("ORDER_APPROVAL", "warn", (n) => `${plural(n, "Sales Order is", "Sales Orders are")} waiting for approval`, "Open Sales Order");
    group("INVOICE_DRAFT", "action", (n) => `${plural(n, "invoice is", "invoices are")} still a draft`, "Open invoice");

    const quoteNeeded = take("QUOTE_NEEDED");
    if (quoteNeeded.length) {
      const d = quoteNeeded[0].deal;
      const canQuote = active && activeGst > 0 && may.createQuotation;
      items.push({
        key: "quote-needed",
        kind: "QUOTE_NEEDED",
        tone: "action",
        title: quoteNeeded.length === 1 ? `“${d.opportunity.title}” has no quotation yet` : `${quoteNeeded.length} deals have no quotation yet`,
        cta: { label: "New quotation", action: { type: "quote", opportunityId: d.opportunity.id }, enabled: canQuote, reason: !active ? NO_PERMISSION.inactive : activeGst === 0 ? "Add a GST registration first." : may.createQuotation ? undefined : "You don't have permission to create quotations." },
      });
    }

    const due = take("PAYMENT_DUE");
    if (due.length) {
      const amount = sumMoney(due.map((x) => x.next.amount ?? 0));
      items.push({ key: "payment-due", kind: "PAYMENT_DUE", tone: "info", title: `${formatCompactInr(amount)} coming due`, detail: due[0].next.label, cta: due[0].next.href ? { label: "Open invoice", action: { type: "open", href: due[0].next.href }, enabled: true } : undefined });
    }
  }

  const rank = (i: AttentionItem) => TONE_RANK[i.tone];
  // Stable: items of the same tone keep the order they were added in.
  const ordered = items.map((item, index) => ({ item, index })).sort((a, b) => rank(a.item) - rank(b.item) || a.index - b.index).map((x) => x.item);

  if (ordered.length === 0) {
    return [{ key: "all-clear", kind: "ALL_CLEAR", tone: "good", title: "Nothing needs attention", detail: overview && overview.opportunities.length ? "Every deal is moving and nothing is overdue." : undefined }];
  }
  return ordered;
}

function oldestDue(trail: QuotationTrail | undefined): number {
  if (!trail) return Infinity;
  const due = trail.openReceivables.map((r) => +new Date(r.dueDate));
  return due.length ? Math.min(...due) : Infinity;
}

/** The action the page puts first: the headline's call to action when it can be done, otherwise nothing. */
export function primaryAction(items: AttentionItem[]): AttentionItem["cta"] | undefined {
  const first = items[0];
  return first?.cta && first.cta.enabled ? first.cta : undefined;
}

// ---------------------------------------------------------------------------
// History filters
// ---------------------------------------------------------------------------

export type HistoryFilter = "all" | "status" | "details" | "gst" | "deals";

export const HISTORY_FILTER_LABEL: Record<HistoryFilter, string> = {
  all: "All",
  status: "Status",
  details: "Details",
  gst: "GST",
  deals: "Deals",
};

export function customerEventCategory(action: string): Exclude<HistoryFilter, "all"> {
  if (action === "CUSTOMER_UPDATED") return "details";
  if (action.startsWith("GST_")) return "gst";
  if (action.startsWith("OPPORTUNITY_")) return "deals";
  return "status"; // created, deactivated, reactivated
}

/** The filters that have something in them, with how many events each holds ("All" first). */
export function historyFilterCounts(events: Pick<CustomerEvent, "action">[]): Array<{ filter: HistoryFilter; count: number }> {
  const counts: Record<HistoryFilter, number> = { all: events.length, status: 0, details: 0, gst: 0, deals: 0 };
  for (const e of events) counts[customerEventCategory(e.action)] += 1;
  return (Object.keys(counts) as HistoryFilter[]).filter((f) => f === "all" || counts[f] > 0).map((f) => ({ filter: f, count: counts[f] }));
}

export function filterCustomerEvents<T extends Pick<CustomerEvent, "action">>(events: T[], filter: HistoryFilter): T[] {
  return filter === "all" ? events : events.filter((e) => customerEventCategory(e.action) === filter);
}
