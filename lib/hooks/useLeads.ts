"use client";

import { useCallback, useMemo, useState } from "react";
import { useRepository } from "../repository/RepositoryProvider";
import { useAsyncList } from "./useAsyncList";
import { CreateLeadInput } from "../repository/interfaces";
import { LeadStage } from "../types/domain";
import { FilterMap, SortState } from "../types/common";
import { LeadSortField } from "../repository/interfaces";

export function useLeads() {
  const repo = useRepository();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FilterMap>({});
  const [sort, setSort] = useState<SortState<LeadSortField>>({
    field: "lastActivityAt",
    direction: "desc",
  });

  const query = useMemo(() => ({ search, filters, sort }), [search, filters, sort]);

  const { data, loading, error, refetch } = useAsyncList(
    () => repo.leads.list(query),
    [repo, JSON.stringify(query)]
  );

  const createLead = useCallback(
    async (input: CreateLeadInput) => {
      const lead = await repo.leads.create(input);
      refetch();
      return lead;
    },
    [repo, refetch]
  );

  const updateStage = useCallback(
    async (id: string, stage: LeadStage) => {
      await repo.leads.updateStage(id, stage);
      refetch();
    },
    [repo, refetch]
  );

  return {
    leads: data?.items ?? [],
    total: data?.total ?? 0,
    loading,
    error,
    search,
    setSearch,
    filters,
    setFilters,
    sort,
    setSort,
    createLead,
    updateStage,
    refetch,
  };
}

export function useLeadDetail(id: string | undefined) {
  const repo = useRepository();

  const { data: lead, loading, error, refetch } = useAsyncList(
    () => (id ? repo.leads.getById(id) : Promise.resolve(null)),
    [repo, id]
  );

  const { data: timeline, refetch: refetchTimeline } = useAsyncList(
    () => (id ? repo.leads.getTimeline(id) : Promise.resolve([])),
    [repo, id]
  );

  const appendActivity = useCallback(
    async (icon: string, title: string, actorName: string) => {
      if (!id) return;
      await repo.leads.appendTimelineEntry(id, {
        icon,
        title,
        detail: "",
        actorName,
        occurredAt: new Date().toISOString(),
      });
      refetchTimeline();
      refetch();
    },
    [id, repo, refetch, refetchTimeline]
  );

  return { lead, timeline: timeline ?? [], loading, error, appendActivity, refetch };
}
