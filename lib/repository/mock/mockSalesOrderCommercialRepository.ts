import { ID } from "../../types/common";
import {
  AdvanceReceiptOutcome,
  SalesOrderAdvanceReceipt,
  SalesOrderCommercialApproval,
  SalesOrderPaymentTerm,
} from "../../types/domain";
import { CreateAdvanceReceiptInput, CreatePaymentTermInput, ISalesOrderCommercialRepository } from "../interfaces";
import { db } from "./db";
import { delay } from "./queryUtils";
import { mockId } from "./entityStore";
import {
  APPROVAL_RETRACT_SUBJECT,
  SALES_ORDER_LIFECYCLE_STATUS,
  SalesOrderConflictError,
  VERIFICATION_RETRACT_SUBJECT,
  advanceReceiptAlreadyDecidedMessage,
  approvalNotInForceMessage,
  canRecordCommercialDocuments,
  isSalesOrderCancellationAllowed,
  isSalesOrderCancelled,
  isSalesOrderRetractionAllowed,
  isSalesOrderTransitionAllowed,
  notRecordedByWorkflowMessage,
  receiptNotVerifiedMessage,
  salesOrderCannotCancelMessage,
  salesOrderCannotRetractMessage,
  salesOrderDownstreamMessage,
  salesOrderNotAcceptingDocumentsMessage,
  salesOrderNotWaitingMessage,
  toAdvanceReceiptBody,
  toApprovalBody,
  toPaymentTermBody,
  toReasonBody,
  toVerificationBody,
} from "../shared/salesOrderLifecycle";

/** The mock's stand-in for the signed-in user. The real backend takes the actor from the token. */
const MOCK_ACTOR = { id: "mock-user", name: "You" };

function requireOrder(id: ID) {
  const order = db.salesOrders.getById(id);
  if (!order) throw new Error("Sales Order not found.");
  return order;
}

function moveOrder(id: ID, from: string, to: string): void {
  if (!isSalesOrderTransitionAllowed(from, to)) throw new Error(`Sales Order cannot move from ${from} to ${to}.`);
  db.salesOrders.update(id, { status: to });
}

/** Payment terms and advance receipts can only be recorded while the order waits for store or accounts approval. */
function requireOpenForDocuments(order: { status: string }, what: string): void {
  if (!canRecordCommercialDocuments(order.status)) {
    throw new SalesOrderConflictError(salesOrderNotAcceptingDocumentsMessage(what, order.status));
  }
}

/**
 * A step can only be retracted if the workflow recorded it: its lifecycle event
 * names this receipt or approval. Records without one (legacy) never can be.
 */
function requireLifecycleEvent(salesOrderId: ID, action: string, referenceId: ID, what: string): void {
  const found = db.salesOrderEvents
    .getAll()
    .some((e) => e.salesOrderId === salesOrderId && e.action === action && e.referenceId === referenceId);
  if (!found) throw new SalesOrderConflictError(notRecordedByWorkflowMessage(what));
}

/** Operations or Finance already has work for the order (the mock models Dispatch Orders and Sales Invoices). */
function requireNoDownstreamWork(salesOrderId: ID, action: "retract" | "cancel"): void {
  const blockers: string[] = [];
  if (db.dispatchOrders.getAll().some((d) => d.salesOrderId === salesOrderId)) blockers.push("a Dispatch Order");
  if (db.salesInvoices.getAll().some((i) => i.salesOrderId === salesOrderId)) blockers.push("a Sales Invoice");
  if (blockers.length > 0) throw new SalesOrderConflictError(salesOrderDownstreamMessage(action, blockers));
}

/**
 * Mock of the Sales Order commercial workflow with the same rules and wording
 * as the backend (commit 85c3666), so screens behave the same in both modes:
 * a receipt can be decided once; VERIFIED needs the order in
 * PENDING_STORE_APPROVAL and moves it to PENDING_ACCOUNTS_APPROVAL; REJECTED
 * leaves the order's status unchanged; accounts approval needs
 * PENDING_ACCOUNTS_APPROVAL and moves it to READY_FOR_DISPATCH_ORDER. Each of
 * those writes one lifecycle event; creating terms or a receipt writes none.
 * Retracting a verification (PENDING_ACCOUNTS_APPROVAL -> PENDING_STORE_APPROVAL,
 * the receipt goes back to PENDING), retracting an approval (READY_FOR_DISPATCH_ORDER
 * -> PENDING_ACCOUNTS_APPROVAL, the row is kept as RETRACTED) and cancelling
 * (from any of the three statuses to the terminal CANCELLED, receipts untouched)
 * each need a reason and write one event; they are refused once the order has a
 * Dispatch Order or a Sales Invoice, and a step with no workflow event cannot be
 * retracted. A cancelled order refuses every action, and payment terms and
 * receipts can only be recorded in the two waiting statuses.
 * Checks run before anything is changed, so a refused action leaves no trace.
 * (The mock does not model purchase requisitions or reserved stock, which the
 * backend also checks before a cancellation.)
 */
