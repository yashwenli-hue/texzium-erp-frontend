import { ApiError } from "../../api/httpClient";
import { titleCaseFromConstant } from "../../types/domain";

/**
 * The rules of recording a payment, written once so the mock repository can follow
 * them exactly. The backend is the authority and applies the same rules in the same
 * order inside one transaction (RevenueOS payment collection, V1); the real
 * repository sends the request and reports what the backend decided.
 *
 * Money is compared in whole paise, as the backend does, so 0.1 + 0.2 settles 0.30.
 */

export const PAYMENT_MODES = ["CASH", "BANK_TRANSFER", "UPI", "CHEQUE", "CARD", "OTHER"] as const;
export type PaymentMode = (typeof PAYMENT_MODES)[number];

export const PAYMENT_REFERENCE_MAX_LENGTH = 100;
export const PAYMENT_REMARKS_MAX_LENGTH = 500;
export const PAYMENT_AMOUNT_MAX = 1_000_000_000;
/** A payment may be dated up to a day ahead (the person's date can be a day ahead of the server's). */
export const PAYMENT_DATE_TOLERANCE_MS = 24 * 60 * 60 * 1000;

export const RECEIVABLE_STATUS = { PENDING: "PENDING", PARTIAL: "PARTIAL", PAID: "PAID", WRITTEN_OFF: "WRITTEN_OFF" } as const;
export const INVOICE_STATUS_POSTED = "POSTED";

/** Stable codes of a refused payment. The message is for people. */
export const PAYMENT_CONFLICT_CODE = {
  OVERPAYMENT: "OVERPAYMENT",
  RECEIVABLE_CLOSED: "RECEIVABLE_CLOSED",
  INVOICE_NOT_POSTED: "INVOICE_NOT_POSTED",
  DUPLICATE_REFERENCE: "DUPLICATE_REFERENCE",
  RECEIVABLE_CHANGED: "RECEIVABLE_CHANGED",
  RECEIVABLE_BUSY: "RECEIVABLE_BUSY",
  LEDGER_CUSTOMER_MISSING: "LEDGER_CUSTOMER_MISSING",
  AMBIGUOUS_RECEIVABLE: "AMBIGUOUS_RECEIVABLE",
} as const;
export type PaymentConflictCode = (typeof PAYMENT_CONFLICT_CODE)[keyof typeof PAYMENT_CONFLICT_CODE];

/**
 * A payment the backend refused because of the state of the receivable or invoice
 * (more than is owed, already paid, a reference used before, changed meanwhile).
 * Thrown by both repositories, so screens handle it once: show the message, and
 * reload when the code says the receivable moved (RECEIVABLE_CHANGED / _BUSY).
 */
export class PaymentConflictError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "PaymentConflictError";
    this.code = code;
  }
}

/** True when a refused payment is worth retrying after a reload: the receivable simply moved. */
export const isRetryablePaymentConflict = (code: string | undefined) =>
  code === PAYMENT_CONFLICT_CODE.RECEIVABLE_CHANGED || code === PAYMENT_CONFLICT_CODE.RECEIVABLE_BUSY;

// ---------------------------------------------------------------------------
// Money and text
// ---------------------------------------------------------------------------
export const toPaise = (rupees: number) => Math.round(rupees * 100);
export const fromPaise = (paise: number) => paise / 100;

export function formatRupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** A rupee amount: finite, at least one paisa, at most two decimals (exact, no tolerance). */
export function isRupeeAmount(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0.01 && Math.round(value * 100) / 100 === value;
}

/** "Bank Transfer", " bank-transfer " and "BANK_TRANSFER" are the same mode. */
export function normalizePaymentMode(value: string): string {
  return value.trim().toUpperCase().replace(/[\s-]+/g, "_");
}

export const isKnownPaymentMode = (value: string): value is PaymentMode => (PAYMENT_MODES as readonly string[]).includes(normalizePaymentMode(value));

/** A readable mode, for new and older collections alike ("BANK_TRANSFER" and "Bank Transfer" both read "Bank Transfer"). */
export function paymentModeLabel(mode: string): string {
  const normalized = normalizePaymentMode(mode);
  return normalized === "UPI" ? "UPI" : titleCaseFromConstant(normalized);
}

/** Two references are the same payment if they differ only in case or surrounding spaces. */
export const referenceKey = (reference: string) => reference.trim().toLowerCase();

