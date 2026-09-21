"use client";

import { useRepository } from "../repository/RepositoryProvider";
import { useAsyncList } from "./useAsyncList";

/**
 * Bundles the VERIFIED revenue-summary + collections-dashboard
 * (summary/aging/efficiency/recovery-rate) endpoints into one section-level
 * fetch, since the dashboard always shows them together as one "Revenue &
 * Collections" panel — a single loading/error state for the whole section,
 * consistent with the brief's "AR summary can show an honest error state if
 * its endpoint fails" as one unit, not five independently-flickering cards.
 * AccountsReceivable remains authoritative for payment state throughout
 * (Stage 2G rule) — nothing here reads SalesInvoice.paymentStatus.
 * Deliberately excludes collections-dashboard/customer-ranking and
 * /high-risk — see ICollectionsDashboardRepository.
 */
export function useFinancialSummary() {
  const repo = useRepository();
  const { data, loading, error, refetch } = useAsyncList(
    () =>
      Promise.all([
        repo.salesReports.revenueSummary(),
        repo.collectionsDashboard.summary(),
        repo.collectionsDashboard.aging(),
        repo.collectionsDashboard.efficiency(),
        repo.collectionsDashboard.recoveryRate(),
      ]).then(([revenue, collections, aging, efficiency, recoveryRate]) => ({
        revenue,
        collections,
        aging,
        efficiency,
        recoveryRate,
      })),
    [repo]
  );
  return { data, loading, error, refetch };
}
