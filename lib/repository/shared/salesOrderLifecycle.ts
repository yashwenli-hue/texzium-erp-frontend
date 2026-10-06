import {
  ADVANCE_RECEIPT_OUTCOMES,
  AdvanceReceiptOutcome,
  SALES_ORDER_PAYMENT_MODES,
  SALES_ORDER_PAYMENT_TYPES,
  formatSalesOrderStatus,
} from "../../types/domain";

/**
 * Sales Order pre-dispatch lifecycle, mirroring the backend (backend commit
 * 85c3666, sales-order-lifecycle.ts). The backend is the authority and
 * re-checks every action; these rules let the UI offer the right actions and let
 * the mock behave the same way.
 *
 *   PENDING_STORE_APPROVAL -> PENDING_ACCOUNTS_APPROVAL -> READY_FOR_DISPATCH_ORDER
 *
 * The first step happens when an advance receipt is verified, the second when
 * Accounts gives commercial approval. Each step can be retracted, one step back
 * and most recent first, and an order in any of the three statuses can be
 * cancelled: CANCELLED is terminal (nothing reopens it). Every later status
 * belongs to OperationsOS and can no longer be retracted or cancelled from here.
 * There is no "advance rejected" status: a rejected advance leaves the order
 * where it is.
 */
export const SALES_ORDER_LIFECYCLE_STATUS = {
  PENDING_STORE_APPROVAL: "PENDING_STORE_APPROVAL",
  PENDING_ACCOUNTS_APPROVAL: "PENDING_ACCOUNTS_APPROVAL",
  READY_FOR_DISPATCH_ORDER: "READY_FOR_DISPATCH_ORDER",
  CANCELLED: "CANCELLED",
} as const;

export const SALES_ORDER_LIFECYCLE_STEPS: readonly string[] = [
  SALES_ORDER_LIFECYCLE_STATUS.PENDING_STORE_APPROVAL,
  SALES_ORDER_LIFECYCLE_STATUS.PENDING_ACCOUNTS_APPROVAL,
  SALES_ORDER_LIFECYCLE_STATUS.READY_FOR_DISPATCH_ORDER,
];

export const SALES_ORDER_TRANSITIONS: Record<string, readonly string[]> = {
  [SALES_ORDER_LIFECYCLE_STATUS.PENDING_STORE_APPROVAL]: [SALES_ORDER_LIFECYCLE_STATUS.PENDING_ACCOUNTS_APPROVAL],
  [SALES_ORDER_LIFECYCLE_STATUS.PENDING_ACCOUNTS_APPROVAL]: [SALES_ORDER_LIFECYCLE_STATUS.READY_FOR_DISPATCH_ORDER],
};

export function isSalesOrderTransitionAllowed(from: string, to: string): boolean {
  return (SALES_ORDER_TRANSITIONS[from] ?? []).includes(to);
}

/** Retract: undo the most recent RevenueOS approval, one step back. */
export const SALES_ORDER_RETRACTIONS: Record<string, string> = {
  [SALES_ORDER_LIFECYCLE_STATUS.PENDING_ACCOUNTS_APPROVAL]: SALES_ORDER_LIFECYCLE_STATUS.PENDING_STORE_APPROVAL,
  [SALES_ORDER_LIFECYCLE_STATUS.READY_FOR_DISPATCH_ORDER]: SALES_ORDER_LIFECYCLE_STATUS.PENDING_ACCOUNTS_APPROVAL,
};

/** Cancel: the statuses an order can be cancelled from. Anything else (legacy OPEN, the OperationsOS statuses, CANCELLED itself) cannot. */
export const SALES_ORDER_CANCELLABLE_STATUSES: readonly string[] = [
  SALES_ORDER_LIFECYCLE_STATUS.PENDING_STORE_APPROVAL,
  SALES_ORDER_LIFECYCLE_STATUS.PENDING_ACCOUNTS_APPROVAL,
  SALES_ORDER_LIFECYCLE_STATUS.READY_FOR_DISPATCH_ORDER,
];

export function isSalesOrderRetractionAllowed(from: string, to: string): boolean {
  return SALES_ORDER_RETRACTIONS[from] === to;
}

