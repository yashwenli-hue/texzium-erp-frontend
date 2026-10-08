"use client";

import { useCallback, useMemo, useState } from "react";
import { useRepository } from "../repository/RepositoryProvider";
import { useAsyncList } from "./useAsyncList";
import { COLLECTIONS_FETCH_LIMIT, CollectionRow, buildCollectionRows, collectedLast30Days } from "../repository/shared/collections";
import { InvoiceCollections, PaymentCollection } from "../types/domain";

/**
 * Everything the Collections workspace is built from: the receivables and the invoices
 * they belong to (both needed), the deals (to name the governed customer) and the payment
 * records (for what was collected and for checking the receivables' own figures). The last
 * two can fail without taking the page down: without the deals nobody is called unlinked,
 * without the payments the collected figure says it is unavailable.
 *
 * Nothing is fetched unless `enabled` (the person may view collections), so a user without
 * the permission never asks for, or receives, collection data through this screen.
 */
export function useCollections(enabled: boolean) {
  const repo = useRepository();
  const [now, setNow] = useState(() => new Date());

  const receivables = useAsyncList(() => (enabled ? repo.accountsReceivable.list() : Promise.resolve(undefined)), [repo, enabled]);
  const invoices = useAsyncList(() => (enabled ? repo.salesInvoices.list() : Promise.resolve(undefined)), [repo, enabled]);
  const deals = useAsyncList(() => (enabled ? repo.opportunities.list() : Promise.resolve(undefined)), [repo, enabled]);
  const payments = useAsyncList(() => (enabled ? repo.paymentCollections.list({ limit: COLLECTIONS_FETCH_LIMIT }) : Promise.resolve(undefined)), [repo, enabled]);

  const required = [receivables, invoices];
  const loading = enabled && (required.some((q) => q.loading && !q.data) || (deals.loading && !deals.data && !deals.error) || (payments.loading && !payments.data && !payments.error));
  const error = enabled ? receivables.error ?? invoices.error : null;

  const paymentList: PaymentCollection[] | null = payments.error ? null : payments.data ?? null;
  const dealList = deals.error ? null : deals.data?.items ?? null;

  const rows: CollectionRow[] = useMemo(() => {
    if (!receivables.data || !invoices.data) return [];
    return buildCollectionRows({
      receivables: receivables.data.items,
      invoices: invoices.data.items,
      opportunities: dealList,
      // A list that may be cut short cannot vouch for a receivable's paid figure.
      collections: paymentList && paymentList.length < COLLECTIONS_FETCH_LIMIT ? paymentList : null,
      now,
    });
  }, [receivables.data, invoices.data, dealList, paymentList, now]);

  const collected = useMemo(() => collectedLast30Days(paymentList, now), [paymentList, now]);

  const refetch = useCallback(() => {
    setNow(new Date());
    receivables.refetch();
    invoices.refetch();
    deals.refetch();
    payments.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receivables.refetch, invoices.refetch, deals.refetch, payments.refetch]);

  return {
    rows,
    collected,
    now,
    loading,
    error,
    dealsUnavailable: enabled && !!deals.error,
    paymentsUnavailable: enabled && !!payments.error,
    refetch,
  };
}

/** One invoice's receivable with every payment collected against it and the events behind them (GET /payment-collections/invoices/:id). */
export function useReceivableCollections(salesInvoiceId: string | undefined, enabled: boolean) {
  const repo = useRepository();
  const { data, loading, error, refetch } = useAsyncList<InvoiceCollections | null>(
    () => (enabled && salesInvoiceId ? repo.paymentCollections.getForInvoice(salesInvoiceId) : Promise.resolve(null)),
    [repo, salesInvoiceId, enabled]
  );
  return { collections: data ?? null, loading, error, refetch };
}

/**
 * The payments of several invoices, read one invoice at a time (there is no customer filter
 * on the backend). An invoice whose payments could not be read is null in the result, so a
 * statement can say so for that invoice instead of showing it as having none.
 */
export function useInvoicePayments(invoiceIds: string[], enabled: boolean) {
  const repo = useRepository();
  const key = invoiceIds.join("|");
  const { data, loading, error, refetch } = useAsyncList(
    async () => {
      if (!enabled || invoiceIds.length === 0) return {} as Record<string, InvoiceCollections | null>;
      const entries = await Promise.all(invoiceIds.map(async (id) => [id, await repo.paymentCollections.getForInvoice(id).catch(() => null)] as const));
      return Object.fromEntries(entries) as Record<string, InvoiceCollections | null>;
    },
    [repo, key, enabled]
  );
  return { byInvoice: data ?? {}, loading, error, refetch };
}
