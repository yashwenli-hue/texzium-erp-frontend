"use client";

import { useRepository } from "../repository/RepositoryProvider";
import { useAsyncList } from "./useAsyncList";

/** Read-only lookup — see IDispatchOrderRepository. Powers the "pick a DISPATCHED order" step of Sales Invoice creation and the read-only Dispatch visibility panel on the Sales Order detail page; no Dispatch Order management (create/pack/mark-dispatched) UI exists. */
export function useDispatchOrders() {
  const repo = useRepository();
  const { data, loading, error, refetch } = useAsyncList(() => repo.dispatchOrders.list(), [repo]);
  return { dispatchOrders: data ?? [], loading, error, refetch };
}