export function isSalesOrderCancellationAllowed(from: string): boolean {
  return SALES_ORDER_CANCELLABLE_STATUSES.includes(from);
}

/** The permission codes of the Sales Order family (backend: 20261006_crm_sales_order_permissions.sql and 20261006_crm_sales_order_cancel_retract_permissions.sql). */
export const SALES_ORDER_PERMISSIONS = {
  view: "salesorders.view",
  create: "salesorders.create",
  paymentTermsView: "salesorders.paymentterms.view",
  paymentTermsCreate: "salesorders.paymentterms.create",
  advanceReceiptsView: "salesorders.advancereceipts.view",
  advanceReceiptsCreate: "salesorders.advancereceipts.create",
  advanceReceiptsVerify: "salesorders.advancereceipts.verify",
  commercialApprovalView: "salesorders.commercialapproval.view",
  commercialApprovalApprove: "salesorders.commercialapproval.approve",
  advanceReceiptsRetract: "salesorders.advancereceipts.retract",
  commercialApprovalRetract: "salesorders.commercialapproval.retract",
  cancel: "salesorders.cancel",
} as const;

// ---- Which actions make sense for a status (the UI also needs the permission; the backend decides) ----

/** Payment terms and advance receipts are collected while the order waits for store or accounts approval. */
export function canRecordCommercialDocuments(status: string): boolean {
  return (
    status === SALES_ORDER_LIFECYCLE_STATUS.PENDING_STORE_APPROVAL ||
    status === SALES_ORDER_LIFECYCLE_STATUS.PENDING_ACCOUNTS_APPROVAL
  );
}

/** Verifying an advance receipt is what moves an order out of PENDING_STORE_APPROVAL. */
export function canVerifyAdvanceReceipt(status: string): boolean {
  return status === SALES_ORDER_LIFECYCLE_STATUS.PENDING_STORE_APPROVAL;
}

export function canGiveAccountsApproval(status: string): boolean {
  return status === SALES_ORDER_LIFECYCLE_STATUS.PENDING_ACCOUNTS_APPROVAL;
}

export function isInSalesOrderLifecycle(status: string): boolean {
  return SALES_ORDER_LIFECYCLE_STEPS.includes(status);
}

/** A verification can be retracted only while the order waits for Accounts approval (retract the approval first once it is ready). */
export function canRetractAdvanceVerification(status: string): boolean {
  return isSalesOrderRetractionAllowed(status, SALES_ORDER_LIFECYCLE_STATUS.PENDING_STORE_APPROVAL);
}

/** An approval can be retracted only while the order is Ready For Dispatch Order. */
export function canRetractAccountsApproval(status: string): boolean {
  return isSalesOrderRetractionAllowed(status, SALES_ORDER_LIFECYCLE_STATUS.PENDING_ACCOUNTS_APPROVAL);
}

export function canCancelSalesOrder(status: string): boolean {
  return isSalesOrderCancellationAllowed(status);
}

/** CANCELLED is terminal: the order takes no further workflow action of any kind. */
export function isSalesOrderCancelled(status: string): boolean {
  return status === SALES_ORDER_LIFECYCLE_STATUS.CANCELLED;
}

/** One non-cancelled Sales Order per Proforma: a cancelled order no longer counts. */
export function isLiveSalesOrder(status: string): boolean {
  return !isSalesOrderCancelled(status);
}

// ---- Wording that matches the backend's own messages ----

export const SALES_ORDER_REMARKS_MAX_LENGTH = 500;
export const SALES_ORDER_REFERENCE_MAX_LENGTH = 100;

export const SALES_ORDER_ALREADY_EXISTS_MESSAGE = "A Sales Order already exists for this Proforma Invoice.";
export const SALES_ORDER_PROFORMA_NOT_APPROVED_MESSAGE = "Sales Order can only be created from APPROVED Proforma Invoice";

export function salesOrderNotWaitingMessage(what: string, currentStatus: string): string {
  return `This Sales Order is not waiting for ${what} (now ${formatSalesOrderStatus(currentStatus)}).`;
}

export function advanceReceiptAlreadyDecidedMessage(currentStatus: string): string {
  return `This advance receipt has already been decided (${currentStatus.toLowerCase().replace(/_/g, " ")}).`;
}

