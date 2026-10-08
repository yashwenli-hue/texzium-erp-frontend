"use client";

import { useRepository } from "../repository/RepositoryProvider";
import { useAsyncList } from "./useAsyncList";

/** Every receivable, as Finance records them. The Collections workspace reads them through useCollections; this stays for anything that only needs the list. */
export function useAccountsReceivable() {
  const repo = useRepository();
  const { data, loading, error, refetch } = useAsyncList(() => repo.accountsReceivable.list(), [repo]);
  return { accountsReceivable: data?.items ?? [], loading, error, refetch };
}