export class MockSalesOrderCommercialRepository implements ISalesOrderCommercialRepository {
  async listPaymentTerms(salesOrderId: ID): Promise<SalesOrderPaymentTerm[]> {
    return delay(db.salesOrderPaymentTerms.getAll().filter((t) => t.salesOrderId === salesOrderId));
  }

  async createPaymentTerm(input: CreatePaymentTermInput): Promise<SalesOrderPaymentTerm> {
    const body = toPaymentTermBody(input);
    requireOpenForDocuments(requireOrder(body.salesOrderId), "payment terms");
    const term: SalesOrderPaymentTerm = {
      id: mockId("SOT"),
      salesOrderId: body.salesOrderId,
      paymentType: body.paymentType,
      advanceAmount: body.advanceAmount,
      balanceAmount: body.balanceAmount,
      creditDays: body.creditDays,
      dueDate: body.dueDate,
      remarks: body.remarks,
      createdAt: new Date().toISOString(),
    };
    db.salesOrderPaymentTerms.add(term);
    return delay(term);
  }

  async listAdvanceReceipts(salesOrderId: ID): Promise<SalesOrderAdvanceReceipt[]> {
    return delay(db.salesOrderAdvanceReceipts.getAll().filter((r) => r.salesOrderId === salesOrderId));
  }

  async createAdvanceReceipt(input: CreateAdvanceReceiptInput): Promise<SalesOrderAdvanceReceipt> {
    const body = toAdvanceReceiptBody(input);
    requireOpenForDocuments(requireOrder(body.salesOrderId), "advance receipts");
    const receipt: SalesOrderAdvanceReceipt = {
      id: mockId("SAR"),
      salesOrderId: body.salesOrderId,
      receiptDate: body.receiptDate,
      amountReceived: body.amountReceived,
      paymentMode: body.paymentMode,
      referenceNo: body.referenceNo,
      remarks: body.remarks,
      verificationStatus: "PENDING",
      createdAt: new Date().toISOString(),
    };
    db.salesOrderAdvanceReceipts.add(receipt);
    return delay(receipt);
  }

  async verifyAdvanceReceipt(
    receiptId: ID,
    outcome: AdvanceReceiptOutcome,
    remarks?: string
  ): Promise<{ receipt: SalesOrderAdvanceReceipt; salesOrderStatus: string }> {
    const body = toVerificationBody(outcome, remarks);
    const receipt = db.salesOrderAdvanceReceipts.getById(receiptId);
    if (!receipt) throw new Error("Advance receipt not found.");
    if (receipt.verificationStatus !== "PENDING") {
      throw new SalesOrderConflictError(advanceReceiptAlreadyDecidedMessage(receipt.verificationStatus));
    }
    const order = requireOrder(receipt.salesOrderId);
    const now = new Date().toISOString();

    if (body.verificationStatus === "VERIFIED") {
      if (order.status !== SALES_ORDER_LIFECYCLE_STATUS.PENDING_STORE_APPROVAL) {
        throw new SalesOrderConflictError(salesOrderNotWaitingMessage("advance payment verification", order.status));
      }
      const decided = db.salesOrderAdvanceReceipts.update(receiptId, {
        verificationStatus: "VERIFIED",
        verifiedBy: MOCK_ACTOR.name,
        verifiedAt: now,
      })!;
      moveOrder(order.id, SALES_ORDER_LIFECYCLE_STATUS.PENDING_STORE_APPROVAL, SALES_ORDER_LIFECYCLE_STATUS.PENDING_ACCOUNTS_APPROVAL);
      db.salesOrderEvents.add({
        id: mockId("SOE"),
        salesOrderId: order.id,
        action: "ADVANCE_RECEIPT_VERIFIED",
        result: "VERIFIED",
        fromStatus: SALES_ORDER_LIFECYCLE_STATUS.PENDING_STORE_APPROVAL,
        toStatus: SALES_ORDER_LIFECYCLE_STATUS.PENDING_ACCOUNTS_APPROVAL,
        referenceId: receipt.id,
        remarks: body.remarks,
        actorName: MOCK_ACTOR.name,
        actorId: MOCK_ACTOR.id,
        occurredAt: now,
      });
      return delay({ receipt: decided, salesOrderStatus: SALES_ORDER_LIFECYCLE_STATUS.PENDING_ACCOUNTS_APPROVAL });
    }

    // REJECTED: the order does not move, whatever its status. A cancelled order takes no more decisions.
    if (isSalesOrderCancelled(order.status)) {
      throw new SalesOrderConflictError(salesOrderNotWaitingMessage("advance payment verification", order.status));
    }
    const decided = db.salesOrderAdvanceReceipts.update(receiptId, {
      verificationStatus: "REJECTED",
      verifiedBy: MOCK_ACTOR.name,
      verifiedAt: now,
    })!;
    db.salesOrderEvents.add({
      id: mockId("SOE"),
      salesOrderId: order.id,
      action: "ADVANCE_RECEIPT_REJECTED",
      result: "REJECTED",
      fromStatus: order.status,
      toStatus: order.status,
      referenceId: receipt.id,
      remarks: body.remarks,
      actorName: MOCK_ACTOR.name,
      actorId: MOCK_ACTOR.id,
      occurredAt: now,
    });
    return delay({ receipt: decided, salesOrderStatus: order.status });
  }

