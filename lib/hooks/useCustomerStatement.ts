"use client";

import { useRepository } from "../repository/RepositoryProvider";
import { useAsyncList } from "./useAsyncList";
import { ID } from "../types/common";
import { StatementPeriod } from "../types/domain";

/**
 * A customer's ledger statement for a period (calendar days, both inclusive; absent =
 * open-ended). Nothing is fetched unless `enabled` (the person may view collections).
 * A change of `version` fetches it again (the page bumps it after something that can
 * change the statement: linking an opportunity, recording a payment).
 */
export function useCustomerStatement(customerId: ID, period: StatementPeriod, enabled: boolean, version = 0) {
  const repo = useRepository();
  return useAsyncList(
    () => (enabled ? repo.customerStatements.get(customerId, period) : Promise.resolve(undefined)),
    [repo, customerId, period.from, period.to, enabled, version]
  );
}
