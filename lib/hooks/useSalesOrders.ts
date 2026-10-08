"use client";

import { useCallback } from "react";
import { useRepository } from "../repository/RepositoryProvider";
import { useAsyncList } from "./useAsyncList";
import { useDocumentOpportunity } from "./useDocumentOpportunity";
import { useAuth } from "../auth/AuthContext";
import { CreateAdvanceReceiptInput, CreatePaymentTermInput, CreateSalesOrderInput } from "../repository/interfaces";
import { AdvanceReceiptOutcome } from "../types/domain";
import { SALES_ORDER_PERMISSIONS, SalesOrderConflictError } from "../repository/shared/salesOrderLifecycle";

export function useSalesOrders() {
  const repo = useRepository();

  const { data, loading, error, refetch } = useAsyncList(
    () => repo.salesOrders.list(),
    [repo]
  );

  const createSalesOrder = useCallback(
    async (input: CreateSalesOrderInput) => {
      const salesOrder = await repo.salesOrders.create(input);
      refetch();
      return salesOrder;
    },
    [repo, refetch]
  );

  return {
    salesOrders: data?.items ?? [],
    loading,
    error,
    createSalesOrder,
    refetch,
  };
}

export function useSalesOrderDetail(id: string | undefined) {
  const repo = useRepository();
  const { hasPermission } = useAuth();

  const { data: salesOrder, loading, error, refetch } = useAsyncList(
    () => (id ? repo.salesOrders.getById(id) : Promise.resolve(null)),
    [repo, id]
  );

  const { data: proforma } = useAsyncList(
    () => (salesOrder?.proformaInvoiceId ? repo.proformaInvoices.getById(salesOrder.proformaInvoiceId) : Promise.resolve(null)),
    [repo, salesOrder?.proformaInvoiceId]
  );

  const { data: quotation } = useAsyncList(
    () => (salesOrder?.quotationId ? repo.quotations.getById(salesOrder.quotationId) : Promise.resolve(null)),
    [repo, salesOrder?.quotationId]
  );

  const { opportunity, status: opportunityStatus } = useDocumentOpportunity(salesOrder?.opportunityId);

  // Each commercial section is only fetched when the person may view it; the
  // backend refuses the request otherwise (403), so asking would just fail.
  const access = {
    viewTerms: hasPermission(SALES_ORDER_PERMISSIONS.paymentTermsView),
    viewReceipts: hasPermission(SALES_ORDER_PERMISSIONS.advanceReceiptsView),
    viewApprovals: hasPermission(SALES_ORDER_PERMISSIONS.commercialApprovalView),
    viewHistory: hasPermission(SALES_ORDER_PERMISSIONS.view),
  };

  const terms = useAsyncList(
    () => (id && access.viewTerms ? repo.salesOrderCommercial.listPaymentTerms(id) : Promise.resolve([])),
    [repo, id, access.viewTerms]
  );
  const receipts = useAsyncList(
    () => (id && access.viewReceipts ? repo.salesOrderCommercial.listAdvanceReceipts(id) : Promise.resolve([])),
    [repo, id, access.viewReceipts]
  );
  const approvals = useAsyncList(
    () => (id && access.viewApprovals ? repo.salesOrderCommercial.listApprovals(id) : Promise.resolve([])),
    [repo, id, access.viewApprovals]
  );
  const events = useAsyncList(
    () => (id && access.viewHistory ? repo.salesOrders.listEvents(id) : Promise.resolve([])),
    [repo, id, access.viewHistory]
  );

  const refetchTerms = terms.refetch;
  const refetchReceipts = receipts.refetch;
  const refetchApprovals = approvals.refetch;
  const refetchEvents = events.refetch;

  // The backend's status and records are authoritative after every action, so
  // everything is reloaded from it. Nothing is changed optimistically.
  const refreshAll = useCallback(() => {
    refetch();
    refetchTerms();
    refetchReceipts();
    refetchApprovals();
    refetchEvents();
  }, [refetch, refetchTerms, refetchReceipts, refetchApprovals, refetchEvents]);

  // A conflict means someone else acted first (or the state moved on): reload
  // so the screen shows the truth, then let the caller show the message.
  const run = useCallback(
    async <T,>(action: () => Promise<T>): Promise<T> => {
      try {
        const result = await action();
        refreshAll();
        return result;
      } catch (err) {
        if (err instanceof SalesOrderConflictError) refreshAll();
        throw err;
      }
    },
    [refreshAll]
  );

  const createPaymentTerm = useCallback(
    (input: Omit<CreatePaymentTermInput, "salesOrderId">) =>
      run(() => {
        if (!id) throw new Error("This sales order isn't loaded any more. Reload and try again.");
        return repo.salesOrderCommercial.createPaymentTerm({ ...input, salesOrderId: id });
      }),
    [repo, id, run]
  );

  const createAdvanceReceipt = useCallback(
    (input: Omit<CreateAdvanceReceiptInput, "salesOrderId">) =>
      run(() => {
        if (!id) throw new Error("This sales order isn't loaded any more. Reload and try again.");
        return repo.salesOrderCommercial.createAdvanceReceipt({ ...input, salesOrderId: id });
      }),
    [repo, id, run]
  );

  const verifyAdvanceReceipt = useCallback(
    (receiptId: string, outcome: AdvanceReceiptOutcome, remarks?: string) =>
      run(() => repo.salesOrderCommercial.verifyAdvanceReceipt(receiptId, outcome, remarks)),
    [repo, run]
  );

  // Retractions and the cancellation each need a reason (the repository refuses
  // an empty one before any request). Nothing changes locally: on success the
  // backend's order, records and history are reloaded, and a conflict reloads
  // them too, exactly like the actions above.
  const retractVerification = useCallback(
    (receiptId: string, reason: string) => run(() => repo.salesOrderCommercial.retractVerification(receiptId, reason)),
    [repo, run]
  );

  const retractApproval = useCallback(
    (approvalId: string, reason: string) => run(() => repo.salesOrderCommercial.retractApproval(approvalId, reason)),
    [repo, run]
  );

  const cancelSalesOrder = useCallback(
    (reason: string) =>
      run(() => {
        if (!id) throw new Error("This sales order isn't loaded any more. Reload and try again.");
        return repo.salesOrderCommercial.cancelSalesOrder(id, reason);
      }),
    [repo, id, run]
  );

  const approveCommercially = useCallback(
    (remarks?: string) =>
      run(() => {
        if (!id) throw new Error("This sales order isn't loaded any more. Reload and try again.");
        return repo.salesOrderCommercial.approve(id, remarks);
      }),
    [repo, id, run]
  );

  return {
    salesOrder,
    proforma,
    quotation,
    opportunity,
    opportunityStatus,
    loading,
    error,
    refetch,
    access,
    paymentTerms: terms.data ?? [],
    paymentTermsError: terms.error,
    advanceReceipts: receipts.data ?? [],
    advanceReceiptsError: receipts.error,
    approvals: approvals.data ?? [],
    approvalsError: approvals.error,
    events: events.data ?? [],
    eventsLoading: events.loading,
    eventsError: events.error,
    refreshAll,
    createPaymentTerm,
    createAdvanceReceipt,
    verifyAdvanceReceipt,
    approveCommercially,
    retractVerification,
    retractApproval,
    cancelSalesOrder,
  };
}
