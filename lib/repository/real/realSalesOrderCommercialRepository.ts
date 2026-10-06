import { ID } from "../../types/common";
import {
  AdvanceReceiptOutcome,
  SalesOrderAdvanceReceipt,
  SalesOrderCommercialApproval,
  SalesOrderPaymentTerm,
} from "../../types/domain";
import { CreateAdvanceReceiptInput, CreatePaymentTermInput, ISalesOrderCommercialRepository } from "../interfaces";
import { apiFetch, ApiError } from "../../api/httpClient";
import {
  SalesOrderConflictError,
  toAdvanceReceiptBody,
  toApprovalBody,
  toPaymentTermBody,
  toReasonBody,
  toVerificationBody,
} from "../shared/salesOrderLifecycle";
import {
  BackendAccountsCommercialApproval,
  BackendSalesOrderAdvanceReceipt,
  BackendSalesOrderPaymentTerm,
  mapSalesOrderAdvanceReceipt,
  mapSalesOrderCommercialApproval,
  mapSalesOrderPaymentTerm,
} from "./mappers";

/**
 * VERIFIED routes (backend 85c3666), all behind a signed-in user and their own
 * salesorders.* permission:
 *   GET  /sales-order-payment-terms           (salesorders.paymentterms.view)
 *   POST /sales-order-payment-terms/create    (salesorders.paymentterms.create)
 *   GET  /sales-order-advance-receipt         (salesorders.advancereceipts.view)
 *   POST /sales-order-advance-receipt/create  (salesorders.advancereceipts.create)
 *   PATCH /sales-order-advance-receipt/:id/verify  { verificationStatus, remarks? }
 *                                             (salesorders.advancereceipts.verify)
 *   GET  /accounts-commercial-approval        (salesorders.commercialapproval.view)
 *   POST /accounts-commercial-approval/create { salesOrderId, remarks? }
 *                                             (salesorders.commercialapproval.approve)
 *   PATCH /sales-order-advance-receipt/:id/retract-verification { reason }
 *                                             (salesorders.advancereceipts.retract)
 *   POST /accounts-commercial-approval/:id/retract { reason }
 *                                             (salesorders.commercialapproval.retract)
 *   POST /sales-orders/:id/cancel { reason }  (salesorders.cancel)
 *
 * The list routes return every row, so they are filtered to one order here. The
 * request bodies are built by the shared toXBody() helpers, which only ever
 * include the fields the backend accepts: never an actor, a verifier, an
 * approver, a status or a total (a retraction or cancellation carries only its
 * mandatory reason). The backend records the signed-in user as the
 * actor of every lifecycle action and its status is authoritative; this class
 * keeps no lifecycle state of its own.
 */

/** 409 -> SalesOrderConflictError (callers reload); 403 -> a clear permission message; anything else unchanged. */
function lifecycleError(err: unknown, forbiddenMessage: string): unknown {
  if (err instanceof ApiError) {
    if (err.status === 409) return new SalesOrderConflictError(err.message);
    if (err.status === 403) return new ApiError(forbiddenMessage, 403, err.details);
  }
  return err;
}

export class RealSalesOrderCommercialRepository implements ISalesOrderCommercialRepository {
  async listPaymentTerms(salesOrderId: ID): Promise<SalesOrderPaymentTerm[]> {
    const rows = await apiFetch<BackendSalesOrderPaymentTerm[]>("/sales-order-payment-terms");
    return rows.filter((r) => r.salesOrderId === salesOrderId).map(mapSalesOrderPaymentTerm);
  }

  async createPaymentTerm(input: CreatePaymentTermInput): Promise<SalesOrderPaymentTerm> {
    const body = toPaymentTermBody(input);
    try {
      const raw = await apiFetch<BackendSalesOrderPaymentTerm>("/sales-order-payment-terms/create", { method: "POST", body });
      return mapSalesOrderPaymentTerm(raw);
    } catch (err) {
      throw lifecycleError(err, "You don't have permission to set payment terms.");
    }
  }

  async listAdvanceReceipts(salesOrderId: ID): Promise<SalesOrderAdvanceReceipt[]> {
    const rows = await apiFetch<BackendSalesOrderAdvanceReceipt[]>("/sales-order-advance-receipt");
    return rows.filter((r) => r.salesOrderId === salesOrderId).map(mapSalesOrderAdvanceReceipt);
  }

