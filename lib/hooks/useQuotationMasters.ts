"use client";

import { useRepository } from "../repository/RepositoryProvider";
import { useAsyncList } from "./useAsyncList";

/** Populates the Inventory Item / Seller GST / Buyer GST pickers on the real Quotation creation form — see CreateQuotationInput. */
export function useInventoryItems() {
  const repo = useRepository();
  const { data, loading, error } = useAsyncList(() => repo.inventoryItems.list(), [repo]);
  return { items: data ?? [], loading, error };
}

export function useSellerGstRegistrations() {
  const repo = useRepository();
  const { data, loading, error } = useAsyncList(() => repo.sellerGstRegistrations.list(), [repo]);
  return { registrations: data ?? [], loading, error };
}

export function useBuyerGstRegistrations() {
  const repo = useRepository();
  const { data, loading, error } = useAsyncList(() => repo.buyerGstRegistrations.list(), [repo]);
  return { registrations: data ?? [], loading, error };
}