// ---- Retract / cancel wording, identical to the backend's (sales-order-lifecycle.ts, accounts-commercial-approval and advance-receipt services)

export const VERIFICATION_RETRACT_SUBJECT = "A verification";
export const APPROVAL_RETRACT_SUBJECT = "An accounts approval";

export function salesOrderCannotRetractMessage(subject: string, requiredStatus: string, currentStatus: string): string {
  return `${subject} can only be retracted while the Sales Order is ${formatSalesOrderStatus(requiredStatus)} (now ${formatSalesOrderStatus(currentStatus)}).`;
}

export function salesOrderCannotCancelMessage(currentStatus: string): string {
  if (isSalesOrderCancelled(currentStatus)) return "This Sales Order is already cancelled.";
  return `This Sales Order cannot be cancelled here (now ${formatSalesOrderStatus(currentStatus)}). Only an order that is Pending Store Approval, Pending Accounts Approval or Ready For Dispatch Order can be cancelled.`;
}

export function receiptNotVerifiedMessage(currentStatus: string): string {
  return `This advance receipt is not verified (${currentStatus.toLowerCase().replace(/_/g, " ")}), so there is no verification to retract.`;
}

export function approvalNotInForceMessage(currentStatus: string): string {
  return `This approval is not in force any more (${currentStatus.toLowerCase().replace(/_/g, " ")}).`;
}

export function notRecordedByWorkflowMessage(what: string): string {
  return `This ${what} was not recorded by the Sales Order workflow, so it cannot be retracted here.`;
}

/** Operations or Finance already has work for the order: RevenueOS no longer decides what happens to it. */
export function salesOrderDownstreamMessage(action: "retract" | "cancel", blockers: string[]): string {
  const verb = action === "retract" ? "retracted" : "cancelled";
  return `This Sales Order can no longer be ${verb} here: it already has ${blockers.join(" and ")}. Operations or Finance has taken it from here.`;
}

/** Payment terms and advance receipts can only be recorded while an order waits for store or accounts approval. */
export function salesOrderNotAcceptingDocumentsMessage(what: string, currentStatus: string): string {
  if (isSalesOrderCancelled(currentStatus)) {
    return `This Sales Order has been cancelled, so ${what} can no longer be recorded.`;
  }
  return `${what[0].toUpperCase()}${what.slice(1)} can only be recorded while the Sales Order is Pending Store Approval or Pending Accounts Approval (now ${formatSalesOrderStatus(currentStatus)}).`;
}

/**
 * A request the backend refused because the order or receipt is no longer in
 * the state the person was looking at (someone else acted first), or because a
 * Sales Order already exists for the Proforma. Thrown by both repositories, so
 * screens handle it once: reload, then show the message.
 */
export class SalesOrderConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SalesOrderConflictError";
  }
}

// ---- Input checks (mirror the backend DTOs) and request bodies ----

/**
 * Optional lifecycle remarks: trimmed, empty means none. They belong to the
 * lifecycle event; they are never sent to the general Notes system.
 */
export function cleanRemarks(remarks: string | undefined): string | undefined {
  const trimmed = (remarks ?? "").trim();
  if (!trimmed) return undefined;
  if (trimmed.length > SALES_ORDER_REMARKS_MAX_LENGTH) {
    throw new Error(`Keep remarks under ${SALES_ORDER_REMARKS_MAX_LENGTH} characters.`);
  }
  return trimmed;
}

function requireDate(value: string, message: string): string {
  const t = Date.parse(value);
  if (!value || Number.isNaN(t)) throw new Error(message);
  return new Date(t).toISOString();
}

export interface PaymentTermInput {
  salesOrderId: string;
  paymentType: string;
  advanceAmount: number;
  balanceAmount: number;
  creditDays?: number;
  dueDate?: string;
  remarks?: string;
}

