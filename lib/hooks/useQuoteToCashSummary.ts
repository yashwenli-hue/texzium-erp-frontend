"use client";

import { useQuotations } from "./useQuotations";
import { useProformaInvoices } from "./useProformaInvoices";
import { useSalesOrders } from "./useSalesOrders";
import { useDispatchOrders } from "./useDispatchOrders";
import { useSalesInvoices } from "./useSalesInvoices";

/**
 * Composes the existing Stage 2C–2F entity hooks into one small
 * operational-visibility summary for the dashboard — counts only, no new
 * fetches or repository calls of its own. Each stage keeps its own
 * independent loading/error state (from its own already-established hook)
 * so one failing list does not blank the others, per the brief's
 * "Quote-to-Cash counts can independently show their state." This is
 * operational visibility, not a conversion funnel — no stage implies the
 * next was caused by the previous.
 */
export function useQuoteToCashSummary() {
  const quotations = useQuotations();
  const proformaInvoices = useProformaInvoices();
  const salesOrders = useSalesOrders();
  const dispatchOrders = useDispatchOrders();
  const salesInvoices = useSalesInvoices();

  return {
    quotations: { count: quotations.quotations.length, loading: quotations.loading, error: quotations.error },
    proformaInvoices: { count: proformaInvoices.proformaInvoices.length, loading: proformaInvoices.loading, error: proformaInvoices.error },
    salesOrders: { count: salesOrders.salesOrders.length, loading: salesOrders.loading, error: salesOrders.error },
    dispatchOrders: { count: dispatchOrders.dispatchOrders.length, loading: dispatchOrders.loading, error: dispatchOrders.error },
    salesInvoices: { count: salesInvoices.salesInvoices.length, loading: salesInvoices.loading, error: salesInvoices.error },
  };
}
