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
 * Accounts gives commercial approval. Every later status belongs to
 * OperationsOS. There are no cancel, close or "advance rejected" statuses: a
 * rejected advance leaves the order where it is.
 */
export const SALES_ORDER_LIFECYCLE_STATUS = {
  PENDING_STORE_APPROVAL: "PENDING_STORE_APPROVAL",
  PENDING_ACCOUNTS_APPROVAL: "PENDING_ACCOUNTS_APPROVAL",
  READY_FOR_DISPATCH_ORDER: "READY_FOR_DISPATCH_ORDER",
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

/** The permission codes of the Sales Order family (backend: 20261006_crm_sales_order_permissions.sql). */
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