/** Validates and returns exactly the fields the backend accepts. Nothing server-owned is ever included. */
export function toPaymentTermBody(input: PaymentTermInput) {
  if (!(SALES_ORDER_PAYMENT_TYPES as readonly string[]).includes(input.paymentType)) {
    throw new Error("Choose a payment type.");
  }
  if (!Number.isFinite(input.advanceAmount) || input.advanceAmount < 0) throw new Error("Advance amount must be 0 or more.");
  if (!Number.isFinite(input.balanceAmount) || input.balanceAmount < 0) throw new Error("Balance amount must be 0 or more.");
  if (input.creditDays !== undefined && (!Number.isInteger(input.creditDays) || input.creditDays < 0)) {
    throw new Error("Credit days must be a whole number of 0 or more.");
  }
  const remarks = cleanRemarks(input.remarks);
  return {
    salesOrderId: input.salesOrderId,
    paymentType: input.paymentType,
    advanceAmount: input.advanceAmount,
    balanceAmount: input.balanceAmount,
    ...(input.creditDays !== undefined ? { creditDays: input.creditDays } : {}),
    ...(input.dueDate ? { dueDate: requireDate(input.dueDate, "Enter a valid due date.") } : {}),
    ...(remarks ? { remarks } : {}),
  };
}

export interface AdvanceReceiptInput {
  salesOrderId: string;
  receiptDate: string;
  amountReceived: number;
  paymentMode: string;
  referenceNo?: string;
  remarks?: string;
}

export function toAdvanceReceiptBody(input: AdvanceReceiptInput) {
  const receiptDate = requireDate(input.receiptDate, "Enter a valid receipt date.");
  if (!Number.isFinite(input.amountReceived) || input.amountReceived <= 0) throw new Error("Amount received must be greater than 0.");
  if (!(SALES_ORDER_PAYMENT_MODES as readonly string[]).includes(input.paymentMode)) throw new Error("Choose a payment mode.");
  const referenceNo = (input.referenceNo ?? "").trim();
  if (referenceNo.length > SALES_ORDER_REFERENCE_MAX_LENGTH) {
    throw new Error(`Keep the reference under ${SALES_ORDER_REFERENCE_MAX_LENGTH} characters.`);
  }
  const remarks = cleanRemarks(input.remarks);
  return {
    salesOrderId: input.salesOrderId,
    receiptDate,
    amountReceived: input.amountReceived,
    paymentMode: input.paymentMode,
    ...(referenceNo ? { referenceNo } : {}),
    ...(remarks ? { remarks } : {}),
  };
}

export function toVerificationBody(outcome: AdvanceReceiptOutcome, remarks?: string) {
  if (!(ADVANCE_RECEIPT_OUTCOMES as readonly string[]).includes(outcome)) {
    throw new Error("A receipt can only be verified or rejected.");
  }
  const clean = cleanRemarks(remarks);
  return { verificationStatus: outcome, ...(clean ? { remarks: clean } : {}) };
}

export const SALES_ORDER_REASON_MAX_LENGTH = 500;

/**
 * The reason that must accompany every retraction and cancellation: trimmed,
 * 1 to 500 characters (the backend refuses anything else with a 400). It is
 * stored as the lifecycle event's remarks, so it is shown in the history.
 */
export function cleanReason(reason: string | undefined): string {
  const trimmed = (reason ?? "").trim();
  if (!trimmed) throw new Error("Enter a reason.");
  if (trimmed.length > SALES_ORDER_REASON_MAX_LENGTH) {
    throw new Error(`Keep the reason under ${SALES_ORDER_REASON_MAX_LENGTH} characters.`);
  }
  return trimmed;
}

/** The body of a retract or cancel request: only the reason. The actor and the outcome are the backend's to decide. */
export function toReasonBody(reason: string | undefined) {
  return { reason: cleanReason(reason) };
}

export function toApprovalBody(salesOrderId: string, remarks?: string) {
  const clean = cleanRemarks(remarks);
  return { salesOrderId, ...(clean ? { remarks: clean } : {}) };
}

/**
 * The create request. The order's total is NOT part of it: the backend takes it
 * from the approved Proforma Invoice, so the screen shows that amount read-only.
 */
export function toCreateSalesOrderBody(input: {
  proformaInvoiceId: string;
  orderDate: string;
  inventoryItemId: string;
  orderQty: number;
  sellerGstId: string;
  buyerGstId: string;
}) {
  return {
    proformaInvoiceId: input.proformaInvoiceId,
    orderDate: input.orderDate,
    inventoryItemId: input.inventoryItemId,
    orderQty: input.orderQty,
    sellerGstId: input.sellerGstId,
    buyerGstId: input.buyerGstId,
  };
}
