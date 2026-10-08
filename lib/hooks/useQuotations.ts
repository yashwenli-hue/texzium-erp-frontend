"use client";

import { useCallback } from "react";
import { useRepository } from "../repository/RepositoryProvider";
import { useAsyncList } from "./useAsyncList";
import { useDocumentOpportunity } from "./useDocumentOpportunity";
import { useAuth } from "../auth/AuthContext";
import { CreateProformaInvoiceInput, CreateQuotationInput } from "../repository/interfaces";
import { QUOTATION_PERMISSIONS, QuotationConflictError } from "../repository/shared/quotationLifecycle";
import { ProformaConflictError } from "../repository/shared/proformaLifecycle";
import { SalesOrderConflictError } from "../repository/shared/salesOrderLifecycle";
import { ProformaInvoice, SalesOrder } from "../types/domain";

export function useQuotations() {
  const repo = useRepository();

  const { data, loading, error, refetch } = useAsyncList(
    () => repo.quotations.list(),
    [repo]
  );

  const createQuotation = useCallback(
    async (input: CreateQuotationInput) => {
      const quotation = await repo.quotations.create(input);
      refetch();
      return quotation;
    },
    [repo, refetch]
  );

  return {
    quotations: data?.items ?? [],
    loading,
    error,
    createQuotation,
    refetch,
  };
}

/**
 * The quotations list plus the documents downstream of them, so each row can say
 * what happens next. The downstream lists are best-effort: someone without
 * proformas.view or salesorders.view still gets their quotations (the "next
 * step" is then simply less specific), so a failure there is not an error.
 */
export function useQuotationPipeline() {
  const base = useQuotations();
  const repo = useRepository();
  const proformas = useAsyncList<ProformaInvoice[] | null>(() => repo.proformaInvoices.list().then((p) => p.items).catch(() => null), [repo]);
  const orders = useAsyncList<SalesOrder[] | null>(() => repo.salesOrders.list().then((p) => p.items).catch(() => null), [repo]);
  const refetchAll = useCallback(() => {
    base.refetch();
    proformas.refetch();
    orders.refetch();
  }, [base, proformas, orders]);
  return { ...base, proformas: proformas.data ?? [], orders: orders.data ?? [], downstreamKnown: !!proformas.data && !!orders.data, refetch: refetchAll };
}

export function useQuotationDetail(id: string | undefined) {
  const repo = useRepository();
  const { hasPermission } = useAuth();

  const { data: quotation, loading, error, refetch } = useAsyncList(
    () => (id ? repo.quotations.getById(id) : Promise.resolve(null)),
    [repo, id]
  );

  const { opportunity, status: opportunityStatus } = useDocumentOpportunity(quotation?.opportunityId);

  // The lifecycle history is part of viewing a quotation (quotations.view).
  const viewHistory = hasPermission(QUOTATION_PERMISSIONS.view);
  const events = useAsyncList(
    () => (id && viewHistory ? repo.quotations.listEvents(id) : Promise.resolve([])),
    [repo, id, viewHistory]
  );

  // What has been built on the quotation. Best-effort (see useQuotationPipeline):
  // when it cannot be read, the screen does not pretend there is nothing there.
  const proformas = useAsyncList<ProformaInvoice[] | null>(() => repo.proformaInvoices.list().then((p) => p.items).catch(() => null), [repo, id]);
  const orders = useAsyncList<SalesOrder[] | null>(() => repo.salesOrders.list().then((p) => p.items).catch(() => null), [repo, id]);

  const refetchEvents = events.refetch;
  const refetchProformas = proformas.refetch;
  const refetchOrders = orders.refetch;

  // The backend's status and records are authoritative after every action, so
  // everything is reloaded from it. Nothing is changed optimistically.
  const refreshAll = useCallback(() => {
    refetch();
    refetchEvents();
    refetchProformas();
    refetchOrders();
  }, [refetch, refetchEvents, refetchProformas, refetchOrders]);

  // A conflict means someone else acted first (or a rule forbids it): reload so
  // the screen shows the truth, then let the caller show the message. A 403
  // reloads nothing: it changed nothing.
  const run = useCallback(
    async <T,>(action: () => Promise<T>): Promise<T> => {
      try {
        const result = await action();
        refreshAll();
        return result;
      } catch (err) {
        if (err instanceof QuotationConflictError || err instanceof ProformaConflictError || err instanceof SalesOrderConflictError) refreshAll();
        throw err;
      }
    },
    [refreshAll]
  );

  const notLoaded = () => new Error("This quotation isn't loaded any more. Reload and try again.");

  const reviseQuotation = useCallback(
    (taxableAmount: number, remarks?: string) =>
      run(() => {
        if (!id) throw notLoaded();
        return repo.quotations.revise(id, taxableAmount, remarks);
      }),
    [id, repo, run]
  );

  const approveQuotation = useCallback(
    (remarks?: string) =>
      run(() => {
        if (!id) throw notLoaded();
        return repo.quotations.approve(id, remarks);
      }),
    [id, repo, run]
  );

  const rejectQuotation = useCallback(
    (reason: string) =>
      run(() => {
        if (!id) throw notLoaded();
        return repo.quotations.reject(id, reason);
      }),
    [id, repo, run]
  );

  const createProformaInvoice = useCallback(
    (input: Omit<CreateProformaInvoiceInput, "quotationId">) =>
      run(() => {
        if (!id) throw notLoaded();
        return repo.proformaInvoices.create({ ...input, quotationId: id });
      }),
    [id, repo, run]
  );

  return {
    quotation,
    opportunity,
    opportunityStatus,
    loading,
    error,
    refetch,
    refreshAll,
    events: events.data ?? [],
    eventsLoading: events.loading,
    eventsError: events.error,
    proformas: proformas.data ?? [],
    orders: orders.data ?? [],
    /** False when the Proformas or Sales Orders could not be read (e.g. no view permission). */
    downstreamKnown: !!proformas.data && !!orders.data,
    reviseQuotation,
    approveQuotation,
    rejectQuotation,
    createProformaInvoice,
  };
}
