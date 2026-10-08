import type { ActionState } from "./quotationLifecycle";
import { RECEIVABLE_STATUS, formatRupees, fromPaise, toPaise } from "./paymentCollection";
import type { AccountsReceivable, Opportunity, PaymentCollectionRecord, SalesInvoice } from "../../types/domain";

/**
 * Collections: how receivables are read, grouped and explained, written once.
 *
 * Source-of-truth chain: the customer comes from the deal's governed link
 * (Opportunity.customer) -> the invoice and its receivable (FinanceOS records,
 * shown as recorded) -> the payment collections and their events (RevenueOS) ->
 * FinanceOS accounting / the general ledger (never read or restated here).
 * Nothing in this file infers a customer from a name.
 *
 * Presentation only: nothing here changes what a receivable is, and nothing
 * invents credit terms. A receivable's due date is whatever FinanceOS holds.
 */

// ---------------------------------------------------------------------------
// Dates: one time zone, whole calendar days
// ---------------------------------------------------------------------------

/**
 * Due dates and payment dates are dates, not moments: they are stored as midnight UTC
 * of the calendar day they name, so the day is read straight from the stored value.
 * "Today" is today's date in the business's time zone, so a person in India sees the
 * same day the whole product does whatever the machine's own zone is.
 */
export const COLLECTIONS_TIME_ZONE = "Asia/Kolkata";

/** The calendar day a stored date names: "2026-09-21". */
export const dateKeyOf = (iso: string): string => iso.slice(0, 10);

