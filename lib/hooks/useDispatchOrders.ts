"use client";

import { useRepository } from "../repository/RepositoryProvider";
import { useAsyncList } from "./useAsyncList";

/** Read-only lookup — see IDispatchOrderRepository. Powers the "pick a DISPATCHED order" step of Sales Invoice creation; no Dispatch Order management UI exists. */
export function useDispatchOrders() {
  const repo = useRepository();
  const { data, loading, error, refetch } = useAsyncList(() => repo.dispatchOrders.list(), [repo]);
  return { dispatchOrders: data ?? [], loading, error, refetch };
}
