"use client";

import { useCallback, useMemo, useState } from "react";
import { useRepository } from "../repository/RepositoryProvider";
import { useAsyncList } from "./useAsyncList";
import { CreateOpportunityInput, OpportunitySortField } from "../repository/interfaces";
import { SortState } from "../types/common";

export function useOpportunities() {
  const repo = useRepository();
  const [sort, setSort] = useState<SortState<OpportunitySortField> | undefined>(undefined);

  const query = useMemo(() => ({ sort }), [sort]);

  const { data, loading, error, refetch } = useAsyncList(
    () => repo.opportunities.list(query),
    [repo, JSON.stringify(query)]
  );

  const createOpportunity = useCallback(
    async (input: CreateOpportunityInput) => {
      const opp = await repo.opportunities.create(input);
      refetch();
      return opp;
    },
    [repo, refetch]
  );

  return {
    opportunities: data?.items ?? [],
    loading,
    error,
    sort,
    setSort,
    createOpportunity,
    refetch,
  };
}
