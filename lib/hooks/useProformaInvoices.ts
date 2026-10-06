"use client";

import { useCallback } from "react";
import { useRepository } from "../repository/RepositoryProvider";
import { useAsyncList } from "./useAsyncList";
import { useAuth } from "../auth/AuthContext";
import { CreateSalesOrderInput } from "../repository/interfaces";
import { PROFORMA_PERMISSIONS, ProformaConflictError } from "../repository/shared/proformaLifecycle";
import { SalesOrderConflictError } from "../repository/shared/salesOrderLifecycle";
import { SalesOrder } from "../types/domain";

export function useProformaInvoices() {
  const repo = useRepository();

  const { data, loading, error, refetch } = useAsyncList(
    () => repo.proformaInvoices.list(),
    [repo]
  );

  return {
    proformaInvoices: data?.items ?? [],
    loading,
    error,
    refetch,
  };
}

/**
 * The Proforma list plus the Sales Orders that came from them, so each row can
 * say what happens next. Best-effort: someone without salesorders.view still gets
 * their Proformas (the "next step" is then simply less specific).
 */
export function useProformaPipeline() {
  const base = useProformaInvoices();
  const repo = useRepository();
  const orders = useAsyncList<SalesOrder[] | null>(() => repo.salesOrders.list().then((p) => p.items).catch(() => null), [repo]);
  const refetchAll = useCallback(() => {
    base.refetch();
    orders.refetch();
  }, [base, orders]);
  return { ...base, orders: orders.data ?? [], ordersKnown: !!orders.data, refetch: refetchAll };
}

export function useProformaInvoiceDetail(id: string | undefined) {
  const repo = useRepository();
  const { hasPermission } = useAuth();

  const { data: proforma, loading, error, refetch } = useAsyncList(
    () => (id ? repo.proformaInvoices.getById(id) : Promise.resolve(null)),
    [repo, id]
  );

  const { data: quotation } = useAsyncList(
    () => (proforma?.quotationId ? repo.quotations.getById(proforma.quotationId).catch(() => null) : Promise.resolve(null)),
    [repo, proforma?.quotationId]
  );

  const { data: opportunity } = useAsyncList(
    () => (quotation?.opportunityId ? repo.opportunities.getById(quotation.opportunityId).catch(() => null) : Promise.resolve(null)),
    [repo, quotation?.opportunityId]
  );

  // The lifecycle history is part of viewing a Proforma (proformas.view).
  const viewHistory = hasPermission(PROFORMA_PERMISSIONS.view);
  const events = useAsyncList(
    () => (id && viewHistory ? repo.proformaInvoices.listEvents(id) : Promise.resolve([])),
    [repo, id, viewHistory]
  );

  // The Sales Orders that came from this Proforma. Best-effort: when they cannot
  // be read (no salesorders.view), the screen does not pretend there are none.
  const orders = useAsyncList<SalesOrder[] | null>(() => repo.salesOrders.list().then((p) => p.items).catch(() => null), [repo, id]);

  const refetchEvents = events.refetch;
  const refetchOrders = orders.refetch;

  // The backend's status and records are authoritative after every action, so
  // everything is reloaded from it. Nothing is changed optimistically.
  const refreshAll = useCallback(() => {
    refetch();
    refetchEvents();
    refetchOrders();
  }, [refetch, refetchEvents, refetchOrders]);

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
        if (err instanceof ProformaConflictError || err instanceof SalesOrderConflictError) refreshAll();
        throw err;
      }
    },
    [refreshAll]
  );

  const notLoaded = () => new Error("This Proforma Invoice isn't loaded any more. Reload and try again.");

  const approveProformaInvoice = useCallback(
    (remarks?: string) =>
      run(() => {
        if (!id) throw notLoaded();
        return repo.proformaInvoices.approve(id, remarks);
      }),
    [id, repo, run]
  );

  const cancelProformaInvoice = useCallback(
    (reason: string) =>
      run(() => {
        if (!id) throw notLoaded();
        return repo.proformaInvoices.cancel(id, reason);
      }),
    [id, repo, run]
  );

  const createSalesOrder = useCallback(
    (input: CreateSalesOrderInput) => run(() => repo.salesOrders.create(input)),
    [repo, run]
  );

  return {
    proforma,
    quotation,
    opportunity,
    loading,
    error,
    refetch,
    refreshAll,
    events: events.data ?? [],
    eventsLoading: events.loading,
    eventsError: events.error,
    orders: orders.data ?? [],
    ordersKnown: !!orders.data,
    approveProformaInvoice,
    cancelProformaInvoice,
    createSalesOrder,
  };
}
