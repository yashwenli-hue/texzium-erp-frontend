"use client";

import { useRepository } from "../repository/RepositoryProvider";
import { useAsyncList } from "./useAsyncList";
import { ID } from "../types/common";
import { StatementPeriod } from "../types/domain";

/**
 * A customer's ledger statement for a period (calendar days, both inclusive; absent =
 * open-ended). Nothing is fetched unless `enabled` (the person may view collections).
 */
export function useCustomerStatement(customerId: ID, period: StatementPeriod, enabled: boolean) {
  const repo = useRepository();
  return useAsyncList(
    () => (enabled ? repo.customerStatements.get(customerId, period) : Promise.resolve(undefined)),
    [repo, customerId, period.from, period.to, enabled]
  );
}