  async listApprovals(salesOrderId: ID): Promise<SalesOrderCommercialApproval[]> {
    return delay(db.salesOrderApprovals.getAll().filter((a) => a.salesOrderId === salesOrderId));
  }

  async approve(
    salesOrderId: ID,
    remarks?: string
  ): Promise<{ approval: SalesOrderCommercialApproval; salesOrderStatus: string }> {
    const body = toApprovalBody(salesOrderId, remarks);
    const order = requireOrder(body.salesOrderId);
    if (order.status !== SALES_ORDER_LIFECYCLE_STATUS.PENDING_ACCOUNTS_APPROVAL) {
      throw new SalesOrderConflictError(salesOrderNotWaitingMessage("Accounts Commercial Approval", order.status));
    }
    const now = new Date().toISOString();
    moveOrder(order.id, SALES_ORDER_LIFECYCLE_STATUS.PENDING_ACCOUNTS_APPROVAL, SALES_ORDER_LIFECYCLE_STATUS.READY_FOR_DISPATCH_ORDER);
    const approval: SalesOrderCommercialApproval = {
      id: mockId("SAP"),
      salesOrderId: order.id,
      approvedBy: MOCK_ACTOR.name,
      remarks: body.remarks,
      status: "APPROVED",
      createdAt: now,
    };
    db.salesOrderApprovals.add(approval);
    db.salesOrderEvents.add({
      id: mockId("SOE"),
      salesOrderId: order.id,
      action: "ACCOUNTS_APPROVED",
      result: "APPROVED",
      fromStatus: SALES_ORDER_LIFECYCLE_STATUS.PENDING_ACCOUNTS_APPROVAL,
      toStatus: SALES_ORDER_LIFECYCLE_STATUS.READY_FOR_DISPATCH_ORDER,
      referenceId: approval.id,
      remarks: body.remarks,
      actorName: MOCK_ACTOR.name,
      actorId: MOCK_ACTOR.id,
      occurredAt: now,
    });
    return delay({ approval, salesOrderStatus: SALES_ORDER_LIFECYCLE_STATUS.READY_FOR_DISPATCH_ORDER });
  }

