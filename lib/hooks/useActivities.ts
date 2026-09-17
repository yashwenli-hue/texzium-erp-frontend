"use client";

import { useCallback, useMemo, useState } from "react";
import { useRepository } from "../repository/RepositoryProvider";
import { useAsyncList } from "./useAsyncList";
import { CreateActivityInput } from "../repository/interfaces";
import { FilterMap } from "../types/common";

export function useActivities() {
  const repo = useRepository();
  const [filters, setFilters] = useState<FilterMap>({});

  const query = useMemo(() => ({ filters }), [filters]);

  const { data, loading, error, refetch } = useAsyncList(
    () => repo.activities.list(query),
    [repo, JSON.stringify(query)]
  );

  const logActivity = useCallback(
    async (input: CreateActivityInput) => {
      const activity = await repo.activities.create(input);
      refetch();
      return activity;
    },
    [repo, refetch]
  );

  return {
    activities: data?.items ?? [],
    loading,
    error,
    filters,
    setFilters,
    logActivity,
    refetch,
  };
}
