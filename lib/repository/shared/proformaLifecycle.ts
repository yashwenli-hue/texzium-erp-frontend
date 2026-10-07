import { ProformaInvoice, formatProformaInvoiceStatus, formatQuotationStatus } from "../../types/domain";
import { ActionState } from "./quotationLifecycle";

/**
 * Proforma Invoice lifecycle, mirroring the backend (backend commit 1d0b1dc,
 * proforma-lifecycle.ts). The backend is the authority and re-checks every
 * action; these rules let the UI offer the right actions, explain the ones it
 * cannot offer, and let the mock behave the same way.
 *
 *   PENDING -> APPROVED | CANCELLED
 *   APPROVED -> CANCELLED
 *
 * A Proforma is created PENDING from an APPROVED quotation; its total is the
 * quotation's. Only an APPROVED, unexpired Proforma can become a Sales Order.
 * CANCELLED is final, and a Proforma can be cancelled only while no Sales Order
 * that is not cancelled references it.
 *
 * Expiry is not a status. A Proforma with a validity date is valid through the
 * end of that calendar day (UTC) and expired from the next day on.
 */
export const PROFORMA_LIFECYCLE_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  CANCELLED: "CANCELLED",
} as const;

export const PROFORMA_TRANSITIONS: Record<string, readonly string[]> = {
  PENDING: ["APPROVED", "CANCELLED"],
  APPROVED: ["CANCELLED"],
};

export function isProformaTransitionAllowed(from: string, to: string): boolean {
  return (PROFORMA_TRANSITIONS[from] ?? []).includes(to);
}

/** The permission codes of the Proforma family (backend: 20261007_crm_proforma_permissions.sql). */
export const PROFORMA_PERMISSIONS = {
  view: "proformas.view",
  create: "proformas.create",
  approve: "proformas.approve",
  cancel: "proformas.cancel",
} as const;

export const PROFORMA_REMARKS_MAX_LENGTH = 500;
export const PROFORMA_REASON_MAX_LENGTH = 500;

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfUtcDay(iso: string): number {
  const d = new Date(iso);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** Valid through the end of the validity date (UTC); no validity date never expires. The backend reports the same as `isExpired`. */
export function isProformaExpired(validityDate: string | null | undefined, now: Date = new Date()): boolean {
  if (!validityDate) return false;
  return now.getTime() >= startOfUtcDay(validityDate) + DAY_MS;
}

/** Whole days from today until the last valid day (0 = last day is today), negative once expired. null without a validity date. */
export function daysLeftInValidity(validityDate: string | null | undefined, now: Date = new Date()): number | null {
  if (!validityDate) return null;
  const lastDayStart = startOfUtcDay(validityDate);
  const todayStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((lastDayStart - todayStart) / DAY_MS);
}

/** "Valid through 31 Oct 2026 · 24 days left" / "Expired 2 days ago" for the validity card. */
export function validityLabel(validityDate: string | null | undefined, now: Date = new Date()): { text: string; tone: "good" | "warn" | "bad" | "none" } {
  const left = daysLeftInValidity(validityDate, now);
  if (left === null) return { text: "No expiry date set", tone: "none" };
  if (left < 0) {
    const ago = -left;
    return { text: `Expired ${ago} day${ago === 1 ? "" : "s"} ago`, tone: "bad" };
  }
  if (left === 0) return { text: "Last valid day is today", tone: "warn" };
  return { text: `${left} day${left === 1 ? "" : "s"} left`, tone: left <= 3 ? "warn" : "good" };
}

/** The status the UI shows: an unexpired status, or EXPIRED over a PENDING/APPROVED Proforma that has run out. */
export type ProformaDisplayState = "PENDING" | "APPROVED" | "CANCELLED" | "EXPIRED_PENDING" | "EXPIRED_APPROVED";

export function proformaDisplayState(p: Pick<ProformaInvoice, "status" | "isExpired">): ProformaDisplayState {
  if (p.status === "CANCELLED") return "CANCELLED";
  if (p.isExpired) return p.status === "APPROVED" ? "EXPIRED_APPROVED" : "EXPIRED_PENDING";
  return p.status;
}

/** A Proforma still in play for its quotation (the backend's definition of active: not cancelled). */
export function isActiveProforma(p: { status: string }): boolean {
  return p.status !== "CANCELLED";
}

// ---------------------------------------------------------------------------
// Wording identical to the backend's messages (the mock raises the same ones).
// ---------------------------------------------------------------------------

export const PROFORMA_NOT_FOUND_MESSAGE = "Proforma Invoice not found.";

export function proformaQuotationNotApprovedMessage(currentStatus: string): string {
  return `A Proforma Invoice can only be created from an APPROVED Quotation (now ${currentStatus}).`;
}

export const PROFORMA_ACTIVE_EXISTS_MESSAGE =
  "This Quotation already has an active Proforma Invoice. Cancel it before creating another.";

export function proformaTotalMustMatchMessage(quotationTotal: number): string {
  return `The total must match the approved Quotation (${quotationTotal}).`;
}

export function proformaCannotApproveMessage(currentStatus: string): string {
  if (currentStatus === "APPROVED") return "This Proforma Invoice is already approved.";
  if (currentStatus === "CANCELLED") return "This Proforma Invoice has been cancelled and can no longer be approved.";
  return `This Proforma Invoice cannot be approved (now ${formatProformaInvoiceStatus(currentStatus)}).`;
}

export function proformaCannotCancelMessage(currentStatus: string): string {
  if (currentStatus === "CANCELLED") return "This Proforma Invoice is already cancelled.";
  return `This Proforma Invoice cannot be cancelled (now ${formatProformaInvoiceStatus(currentStatus)}).`;
}

export const PROFORMA_CANCEL_BLOCKED_BY_ORDER_MESSAGE =
  "This Proforma Invoice can no longer be cancelled: a Sales Order was created from it. Cancel the Sales Order first.";

function isoDay(validityDate: string): string {
  return new Date(validityDate).toISOString().slice(0, 10);
}

export function proformaExpiredMessage(validityDate: string, action: "approved" | "used to create a Sales Order"): string {
  return `This Proforma Invoice expired on ${isoDay(validityDate)} and can no longer be ${action}.`;
}

export function proformaParentQuotationNotApprovedMessage(currentStatus: string): string {
  return `A Sales Order can only be created while the Proforma Invoice's Quotation is APPROVED (now ${currentStatus}).`;
}

export function proformaTotalsDifferMessage(proformaTotal: number, quotationTotal: number): string {
  return `This Proforma Invoice (${proformaTotal}) no longer matches its Quotation total (${quotationTotal}), so a Sales Order cannot be created from it.`;
}

/**
 * A request the backend refused because the Proforma is no longer in the state
 * the person was looking at (someone else acted first), or because a rule
 * forbids it (expired, a live Sales Order, another active Proforma). Thrown by
 * both repositories, so screens handle it once: reload, then show the message.
 */
export class ProformaConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProformaConflictError";
  }
}

