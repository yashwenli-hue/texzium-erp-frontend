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
export function useFinancialSummary(access: { revenue: boolean; collections: boolean } = { revenue: true, collections: true }) {
  const repo = useRepository();
  // Company-wide totals are only asked for by people who may see them (D3): both need
  // finance visibility (finance.view.all, or revenue.view.all). Nothing is fetched otherwise.
  const { revenue: canRevenue, collections: canCollections } = access;
  const { data, loading, error, refetch } = useAsyncList(
    () =>
      Promise.all([
        canRevenue ? repo.salesReports.revenueSummary() : Promise.resolve(null),
        canCollections
          ? Promise.all([repo.collectionsDashboard.summary(), repo.collectionsDashboard.aging(), repo.collectionsDashboard.efficiency(), repo.collectionsDashboard.recoveryRate()])
          : Promise.resolve(null),
      ]).then(([revenue, c]) => ({
        revenue,
        collections: c ? { collections: c[0], aging: c[1], efficiency: c[2], recoveryRate: c[3] } : null,
      })),
    [repo, canRevenue, canCollections]
  );
  return { data, loading, error, refetch };
}
