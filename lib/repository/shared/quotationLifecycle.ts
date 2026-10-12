import { Quotation, formatQuotationStatus } from "../../types/domain";

/**
 * Quotation lifecycle, mirroring the backend (backend commit 1246647,
 * quotation-lifecycle.ts). The backend is the authority and re-checks every
 * action; these rules let the UI offer the right actions, explain the ones it
 * cannot offer, and let the mock behave the same way.
 *
 *   DRAFT -> REVISED | APPROVED | REJECTED
 *   REVISED -> REVISED | APPROVED | REJECTED
 *   APPROVED -> REVISED   (only while nothing has been built on it)
 *
 * REVISED means the amount changed and the quotation needs (re-)approval. An
 * APPROVED quotation is commercially locked: it can go back to REVISED only
 * while it has no active Proforma Invoice and no Sales Order that is not
 * cancelled. REJECTED is final.
 */
export const QUOTATION_LIFECYCLE_STATUS = {
  DRAFT: "DRAFT",
  REVISED: "REVISED",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;

export const QUOTATION_TRANSITIONS: Record<string, readonly string[]> = {
  DRAFT: ["REVISED", "APPROVED", "REJECTED"],
  REVISED: ["REVISED", "APPROVED", "REJECTED"],
  APPROVED: ["REVISED"],
};

export function isQuotationTransitionAllowed(from: string, to: string): boolean {
  return (QUOTATION_TRANSITIONS[from] ?? []).includes(to);
}

/** The permission codes of the Quotation family (backend: 20261007_crm_quotation_permissions.sql). */
export const QUOTATION_PERMISSIONS = {
  view: "quotations.view",
  create: "quotations.create",
  edit: "quotations.edit",
  approve: "quotations.approve",
  reject: "quotations.reject",
} as const;

export const QUOTATION_REMARKS_MAX_LENGTH = 500;
export const QUOTATION_REASON_MAX_LENGTH = 500;
/** The backend refuses a larger taxable amount than this. */
export const QUOTATION_MAX_TAXABLE_AMOUNT = 1_000_000_000_000;
/** The backend compares stored amounts to within a paisa. */
export const QUOTATION_AMOUNT_TOLERANCE = 0.01;

// ---------------------------------------------------------------------------
// Amounts. The backend is authoritative: a revision sends only the taxable
// amount and the backend recomputes GST (from the percentage the quotation
// already carries) and the total. These helpers exist to PREVIEW that result
// and to let the mock behave the same way; they never replace what the backend
// returns.
// ---------------------------------------------------------------------------

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function computeQuotationAmounts(taxableAmount: number, gstPercent: number) {
  const taxable = roundMoney(taxableAmount);
  const gstAmount = roundMoney((taxable * gstPercent) / 100);
  return { taxableAmount: taxable, gstAmount, totalAmount: roundMoney(taxable + gstAmount) };
}

interface Amounts {
  taxableAmount: number;
  gstPercent: number;
  gstAmount: number;
  totalAmount: number;
}

/**
 * The stored amounts hang together: taxable + GST is the total, GST is the stated
 * percentage of the taxable amount, and there is something to sell. Quotations
 * created through the API always satisfy this. Some that predate the lifecycle do
 * not (their tax breakdown was never stored, or an old revision changed the total
 * alone); they are left exactly as they are and can be neither revised nor
 * approved, because the backend cannot say what their tax should be.
 */
export function hasConsistentTaxBreakdown(q: Amounts): boolean {
  const near = (a: number, b: number) => Math.abs(a - b) <= QUOTATION_AMOUNT_TOLERANCE;
  return (
    [q.taxableAmount, q.gstPercent, q.gstAmount, q.totalAmount].every(Number.isFinite) &&
    q.taxableAmount > 0 &&
    near(q.taxableAmount + q.gstAmount, q.totalAmount) &&
    near((q.taxableAmount * q.gstPercent) / 100, q.gstAmount)
  );
}

/** The amounts a quotation carries, with anything missing treated as 0 (a legacy row). */
export function quotationAmounts(q: Pick<Quotation, "taxableAmount" | "gstPercent" | "gstAmount" | "totalAmount" | "amount">): Amounts {
  return {
    taxableAmount: q.taxableAmount ?? 0,
    gstPercent: q.gstPercent ?? 0,
    gstAmount: q.gstAmount ?? 0,
    totalAmount: q.totalAmount ?? q.amount,
  };
}

/** True for a quotation whose stored tax breakdown does not add up (a legacy row the backend will not revise or approve). */
export function isLegacyTaxBreakdown(q: Pick<Quotation, "taxableAmount" | "gstPercent" | "gstAmount" | "totalAmount" | "amount">): boolean {
  return !hasConsistentTaxBreakdown(quotationAmounts(q));
}

/** Checks a typed taxable amount the way the backend DTO does; returns the number or a message. */
export function parseTaxableAmount(input: string): { value: number; error?: undefined } | { value?: undefined; error: string } {
  const text = input.trim();
  if (!text) return { error: "Enter the new taxable amount." };
  const value = Number(text);
  if (!Number.isFinite(value)) return { error: "Enter a valid number." };
  if (value <= 0) return { error: "The taxable amount must be greater than 0." };
  if (Math.round(value * 100) / 100 !== value && Math.abs(value * 100 - Math.round(value * 100)) > 1e-6) {
    return { error: "Use at most two decimal places." };
  }
  if (value > QUOTATION_MAX_TAXABLE_AMOUNT) return { error: "That amount is too large." };
  return { value };
}

/** The new unit rate of a quotation with a priced line: positive, at most two decimals. */
export function parseUnitRate(input: string): { value: number; error?: undefined } | { value?: undefined; error: string } {
  const text = input.trim();
  if (!text) return { error: "Enter the new unit rate." };
  const parsed = parseTaxableAmount(text);
  if (parsed.error !== undefined) return { error: parsed.error.replace("The taxable amount", "The unit rate") };
  return parsed;
}

/** Remarks/reason checks (trimmed). `required` mirrors the reject reason. */
export function cleanQuotationText(text: string | undefined, max: number, required: boolean, label: string): string | undefined {
  const trimmed = (text ?? "").trim();
  if (!trimmed) {
    if (required) throw new Error(`${label} is required.`);
    return undefined;
  }
  if (trimmed.length > max) throw new Error(`Keep ${label.toLowerCase()} under ${max} characters.`);
  return trimmed;
}

// ---------------------------------------------------------------------------
// Wording identical to the backend's messages (the mock raises the same ones).
// ---------------------------------------------------------------------------

export const QUOTATION_NOT_FOUND_MESSAGE = "Quotation not found.";

export function quotationCannotApproveMessage(currentStatus: string): string {
  if (currentStatus === "APPROVED") return "This Quotation is already approved.";
  if (currentStatus === "REJECTED") return "This Quotation has been rejected and can no longer be approved.";
  return `This Quotation cannot be approved (now ${formatQuotationStatus(currentStatus)}).`;
}

export function quotationCannotReviseMessage(currentStatus: string): string {
  if (currentStatus === "REJECTED") return "This Quotation has been rejected and can no longer be revised.";
  return `This Quotation cannot be revised (now ${formatQuotationStatus(currentStatus)}).`;
}

export function quotationCannotRejectMessage(currentStatus: string): string {
  if (currentStatus === "REJECTED") return "This Quotation is already rejected.";
  if (currentStatus === "APPROVED") return "An approved Quotation cannot be rejected. Revise it first.";
  return `This Quotation cannot be rejected (now ${formatQuotationStatus(currentStatus)}).`;
}

export function quotationInconsistentBreakdownMessage(action: "approved" | "revised"): string {
  return `This Quotation cannot be ${action}: its stored tax breakdown does not add up to its total, so the system cannot say what its tax should be. Create a new Quotation instead.`;
}

export function quotationLockedByDownstreamMessage(blockers: string[]): string {
  return `This Quotation can no longer be revised: it already has ${blockers.join(" and ")}. Cancel them first.`;
}

/**
 * A request the backend refused because the quotation is no longer in the state
 * the person was looking at (someone else acted first), or because a rule
 * forbids it (approved and locked, legacy tax breakdown). Thrown by both
 * repositories, so screens handle it once: reload, then show the message.
 */
export class QuotationConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuotationConflictError";
  }
}

