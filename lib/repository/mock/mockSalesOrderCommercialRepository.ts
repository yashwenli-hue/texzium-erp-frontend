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
  SALES_ORDER_LIFECYCLE_STATUS,
  SalesOrderConflictError,
  advanceReceiptAlreadyDecidedMessage,
  isSalesOrderTransitionAllowed,
  salesOrderNotWaitingMessage,
  toAdvanceReceiptBody,
  toApprovalBody,
  toPaymentTermBody,
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

/**
 * Mock of the Sales Order commercial workflow with the same rules and wording
 * as the backend (commit 85c3666), so screens behave the same in both modes:
 * a receipt can be decided once; VERIFIED needs the order in
 * PENDING_STORE_APPROVAL and moves it to PENDING_ACCOUNTS_APPROVAL; REJECTED
 * leaves the order's status unchanged; accounts approval needs
 * PENDING_ACCOUNTS_APPROVAL and moves it to READY_FOR_DISPATCH_ORDER. Each of
 * those writes one lifecycle event; creating terms or a receipt writes none.
 * Checks run before anything is changed, so a refused action leaves no trace.
 */
export class MockSalesOrderCommercialRepository implements ISalesOrderCommercialRepository {
  async listPaymentTerms(salesOrderId: ID): Promise<SalesOrderPaymentTerm[]> {
    return delay(db.salesOrderPaymentTerms.getAll().filter((t) => t.salesOrderId === salesOrderId));
  }

  async createPaymentTerm(input: CreatePaymentTermInput): Promise<SalesOrderPaymentTerm> {
    const body = toPaymentTermBody(input);
    requireOrder(body.salesOrderId);
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
    requireOrder(body.salesOrderId);
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
        remarks: body.remarks,
        actorName: MOCK_ACTOR.name,
        actorId: MOCK_ACTOR.id,
        occurredAt: now,
      });
      return delay({ receipt: decided, salesOrderStatus: SALES_ORDER_LIFECYCLE_STATUS.PENDING_ACCOUNTS_APPROVAL });
    }

    // REJECTED: the order does not move, whatever its status.
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
      remarks: body.remarks,
      actorName: MOCK_ACTOR.name,
      actorId: MOCK_ACTOR.id,
      occurredAt: now,
    });
    return delay({ approval, salesOrderStatus: SALES_ORDER_LIFECYCLE_STATUS.READY_FOR_DISPATCH_ORDER });
  }
}