/** Today's calendar day in the business time zone: "2026-10-08". */
export function todayKey(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: COLLECTIONS_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

const keyToUtc = (key: string) => Date.UTC(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, Number(key.slice(8, 10)));

/** Whole calendar days from one day to another (negative when `to` is before `from`). */
export const daysBetween = (fromKey: string, toKey: string): number => Math.round((keyToUtc(toKey) - keyToUtc(fromKey)) / 86_400_000);

/** Whole days until a due date: 0 on the day, negative once it has passed. */
export const daysUntil = (dueDate: string, now: Date): number => daysBetween(todayKey(now), dateKeyOf(dueDate));

export const shiftKey = (key: string, days: number): string => new Date(keyToUtc(key) + days * 86_400_000).toISOString().slice(0, 10);

/** "08 Oct 2026" for a stored date, in the same calendar the rest of the page uses. */
export function formatDay(iso: string): string {
  const key = dateKeyOf(iso);
  return new Date(keyToUtc(key)).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

// ---------------------------------------------------------------------------
// The state of a receivable
// ---------------------------------------------------------------------------

/** "Due soon" reaches this many days ahead: the same threshold the backend's collection reminders use. */
export const DUE_SOON_DAYS = 3;
/** How many payments the workspace asks for (the backend's cap). Collected-in-30-days says so when this could cut it short. */
export const COLLECTIONS_FETCH_LIMIT = 500;

export type CollectionState = "WRITTEN_OFF" | "PAID" | "OVERDUE" | "DUE_TODAY" | "DUE_SOON" | "NOT_YET_DUE";

/** Strongest first: a receivable is in the first of these it qualifies for. */
export const COLLECTION_STATE_PRECEDENCE: readonly CollectionState[] = ["WRITTEN_OFF", "PAID", "OVERDUE", "DUE_TODAY", "DUE_SOON", "NOT_YET_DUE"];

export const isOpenState = (s: CollectionState) => s === "OVERDUE" || s === "DUE_TODAY" || s === "DUE_SOON" || s === "NOT_YET_DUE";

export const COLLECTION_STATE_LABEL: Record<CollectionState, string> = {
  WRITTEN_OFF: "Written off",
  PAID: "Paid",
  OVERDUE: "Overdue",
  DUE_TODAY: "Due today",
  DUE_SOON: "Due soon",
  NOT_YET_DUE: "Not yet due",
};

type ReceivableFigures = Pick<AccountsReceivable, "paymentStatus" | "balanceAmount" | "dueDate">;

/**
 * WRITTEN_OFF, then PAID, then by the due date. PAID is the recorded status, or nothing
 * left outstanding (a receivable that still says PENDING or PARTIAL with no balance is
 * settled as far as collecting goes, and is flagged separately as inconsistent).
 */
export function collectionState(r: ReceivableFigures, now: Date): CollectionState {
  if (r.paymentStatus === RECEIVABLE_STATUS.WRITTEN_OFF) return "WRITTEN_OFF";
  if (r.paymentStatus === RECEIVABLE_STATUS.PAID || toPaise(r.balanceAmount) <= 0) return "PAID";
  const days = daysUntil(r.dueDate, now);
  if (days < 0) return "OVERDUE";
  if (days === 0) return "DUE_TODAY";
  if (days <= DUE_SOON_DAYS) return "DUE_SOON";
  return "NOT_YET_DUE";
}

/** "84 days overdue", "Due today", "Due in 2 days", "Due in 3 weeks". Empty for a closed receivable. */
export function dueWording(state: CollectionState, days: number): string {
  if (state === "OVERDUE") return days === -1 ? "1 day overdue" : `${-days} days overdue`;
  if (state === "DUE_TODAY") return "Due today";
  if (state === "DUE_SOON" || state === "NOT_YET_DUE") return days === 1 ? "Due tomorrow" : `Due in ${days} days`;
  return "";
}

/** The only thing the page needs to know about a customer to name it. */
export interface CollectionCustomer {
  id: string;
  customerCode: string;
  customerName: string;
  isActive: boolean;
}

// ---------------------------------------------------------------------------
// Whose receivable it is: the governed link only
// ---------------------------------------------------------------------------

export type CustomerIdentity =
  /** The deal the invoice came from is linked to this customer. */
  | { kind: "linked"; customer: CollectionCustomer; opportunityId: string }
  /** The deal was read and has no customer linked to it. */
  | { kind: "unlinked"; opportunityId: string }
  /** Who the customer is cannot be said: the deal is missing, or the deals could not be read. */
  | { kind: "unknown"; reason: "deals-unavailable" | "deal-not-found" | "no-deal" };

export function identityOf(
  invoice: Pick<SalesInvoice, "opportunityId"> | undefined,
  opportunities: Array<Pick<Opportunity, "id" | "customer">> | null
): CustomerIdentity {
  if (opportunities === null) return { kind: "unknown", reason: "deals-unavailable" };
  if (!invoice || !invoice.opportunityId) return { kind: "unknown", reason: "no-deal" };
  const opp = opportunities.find((o) => o.id === invoice.opportunityId);
  if (!opp) return { kind: "unknown", reason: "deal-not-found" };
  return opp.customer ? { kind: "linked", customer: opp.customer, opportunityId: opp.id } : { kind: "unlinked", opportunityId: opp.id };
}

// ---------------------------------------------------------------------------
// What is wrong with a receivable's records (and what is not)
// ---------------------------------------------------------------------------

export type AnomalyKey = "NEGATIVE_BALANCE" | "PAID_MISMATCH" | "BALANCE_MISMATCH" | "STATUS_CONFLICT" | "UNKNOWN_STATUS" | "INVOICE_NOT_POSTED" | "NO_CUSTOMER_NAME";

export interface Anomaly {
  key: AnomalyKey;
  label: string;
  detail: string;
}

const KNOWN_STATUSES: readonly string[] = Object.values(RECEIVABLE_STATUS);
const near = (a: number, b: number) => Math.abs(toPaise(a) - toPaise(b)) === 0;

/**
 * The ways a receivable's own figures disagree with themselves, with the invoice, or
 * with the payment records. A written-off receivable is NOT one of them: it is a
 * state, and a write-off legitimately moves the balance without a payment, so the
 * balance rule is not applied to it. `collected` is the sum of the payment records
 * for this receivable, or null when they could not be read completely (then the
 * payment check is skipped rather than guessed).
 */
export function receivableAnomalies(args: {
  receivable: Pick<AccountsReceivable, "paymentStatus" | "outstandingAmount" | "paidAmount" | "balanceAmount" | "dueDate">;
  invoice: { status: string; customerName?: string | null } | undefined;
  collected: number | null;
}): Anomaly[] {
  const { receivable: r, invoice, collected } = args;
  const out: Anomaly[] = [];
  const written = r.paymentStatus === RECEIVABLE_STATUS.WRITTEN_OFF;
  const status = r.paymentStatus;

  if (!KNOWN_STATUSES.includes(status)) out.push({ key: "UNKNOWN_STATUS", label: "Unrecognised status", detail: `Finance holds the status "${status}", which this screen does not know.` });
  if (toPaise(r.balanceAmount) < 0) out.push({ key: "NEGATIVE_BALANCE", label: "Negative balance", detail: `The balance is ${formatRupees(toPaise(r.balanceAmount)).replace("₹-", "−₹")}: more is recorded as paid or written off than was owed.` });
  if ((status === RECEIVABLE_STATUS.PENDING || status === RECEIVABLE_STATUS.PARTIAL) && toPaise(r.balanceAmount) <= 0) out.push({ key: "STATUS_CONFLICT", label: "Status disagrees with balance", detail: `It says ${status.toLowerCase()}, but nothing is outstanding.` });
  if (status === RECEIVABLE_STATUS.PAID && toPaise(r.balanceAmount) > 0) out.push({ key: "STATUS_CONFLICT", label: "Status disagrees with balance", detail: `It says paid, but ${formatRupees(toPaise(r.balanceAmount))} is still outstanding.` });
  if (!written && !near(r.outstandingAmount - r.paidAmount, r.balanceAmount)) out.push({ key: "BALANCE_MISMATCH", label: "Balance does not add up", detail: `Invoiced ${formatRupees(toPaise(r.outstandingAmount))} less paid ${formatRupees(toPaise(r.paidAmount))} is not the ${formatRupees(toPaise(r.balanceAmount))} balance.` });
  if (collected !== null && !near(r.paidAmount, collected)) out.push({ key: "PAID_MISMATCH", label: "Paid does not match payments", detail: `The receivable says ${formatRupees(toPaise(r.paidAmount))} paid; its payment records add up to ${formatRupees(toPaise(collected))}.` });
  if (invoice && invoice.status !== "POSTED") out.push({ key: "INVOICE_NOT_POSTED", label: "Invoice not posted", detail: "The invoice is still a draft." });
  if (invoice && (invoice.customerName == null || invoice.customerName.trim() === "") && !written && toPaise(r.balanceAmount) > 0) {
    out.push({ key: "NO_CUSTOMER_NAME", label: "Invoice has no customer name", detail: "A payment cannot be posted to the customer ledger until Finance fixes the invoice." });
  }
  // One of each: the same key twice would only repeat itself.
  return out.filter((a, i) => out.findIndex((b) => b.key === a.key) === i);
}

// ---------------------------------------------------------------------------
// The worklist
// ---------------------------------------------------------------------------

export interface CollectionRow {
  /** The receivable's id. */
  id: string;
  salesInvoiceId: string;
  invoiceNumber: string;
  invoiceDate?: string;
  invoiceStatus?: string;
  /** What is written on the invoice. Free text from FinanceOS, shown as "Name on invoice", never used to decide who the customer is. */
  invoiceCustomerName?: string;
  identity: CustomerIdentity;
  dueDate: string;
  daysUntilDue: number;
  /** Finance's due date is the invoice's own date: credit terms are not reflected in it. */
  dueIsInvoiceDate: boolean;
  invoiced: number;
  paid: number;
  balance: number;
  paymentStatus: string;
  state: CollectionState;
  anomalies: Anomaly[];
  /** An anomaly in its records, or no customer linked to its deal. */
  needsReview: boolean;
  lastPaymentDate?: string;
}

const documentNumber = (id: string, code?: string | null) => code || `#${id.slice(0, 8).toUpperCase()}`;

export function buildCollectionRows(args: {
  receivables: AccountsReceivable[];
  invoices: SalesInvoice[];
  /** null when the deals could not be read: nobody is then called "unlinked". */
  opportunities: Array<Pick<Opportunity, "id" | "customer">> | null;
  /** null when the payment records could not be read, or may be cut short by the backend's cap. */
  collections: PaymentCollectionRecord[] | null;
  now: Date;
}): CollectionRow[] {
  const { receivables, invoices, opportunities, collections, now } = args;
  const byInvoice = new Map(invoices.map((i) => [i.id, i]));
  const byReceivable = new Map<string, PaymentCollectionRecord[]>();
  for (const c of collections ?? []) byReceivable.set(c.accountsReceivableId, [...(byReceivable.get(c.accountsReceivableId) ?? []), c]);

  return receivables.map((ar): CollectionRow => {
    const invoice = byInvoice.get(ar.salesInvoiceId);
    const own = byReceivable.get(ar.id) ?? [];
    const collected = collections === null ? null : own.reduce((s, c) => s + toPaise(c.amount), 0) / 100;
    const identity = identityOf(invoice, opportunities);
    const anomalies = receivableAnomalies({ receivable: ar, invoice: invoice ? { status: invoice.status, customerName: invoice.customerName } : undefined, collected });
    const last = own.map((c) => c.paymentDate).sort((a, b) => (dateKeyOf(a) < dateKeyOf(b) ? 1 : -1))[0];
    const state = collectionState(ar, now);
    return {
      id: ar.id,
      salesInvoiceId: ar.salesInvoiceId,
      invoiceNumber: ar.invoiceNumber ?? documentNumber(ar.salesInvoiceId, invoice?.invoiceNumber),
      invoiceDate: invoice?.invoiceDate,
      invoiceStatus: invoice?.status,
      invoiceCustomerName: (invoice?.customerName ?? ar.customerName) || undefined,
      identity,
      dueDate: ar.dueDate,
      daysUntilDue: daysUntil(ar.dueDate, now),
      dueIsInvoiceDate: !!invoice?.invoiceDate && dateKeyOf(invoice.invoiceDate) === dateKeyOf(ar.dueDate),
      invoiced: ar.outstandingAmount,
      paid: ar.paidAmount,
      balance: ar.balanceAmount,
      paymentStatus: ar.paymentStatus,
      state,
      anomalies,
      needsReview: anomalies.length > 0 || identity.kind === "unlinked" || (identity.kind === "unknown" && identity.reason !== "deals-unavailable"),
      lastPaymentDate: last,
    };
  });
}

export type CollectionView = "TO_COLLECT" | "OVERDUE" | "DUE_SOON" | "NOT_YET_DUE" | "PAID" | "WRITTEN_OFF" | "NEEDS_REVIEW";

export const COLLECTION_VIEW_LABEL: Record<CollectionView, string> = {
  TO_COLLECT: "To collect",
  OVERDUE: "Overdue",
  DUE_SOON: "Due soon",
  NOT_YET_DUE: "Not yet due",
  PAID: "Paid",
  WRITTEN_OFF: "Written off",
  NEEDS_REVIEW: "Needs review",
};

export const COLLECTION_VIEW_ORDER: readonly CollectionView[] = ["TO_COLLECT", "OVERDUE", "DUE_SOON", "NOT_YET_DUE", "PAID", "WRITTEN_OFF", "NEEDS_REVIEW"];

export function inView(row: CollectionRow, view: CollectionView): boolean {
  switch (view) {
    case "TO_COLLECT":
      return isOpenState(row.state);
    case "OVERDUE":
      return row.state === "OVERDUE";
    case "DUE_SOON":
      return row.state === "DUE_TODAY" || row.state === "DUE_SOON";
    case "NOT_YET_DUE":
      return row.state === "NOT_YET_DUE";
    case "PAID":
      return row.state === "PAID";
    case "WRITTEN_OFF":
      return row.state === "WRITTEN_OFF";
    case "NEEDS_REVIEW":
      return row.needsReview;
  }
}

export const viewCounts = (rows: CollectionRow[]): Record<CollectionView, number> =>
  Object.fromEntries(COLLECTION_VIEW_ORDER.map((v) => [v, rows.filter((r) => inView(r, v)).length])) as Record<CollectionView, number>;

export const customerLabel = (identity: CustomerIdentity): string => (identity.kind === "linked" ? identity.customer.customerName : "");

/** What a search matches: the receivable's invoice, and the governed customer's name and code. The name on the invoice is deliberately not searched as if it were the customer. */
export function matchesSearch(row: CollectionRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (q === "") return true;
  const hay = [row.invoiceNumber, row.identity.kind === "linked" ? row.identity.customer.customerName : "", row.identity.kind === "linked" ? row.identity.customer.customerCode : "", row.invoiceCustomerName ?? ""];
  return hay.some((h) => h.toLowerCase().includes(q));
}

export type CollectionSort = "DUE" | "BALANCE" | "CUSTOMER";

export const COLLECTION_SORT_LABEL: Record<CollectionSort, string> = { DUE: "Oldest due first", BALANCE: "Largest balance first", CUSTOMER: "Customer A to Z" };

export function sortRows(rows: CollectionRow[], sort: CollectionSort): CollectionRow[] {
  const byDue = (a: CollectionRow, b: CollectionRow) => a.daysUntilDue - b.daysUntilDue || b.balance - a.balance || a.invoiceNumber.localeCompare(b.invoiceNumber);
  const name = (r: CollectionRow) => (r.identity.kind === "linked" ? r.identity.customer.customerName : r.invoiceCustomerName ?? "");
  const cmp =
    sort === "BALANCE"
      ? (a: CollectionRow, b: CollectionRow) => b.balance - a.balance || byDue(a, b)
      : sort === "CUSTOMER"
      ? (a: CollectionRow, b: CollectionRow) => name(a).localeCompare(name(b)) || byDue(a, b)
      : byDue;
  return [...rows].sort(cmp);
}

export interface CollectionGroup {
  key: string;
  kind: "customer" | "unlinked" | "unknown";
  customer?: CollectionCustomer;
  rows: CollectionRow[];
  /** What is still to collect in this group (open receivables only). */
  balance: number;
  overdue: number;
  overdueCount: number;
}

const sumPaise = (values: number[]) => values.reduce((s, v) => s + toPaise(v), 0) / 100;

/** Governed customers first (the most overdue first), then deals with no customer, then receivables whose customer cannot be said. */
export function groupRows(rows: CollectionRow[], sort: CollectionSort): CollectionGroup[] {
  const make = (key: string, kind: CollectionGroup["kind"], list: CollectionRow[], customer?: CollectionCustomer): CollectionGroup => {
    const open = list.filter((r) => isOpenState(r.state));
    const over = open.filter((r) => r.state === "OVERDUE");
    return { key, kind, customer, rows: sortRows(list, sort), balance: sumPaise(open.map((r) => r.balance)), overdue: sumPaise(over.map((r) => r.balance)), overdueCount: over.length };
  };
  const linked = new Map<string, { customer: CollectionCustomer; rows: CollectionRow[] }>();
  const unlinked: CollectionRow[] = [];
  const unknown: CollectionRow[] = [];
  for (const r of rows) {
    if (r.identity.kind === "linked") {
      const g = linked.get(r.identity.customer.id) ?? { customer: r.identity.customer, rows: [] };
      g.rows.push(r);
      linked.set(r.identity.customer.id, g);
    } else if (r.identity.kind === "unlinked") unlinked.push(r);
    else unknown.push(r);
  }
  const customers = [...linked.values()].map((g) => make(`customer:${g.customer.id}`, "customer", g.rows, g.customer));
  customers.sort((a, b) => b.overdue - a.overdue || b.balance - a.balance || (a.customer?.customerName ?? "").localeCompare(b.customer?.customerName ?? ""));
  return [...customers, ...(unlinked.length ? [make("unlinked", "unlinked", unlinked)] : []), ...(unknown.length ? [make("unknown", "unknown", unknown)] : [])];
}

// ---------------------------------------------------------------------------
// The summary
// ---------------------------------------------------------------------------

export interface CollectedWindow {
  /** The sum of the payment amounts dated in the window. */
  amount: number;
  /** First and last day of the window, "2026-09-09" and "2026-10-08". */
  from: string;
  to: string;
  /** False when the payments asked for hit the backend's cap inside the window: the figure may be short. */
  complete: boolean;
  count: number;
}

export const COLLECTED_WINDOW_DAYS = 30;

/** The sum of PaymentCollection amounts by payment date over the 30 calendar days ending today (today and the 29 before it). null when the payments could not be read. */
export function collectedLast30Days(collections: PaymentCollectionRecord[] | null, now: Date, limit = COLLECTIONS_FETCH_LIMIT): CollectedWindow | null {
  if (collections === null) return null;
  const to = todayKey(now);
  const from = shiftKey(to, -(COLLECTED_WINDOW_DAYS - 1));
  const inside = collections.filter((c) => dateKeyOf(c.paymentDate) >= from && dateKeyOf(c.paymentDate) <= to);
  // Newest payment date first and capped: it is short only if the oldest payment it got is still inside the window.
  const oldest = collections.map((c) => dateKeyOf(c.paymentDate)).sort()[0];
  const complete = !(collections.length >= limit && oldest !== undefined && oldest >= from);
  return { amount: sumPaise(inside.map((c) => c.amount)), from, to, complete, count: inside.length };
}

export interface CollectionsSummary {
  openBalance: number;
  openCount: number;
  overdue: number;
  overdueCount: number;
  dueSoon: number;
  dueSoonCount: number;
  notYetDue: number;
  needsReview: number;
  collected: CollectedWindow | null;
}

export function summarize(rows: CollectionRow[], collected: CollectedWindow | null): CollectionsSummary {
  const open = rows.filter((r) => isOpenState(r.state));
  const pick = (f: (r: CollectionRow) => boolean) => open.filter(f);
  const over = pick((r) => r.state === "OVERDUE");
  const soon = pick((r) => r.state === "DUE_TODAY" || r.state === "DUE_SOON");
  const later = pick((r) => r.state === "NOT_YET_DUE");
  return {
    openBalance: sumPaise(open.map((r) => r.balance)),
    openCount: open.length,
    overdue: sumPaise(over.map((r) => r.balance)),
    overdueCount: over.length,
    dueSoon: sumPaise(soon.map((r) => r.balance)),
    dueSoonCount: soon.length,
    notYetDue: sumPaise(later.map((r) => r.balance)),
    needsReview: rows.filter((r) => r.needsReview).length,
    collected,
  };
}

// ---------------------------------------------------------------------------
// What a person may do, and why not
// ---------------------------------------------------------------------------

const yes: ActionState = { enabled: true };
const no = (reason: string): ActionState => ({ enabled: false, reason });

export interface CollectionActions {
  recordPayment: ActionState;
  generateReceipt: ActionState;
}

/**
 * The same order the backend checks in, so the reason shown is the one the backend would
 * give. The permission is the UI's courtesy; the backend still decides.
 */
export function collectionActions(ctx: {
  may: { view: boolean; record: boolean };
  row: Pick<CollectionRow, "state" | "invoiceStatus" | "invoiceCustomerName" | "paymentStatus" | "balance">;
}): CollectionActions {
  const { may, row } = ctx;
  const recordPayment: ActionState = !may.record
    ? no("You don't have permission to record payments.")
    : row.invoiceStatus !== undefined && row.invoiceStatus !== "POSTED"
    ? no("The invoice isn't posted yet.")
    : row.state === "WRITTEN_OFF"
    ? no("This receivable was written off in Finance.")
    : row.state === "PAID"
    ? no("This invoice is already fully paid.")
    : !KNOWN_STATUSES.includes(row.paymentStatus)
    ? no("Finance holds a status this screen doesn't recognise.")
    : row.invoiceCustomerName === undefined || row.invoiceCustomerName.trim() === ""
    ? no("The invoice has no customer name, so a payment can't be posted to the ledger. Finance needs to fix the invoice first.")
    : yes;
  return { recordPayment, generateReceipt: may.record ? yes : no("You don't have permission to generate receipts.") };
}

/** Where the payment will leave the receivable, for the dialog's live preview. */
export function previewPayment(balance: number, amountText: string): { valid: boolean; amount?: number; balanceAfter?: number; statusAfter?: "PAID" | "PARTIAL"; over: boolean } {
  const trimmed = amountText.trim();
  const amount = trimmed === "" ? NaN : Number(trimmed);
  if (!Number.isFinite(amount) || amount < 0.01 || Math.round(amount * 100) / 100 !== amount) return { valid: false, over: false };
  const afterPaise = toPaise(balance) - toPaise(amount);
  if (afterPaise < 0) return { valid: false, amount, over: true };
  return { valid: true, amount, balanceAfter: fromPaise(afterPaise), statusAfter: afterPaise === 0 ? "PAID" : "PARTIAL", over: false };
}

// ---------------------------------------------------------------------------
// The customer's Collections Statement
// ---------------------------------------------------------------------------

export interface StatementInvoice {
  invoiceId: string;
  invoiceNumber: string;
  invoiceDate: string;
  receivableId?: string;
  dueDate?: string;
  invoiced: number;
  paid: number;
  balance: number;
  state?: CollectionState;
  anomalies: Anomaly[];
  /** The payments recorded against it, newest first; null when they could not be read. */
  payments: PaymentCollectionRecord[] | null;
}

export interface CollectionsStatement {
  invoices: StatementInvoice[];
  totals: { invoiced: number; collected: number; outstanding: number; overdue: number; overdueCount: number; writtenOff: number };
  /** The statement is complete only when every invoice's payments were read. */
  paymentsComplete: boolean;
  asOf: string;
}

/**
 * A customer's receivables as RevenueOS records them: each posted invoice, its receivable, and the
 * payments collected against it. It is NOT an accounting statement: it does not read the
 * FinanceOS ledger or the general ledger, and a credit or debit note shows only as a change
 * to the receivable's figures. Totals are sums of the receivables (the receivable is the
 * authority), never recomputed from the payments.
 */
export function buildCollectionsStatement(args: {
  invoices: Array<{ id: string; invoiceNumber?: string; invoiceDate: string; status: string; receivables: Array<Pick<AccountsReceivable, "id" | "dueDate" | "outstandingAmount" | "paidAmount" | "balanceAmount" | "paymentStatus">> }>;
  /** Keyed by invoice id. A missing key or null means "not read". */
  payments: Record<string, PaymentCollectionRecord[] | null | undefined>;
  now: Date;
}): CollectionsStatement {
  const { invoices, payments, now } = args;
  const rows: StatementInvoice[] = [];
  for (const inv of invoices.filter((i) => i.status === "POSTED")) {
    const r = inv.receivables[0];
    const paid = payments[inv.id] ?? null;
    const collected = paid === null ? null : sumPaise(paid.map((p) => p.amount));
    rows.push({
      invoiceId: inv.id,
      invoiceNumber: documentNumber(inv.id, inv.invoiceNumber),
      invoiceDate: inv.invoiceDate,
      receivableId: r?.id,
      dueDate: r?.dueDate,
      invoiced: r?.outstandingAmount ?? 0,
      paid: r?.paidAmount ?? 0,
      balance: r?.balanceAmount ?? 0,
      state: r ? collectionState(r, now) : undefined,
      anomalies: r ? receivableAnomalies({ receivable: r, invoice: { status: inv.status, customerName: "-" }, collected }) : [],
      payments: paid === null ? null : [...paid].sort((a, b) => (dateKeyOf(a.paymentDate) < dateKeyOf(b.paymentDate) ? 1 : dateKeyOf(a.paymentDate) > dateKeyOf(b.paymentDate) ? -1 : a.createdAt < b.createdAt ? 1 : -1)),
    });
  }
  rows.sort((a, b) => (dateKeyOf(a.invoiceDate) < dateKeyOf(b.invoiceDate) ? -1 : 1));
  const open = rows.filter((r) => r.state && isOpenState(r.state));
  const over = open.filter((r) => r.state === "OVERDUE");
  return {
    invoices: rows,
    totals: {
      invoiced: sumPaise(rows.map((r) => r.invoiced)),
      collected: sumPaise(rows.map((r) => r.paid)),
      outstanding: sumPaise(open.map((r) => r.balance)),
      overdue: sumPaise(over.map((r) => r.balance)),
      overdueCount: over.length,
      writtenOff: rows.filter((r) => r.state === "WRITTEN_OFF").length,
    },
    paymentsComplete: rows.every((r) => r.payments !== null),
    asOf: todayKey(now),
  };
}

/** The words that must sit with the statement, so nobody takes it for an accounting statement. */
export const COLLECTIONS_STATEMENT_NOTE =
  "Built from RevenueOS receivables and payment collections. It is not a FinanceOS or general-ledger accounting statement: it does not read the ledger, and a credit or debit note appears only as a change to a receivable's figures.";

/** The wording kept next to due dates, wherever they matter. */
export const DUE_DATE_DISCLOSURE =
  "Due dates come from Finance. They are currently set to each invoice's own date, so credit terms are not reflected, and open invoices can show as overdue sooner than the terms agreed with the customer would say. Collections shows them as recorded and does not work out terms of its own.";

/** One line naming whose receivable it is, for dialogs and receipts: the governed customer, or exactly what is known. */
export function customerDescription(identity: CustomerIdentity, invoiceCustomerName?: string): string {
  if (identity.kind === "linked") return `${identity.customer.customerName} (${identity.customer.customerCode})`;
  const onInvoice = invoiceCustomerName ? `Name on invoice: ${invoiceCustomerName} (not verified)` : "No customer name";
  return identity.kind === "unlinked" ? `Not linked to a customer. ${onInvoice}` : `Customer unknown. ${onInvoice}`;
}