// ---------------------------------------------------------------------------
// Which actions make sense, and why one does not.
// ---------------------------------------------------------------------------

const yes: ActionState = { enabled: true };
const no = (reason: string): ActionState => ({ enabled: false, reason });

export interface ProformaActionContext {
  status: string;
  isExpired: boolean;
  validityDate: string | null;
  quotationStatus?: string;
  may: { approve: boolean; cancel: boolean; createSalesOrder: boolean };
  /** Sales Orders on this Proforma that are not cancelled, as far as they are known. */
  liveOrderLabels: string[];
}

export interface ProformaActions {
  approve: ActionState;
  cancel: ActionState;
  createSalesOrder: ActionState;
}

export function proformaActions(ctx: ProformaActionContext): ProformaActions {
  const cancelled = ctx.status === "CANCELLED";
  const approved = ctx.status === "APPROVED";
  const pending = ctx.status === "PENDING";
  const expiredText = ctx.validityDate ? proformaExpiredMessage(ctx.validityDate, "approved") : "";

  const approve: ActionState = !ctx.may.approve
    ? no("You don't have permission to approve Proforma Invoices.")
    : approved
    ? no("Already approved.")
    : cancelled
    ? no("A cancelled Proforma Invoice is final.")
    : !pending
    ? no(`A ${formatProformaInvoiceStatus(ctx.status)} Proforma Invoice can't be approved.`)
    : ctx.isExpired
    ? no(expiredText)
    : yes;

  const cancel: ActionState = !ctx.may.cancel
    ? no("You don't have permission to cancel Proforma Invoices.")
    : cancelled
    ? no("Already cancelled.")
    : ctx.liveOrderLabels.length > 0
    ? no(
        `Sales Order ${ctx.liveOrderLabels.join(", ")} ${ctx.liveOrderLabels.length > 1 ? "were" : "was"} created from this Proforma and ${ctx.liveOrderLabels.length > 1 ? "are" : "is"} not cancelled. Cancel ${ctx.liveOrderLabels.length > 1 ? "them" : "it"} first.`
      )
    : yes;

  const createSalesOrder: ActionState = !ctx.may.createSalesOrder
    ? no("You don't have permission to create Sales Orders.")
    : cancelled
    ? no("A cancelled Proforma Invoice can't be turned into a Sales Order.")
    : pending
    ? no("Approve this Proforma Invoice first.")
    : ctx.isExpired && ctx.validityDate
    ? no(proformaExpiredMessage(ctx.validityDate, "used to create a Sales Order"))
    : ctx.quotationStatus && ctx.quotationStatus !== "APPROVED"
    ? no(`Its quotation is ${formatQuotationStatus(ctx.quotationStatus)}; a Sales Order needs the quotation to be Approved.`)
    : ctx.liveOrderLabels.length > 0
    ? no(`Sales Order ${ctx.liveOrderLabels[0]} already exists for this Proforma. Only one active order can exist for it.`)
    : yes;

  return { approve, cancel, createSalesOrder };
}