// ---------------------------------------------------------------------------
// The request, checked the way the backend's DTO does
// ---------------------------------------------------------------------------
export interface PaymentInputToCheck {
  salesInvoiceId: string;
  paymentDate: string;
  amountReceived: number;
  paymentMode: string;
  referenceNo: string;
  remarks?: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** What is wrong with a payment request, one message per problem (the backend's DTO rules). Empty when it is fine. */
export function paymentInputProblems(input: PaymentInputToCheck, now = new Date()): string[] {
  const problems: string[] = [];
  if (!UUID.test(input.salesInvoiceId ?? "")) problems.push("salesInvoiceId must be a UUID");
  const date = Date.parse(input.paymentDate);
  if (!input.paymentDate || Number.isNaN(date)) problems.push("paymentDate must be a valid ISO 8601 date string");
  else if (date > now.getTime() + PAYMENT_DATE_TOLERANCE_MS) problems.push("The payment date cannot be in the future.");
  if (!isRupeeAmount(input.amountReceived)) problems.push("amountReceived must be an amount of at least 0.01 with at most two decimal places");
  else if (input.amountReceived > PAYMENT_AMOUNT_MAX) problems.push(`amountReceived must not be greater than ${PAYMENT_AMOUNT_MAX}`);
  if (typeof input.paymentMode !== "string" || !isKnownPaymentMode(input.paymentMode)) problems.push(`paymentMode must be one of: ${PAYMENT_MODES.join(", ")}`);
  const reference = typeof input.referenceNo === "string" ? input.referenceNo.trim() : "";
  if (reference === "") problems.push("referenceNo should not be empty");
  else if (reference.length > PAYMENT_REFERENCE_MAX_LENGTH) problems.push(`referenceNo must be shorter than or equal to ${PAYMENT_REFERENCE_MAX_LENGTH} characters`);
  if (input.remarks !== undefined && input.remarks.trim().length > PAYMENT_REMARKS_MAX_LENGTH) problems.push(`remarks must be shorter than or equal to ${PAYMENT_REMARKS_MAX_LENGTH} characters`);
  return problems;
}

// ---------------------------------------------------------------------------
// The decision, in the backend's order
// ---------------------------------------------------------------------------
export interface ReceivableToCheck {
  id: string;
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: string;
}

export interface PaymentPlan {
  paidAfter: number;
  balanceAfter: number;
  statusAfter: string;
  amount: number;
  balanceBefore: number;
  ledgerBalance: number;
}

const conflict = (message: string, code: PaymentConflictCode) => new PaymentConflictError(message, code);

/**
 * Decides one payment against a receivable the way the backend does, in the same
 * order: unknown invoice / receivable, more than one receivable, invoice not posted,
 * receivable closed, no customer name for the ledger, more than is outstanding, a
 * reference already used. Throws what the backend answers; otherwise returns the
 * figures the receivable moves to. The paid and balance figures move by the payment
 * itself, so a receivable whose own figures disagree keeps its drift.
 */
export function planPayment(args: {
  input: PaymentInputToCheck;
  invoice: { status: string; customerName?: string | null } | null;
  receivables: ReceivableToCheck[];
  existingReferences: string[];
  lastLedgerBalance: number | null;
}): PaymentPlan {
  const { input, invoice, receivables, existingReferences, lastLedgerBalance } = args;
  if (receivables.length === 0) {
    throw new ApiError(invoice ? "This invoice has no receivable to collect against." : "Sales invoice not found.", 404);
  }
  if (receivables.length > 1) {
    throw conflict("This invoice has more than one receivable, so a payment cannot be recorded against it until that is fixed in Finance.", PAYMENT_CONFLICT_CODE.AMBIGUOUS_RECEIVABLE);
  }
  if (!invoice) throw new ApiError("Sales invoice not found.", 404);
  const receivable = receivables[0];
  if (invoice.status !== INVOICE_STATUS_POSTED) {
    throw conflict("A payment can only be recorded against a posted invoice.", PAYMENT_CONFLICT_CODE.INVOICE_NOT_POSTED);
  }
  const balanceBefore = toPaise(receivable.balanceAmount);
  if (![RECEIVABLE_STATUS.PENDING, RECEIVABLE_STATUS.PARTIAL].includes(receivable.paymentStatus as never) || balanceBefore <= 0) {
    throw conflict(
      receivable.paymentStatus === RECEIVABLE_STATUS.WRITTEN_OFF
        ? "This receivable has been written off, so no payment can be recorded against it."
        : receivable.paymentStatus === RECEIVABLE_STATUS.PAID
          ? "This invoice is already fully paid."
          : "Nothing is outstanding on this receivable, so no payment can be recorded against it.",
      PAYMENT_CONFLICT_CODE.RECEIVABLE_CLOSED
    );
  }
  if (invoice.customerName == null || invoice.customerName.trim() === "") {
    throw conflict(
      "This invoice has no customer name, so its payment cannot be posted to the customer ledger. Fix the invoice in Finance first.",
      PAYMENT_CONFLICT_CODE.LEDGER_CUSTOMER_MISSING
    );
  }
  const amount = toPaise(input.amountReceived);
  if (amount > balanceBefore) {
    throw conflict(`The payment of ${formatRupees(amount)} is more than the ${formatRupees(balanceBefore)} outstanding on this invoice.`, PAYMENT_CONFLICT_CODE.OVERPAYMENT);
  }
  if (existingReferences.some((r) => referenceKey(r) === referenceKey(input.referenceNo))) {
    throw conflict(`A payment with the reference "${input.referenceNo.trim()}" is already recorded for this invoice.`, PAYMENT_CONFLICT_CODE.DUPLICATE_REFERENCE);
  }
  const balanceAfter = balanceBefore - amount;
  return {
    paidAfter: toPaise(receivable.paidAmount) + amount,
    balanceAfter,
    statusAfter: balanceAfter <= 0 ? RECEIVABLE_STATUS.PAID : RECEIVABLE_STATUS.PARTIAL,
    amount,
    balanceBefore,
    ledgerBalance: toPaise(lastLedgerBalance ?? 0) - amount,
  };
}