  async createAdvanceReceipt(input: CreateAdvanceReceiptInput): Promise<SalesOrderAdvanceReceipt> {
    const body = toAdvanceReceiptBody(input);
    try {
      const raw = await apiFetch<BackendSalesOrderAdvanceReceipt>("/sales-order-advance-receipt/create", { method: "POST", body });
      return mapSalesOrderAdvanceReceipt(raw);
    } catch (err) {
      throw lifecycleError(err, "You don't have permission to record advance receipts.");
    }
  }

  async verifyAdvanceReceipt(
    receiptId: ID,
    outcome: AdvanceReceiptOutcome,
    remarks?: string
  ): Promise<{ receipt: SalesOrderAdvanceReceipt; salesOrderStatus: string }> {
    const body = toVerificationBody(outcome, remarks);
    try {
      const res = await apiFetch<{ receipt: BackendSalesOrderAdvanceReceipt; salesOrder: { id: string; status: string } }>(
        `/sales-order-advance-receipt/${receiptId}/verify`,
        { method: "PATCH", body }
      );
      return { receipt: mapSalesOrderAdvanceReceipt(res.receipt), salesOrderStatus: res.salesOrder.status };
    } catch (err) {
      throw lifecycleError(err, "You don't have permission to verify or reject advance receipts.");
    }
  }

  async listApprovals(salesOrderId: ID): Promise<SalesOrderCommercialApproval[]> {
    const rows = await apiFetch<BackendAccountsCommercialApproval[]>("/accounts-commercial-approval");
    return rows.filter((r) => r.salesOrderId === salesOrderId).map(mapSalesOrderCommercialApproval);
  }

  async approve(
    salesOrderId: ID,
    remarks?: string
  ): Promise<{ approval: SalesOrderCommercialApproval; salesOrderStatus: string }> {
    const body = toApprovalBody(salesOrderId, remarks);
    try {
      const res = await apiFetch<{ approval: BackendAccountsCommercialApproval; salesOrder: { id: string; status: string } }>(
        "/accounts-commercial-approval/create",
        { method: "POST", body }
      );
      return { approval: mapSalesOrderCommercialApproval(res.approval), salesOrderStatus: res.salesOrder.status };
    } catch (err) {
      throw lifecycleError(err, "You don't have permission to give accounts commercial approval.");
    }
  }

  async retractVerification(
    receiptId: ID,
    reason: string
  ): Promise<{ receipt: SalesOrderAdvanceReceipt; salesOrderStatus: string }> {
    const body = toReasonBody(reason);
    try {
      const res = await apiFetch<{ receipt: BackendSalesOrderAdvanceReceipt; salesOrder: { id: string; status: string } }>(
        `/sales-order-advance-receipt/${receiptId}/retract-verification`,
        { method: "PATCH", body }
      );
      return { receipt: mapSalesOrderAdvanceReceipt(res.receipt), salesOrderStatus: res.salesOrder.status };
    } catch (err) {
      throw lifecycleError(err, "You don't have permission to retract advance receipt verifications.");
    }
  }

  async retractApproval(
    approvalId: ID,
    reason: string
  ): Promise<{ approval: SalesOrderCommercialApproval; salesOrderStatus: string }> {
    const body = toReasonBody(reason);
    try {
      const res = await apiFetch<{ approval: BackendAccountsCommercialApproval; salesOrder: { id: string; status: string } }>(
        `/accounts-commercial-approval/${approvalId}/retract`,
        { method: "POST", body }
      );
      return { approval: mapSalesOrderCommercialApproval(res.approval), salesOrderStatus: res.salesOrder.status };
    } catch (err) {
      throw lifecycleError(err, "You don't have permission to retract accounts commercial approvals.");
    }
  }

  async cancelSalesOrder(salesOrderId: ID, reason: string): Promise<{ salesOrderStatus: string }> {
    const body = toReasonBody(reason);
    try {
      const res = await apiFetch<{ salesOrder: { id: string; status: string } }>(`/sales-orders/${salesOrderId}/cancel`, {
        method: "POST",
        body,
      });
      return { salesOrderStatus: res.salesOrder.status };
    } catch (err) {
      throw lifecycleError(err, "You don't have permission to cancel Sales Orders.");
    }
  }
}
