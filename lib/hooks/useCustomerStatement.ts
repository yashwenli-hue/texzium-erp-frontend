"use client";

import { useRepository } from "../repository/RepositoryProvider";
import { useAsyncList } from "./useAsyncList";

export function useCustomerStatement(customerName: string | undefined) {
  const repo = useRepository();
  const { data, loading, error, refetch } = useAsyncList(
    () => (customerName ? repo.customerStatements.get(customerName) : Promise.resolve(null)),
    [repo, customerName]
  );
  return { statement: data, loading, error, refetch };
}