  async retractVerification(
    receiptId: ID,
    reason: string
  ): Promise<{ receipt: SalesOrderAdvanceReceipt; salesOrderStatus: string }> {
    const body = toReasonBody(reason);
    const receipt = db.salesOrderAdvanceReceipts.getById(receiptId);
    if (!receipt) throw new Error("Advance receipt not found.");
    if (receipt.verificationStatus !== "VERIFIED") {
      throw new SalesOrderConflictError(receiptNotVerifiedMessage(receipt.verificationStatus));
    }
    const order = requireOrder(receipt.salesOrderId);
    const to = SALES_ORDER_LIFECYCLE_STATUS.PENDING_STORE_APPROVAL;
    if (!isSalesOrderRetractionAllowed(order.status, to)) {
      throw new SalesOrderConflictError(
        salesOrderCannotRetractMessage(VERIFICATION_RETRACT_SUBJECT, SALES_ORDER_LIFECYCLE_STATUS.PENDING_ACCOUNTS_APPROVAL, order.status)
      );
    }
    requireLifecycleEvent(order.id, "ADVANCE_RECEIPT_VERIFIED", receipt.id, "verification");
    requireNoDownstreamWork(order.id, "retract");

    const now = new Date().toISOString();
    // Back to undecided: the verifier is cleared; the original event stays in the history.
    const reopened = db.salesOrderAdvanceReceipts.update(receiptId, {
      verificationStatus: "PENDING",
      verifiedBy: undefined,
      verifiedAt: undefined,
    })!;
    db.salesOrders.update(order.id, { status: to });
    db.salesOrderEvents.add({
      id: mockId("SOE"),
      salesOrderId: order.id,
      action: "ADVANCE_RECEIPT_VERIFICATION_RETRACTED",
      result: "RETRACTED",
      fromStatus: SALES_ORDER_LIFECYCLE_STATUS.PENDING_ACCOUNTS_APPROVAL,
      toStatus: to,
      referenceId: receipt.id,
      remarks: body.reason,
      actorName: MOCK_ACTOR.name,
      actorId: MOCK_ACTOR.id,
      occurredAt: now,
    });
    return delay({ receipt: reopened, salesOrderStatus: to });
  }

  async retractApproval(
    approvalId: ID,
    reason: string
  ): Promise<{ approval: SalesOrderCommercialApproval; salesOrderStatus: string }> {
    const body = toReasonBody(reason);
    const approval = db.salesOrderApprovals.getById(approvalId);
    if (!approval) throw new Error("Accounts approval not found.");
    if (approval.status !== "APPROVED") {
      throw new SalesOrderConflictError(approvalNotInForceMessage(approval.status));
    }
    const order = requireOrder(approval.salesOrderId);
    const to = SALES_ORDER_LIFECYCLE_STATUS.PENDING_ACCOUNTS_APPROVAL;
    if (!isSalesOrderRetractionAllowed(order.status, to)) {
      throw new SalesOrderConflictError(
        salesOrderCannotRetractMessage(APPROVAL_RETRACT_SUBJECT, SALES_ORDER_LIFECYCLE_STATUS.READY_FOR_DISPATCH_ORDER, order.status)
      );
    }
    requireLifecycleEvent(order.id, "ACCOUNTS_APPROVED", approval.id, "approval");
    requireNoDownstreamWork(order.id, "retract");

    const now = new Date().toISOString();
    // The row is kept and marked RETRACTED: it is no longer in force, and a later approval is a new row.
    const retracted = db.salesOrderApprovals.update(approvalId, { status: "RETRACTED" })!;
    db.salesOrders.update(order.id, { status: to });
    db.salesOrderEvents.add({
      id: mockId("SOE"),
      salesOrderId: order.id,
      action: "ACCOUNTS_APPROVAL_RETRACTED",
      result: "RETRACTED",
      fromStatus: SALES_ORDER_LIFECYCLE_STATUS.READY_FOR_DISPATCH_ORDER,
      toStatus: to,
      referenceId: approval.id,
      remarks: body.reason,
      actorName: MOCK_ACTOR.name,
      actorId: MOCK_ACTOR.id,
      occurredAt: now,
    });
    return delay({ approval: retracted, salesOrderStatus: to });
  }

  async cancelSalesOrder(salesOrderId: ID, reason: string): Promise<{ salesOrderStatus: string }> {
    const body = toReasonBody(reason);
    const order = requireOrder(salesOrderId);
    if (!isSalesOrderCancellationAllowed(order.status)) {
      throw new SalesOrderConflictError(salesOrderCannotCancelMessage(order.status));
    }
    requireNoDownstreamWork(order.id, "cancel");

    const now = new Date().toISOString();
    // Only the order's status changes: receipts (a VERIFIED advance included), terms and approvals are left as they are.
    db.salesOrders.update(order.id, { status: SALES_ORDER_LIFECYCLE_STATUS.CANCELLED });
    db.salesOrderEvents.add({
      id: mockId("SOE"),
      salesOrderId: order.id,
      action: "SALES_ORDER_CANCELLED",
      result: "CANCELLED",
      fromStatus: order.status,
      toStatus: SALES_ORDER_LIFECYCLE_STATUS.CANCELLED,
      remarks: body.reason,
      actorName: MOCK_ACTOR.name,
      actorId: MOCK_ACTOR.id,
      occurredAt: now,
    });
    return delay({ salesOrderStatus: SALES_ORDER_LIFECYCLE_STATUS.CANCELLED });
  }
}
