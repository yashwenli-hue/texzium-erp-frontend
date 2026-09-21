"use client";

import { useRepository } from "../repository/RepositoryProvider";
import { useAsyncList } from "./useAsyncList";

export function useAccountsReceivable() {
  const repo = useRepository();
  const { data, loading, error, refetch } = useAsyncList(() => repo.accountsReceivable.list(), [repo]);
  return { accountsReceivable: data?.items ?? [], loading, error, refetch };
}

export function useAccountsReceivableForInvoice(salesInvoiceId: string | undefined) {
  const repo = useRepository();
  const { data, loading, error, refetch } = useAsyncList(
    () => (salesInvoiceId ? repo.accountsReceivable.getBySalesInvoiceId(salesInvoiceId) : Promise.resolve(null)),
    [repo, salesInvoiceId]
  );
  return { accountsReceivable: data, loading, error, refetch };
}