// ---------------------------------------------------------------------------
// Which actions make sense, and why one does not. The UI also needs the
// permission; the backend decides. Every disabled action carries a reason that
// is shown as text (not only a tooltip).
// ---------------------------------------------------------------------------

export interface ActionState {
  enabled: boolean;
  /** Why the action is unavailable. Always set when `enabled` is false. */
  reason?: string;
}

const yes: ActionState = { enabled: true };
const no = (reason: string): ActionState => ({ enabled: false, reason });

export interface QuotationActionContext {
  status: string;
  legacyBreakdown: boolean;
  may: { approve: boolean; edit: boolean; reject: boolean; createProforma: boolean };
  /** Active (not cancelled) Proformas against the quotation, as far as they are known. */
  activeProformaLabels: string[];
  /** Sales Orders that are not cancelled, as far as they are known. */
  liveOrderLabels: string[];
}

export interface QuotationActions {
  approve: ActionState;
  revise: ActionState;
  reject: ActionState;
  createProforma: ActionState;
}

export function quotationActions(ctx: QuotationActionContext): QuotationActions {
  const { status, legacyBreakdown, may } = ctx;
  const rejected = status === "REJECTED";
  const approved = status === "APPROVED";
  const open = status === "DRAFT" || status === "REVISED";

  const approve: ActionState = !may.approve
    ? no("You don't have permission to approve quotations.")
    : approved
    ? no("Already approved.")
    : rejected
    ? no("A rejected quotation is final.")
    : !open
    ? no(`A ${formatQuotationStatus(status)} quotation can't be approved.`)
    : legacyBreakdown
    ? no("Its stored tax breakdown doesn't add up, so it can't be approved. Reject it and create a new quotation.")
    : yes;

  const lockedBy = [
    ...ctx.activeProformaLabels.map((l) => `Proforma ${l}`),
    ...ctx.liveOrderLabels.map((l) => `Sales Order ${l}`),
  ];
  const revise: ActionState = !may.edit
    ? no("You don't have permission to revise quotations.")
    : rejected
    ? no("A rejected quotation is final.")
    : legacyBreakdown
    ? no("Its stored tax breakdown doesn't add up, so it can't be revised. Reject it and create a new quotation.")
    : approved && lockedBy.length > 0
    ? no(`Locked: ${lockedBy.join(" and ")} ${lockedBy.length > 1 ? "exist" : "exists"}. Cancel ${lockedBy.length > 1 ? "them" : "it"} first to revise this quotation.`)
    : yes;

  const reject: ActionState = !may.reject
    ? no("You don't have permission to reject quotations.")
    : rejected
    ? no("Already rejected.")
    : approved
    ? no("An approved quotation can't be rejected. Revise it first (possible only while nothing has been built on it).")
    : yes;

  const createProforma: ActionState = !may.createProforma
    ? no("You don't have permission to create Proforma Invoices.")
    : rejected
    ? no("A rejected quotation can't have a Proforma Invoice.")
    : !approved
    ? no("Approve the quotation first. A Proforma Invoice is created from an approved quotation.")
    : ctx.activeProformaLabels.length > 0
    ? no(`Proforma ${ctx.activeProformaLabels[0]} is already active for this quotation. Cancel it to create another.`)
    : yes;

  return { approve, revise, reject, createProforma };
}
