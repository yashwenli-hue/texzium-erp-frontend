"use client";

import { useCallback, useMemo, useState } from "react";
import { useRepository } from "../repository/RepositoryProvider";
import { useAsyncList } from "./useAsyncList";
import { CreateLeadInput, UpdateLeadInput, LogLeadActivityInput } from "../repository/interfaces";
import { LeadStatus } from "../types/domain";
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

  const updateStatus = useCallback(
    async (id: string, status: LeadStatus) => {
      await repo.leads.updateStatus(id, status);
      refetch();
    },
    [repo, refetch]
  );

  const assignLead = useCallback(
    async (id: string, assignedToId: string, assignedToName: string) => {
      await repo.leads.assign(id, assignedToId, assignedToName);
      refetch();
    },
    [repo, refetch]
  );

  const qualifyLead = useCallback(
    async (id: string, salesUserId: string) => {
      await repo.leads.qualify(id, salesUserId);
      refetch();
    },
    [repo, refetch]
  );

  const rejectLead = useCallback(
    async (id: string, reason: string) => {
      await repo.leads.reject(id, reason);
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
    updateStatus,
    assignLead,
    qualifyLead,
    rejectLead,
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

  // Employee sales activity. Never changes the lead's status; the backend
  // records the signed-in user as the actor. Errors propagate so the form can
  // show them — nothing is faked locally.
  const logActivity = useCallback(
    async (input: LogLeadActivityInput) => {
      if (!id) return;
      const entry = await repo.leads.logActivity(id, input);
      refetchTimeline();
      refetch();
      return entry;
    },
    [id, repo, refetch, refetchTimeline]
  );

  const assignLead = useCallback(
    async (assignedToId: string, assignedToName: string) => {
      if (!id) return;
      await repo.leads.assign(id, assignedToId, assignedToName);
      refetch();
      refetchTimeline();
    },
    [id, repo, refetch, refetchTimeline]
  );

  const qualifyLead = useCallback(
    async (salesUserId: string) => {
      if (!id) return;
      await repo.leads.qualify(id, salesUserId);
      refetch();
      refetchTimeline();
    },
    [id, repo, refetch, refetchTimeline]
  );

  const rejectLead = useCallback(
    async (reason: string) => {
      if (!id) return;
      await repo.leads.reject(id, reason);
      refetch();
      refetchTimeline();
    },
    [id, repo, refetch, refetchTimeline]
  );

  const updateLead = useCallback(
    async (input: UpdateLeadInput) => {
      if (!id) return;
      await repo.leads.update(id, input);
      refetch();
      refetchTimeline();
    },
    [id, repo, refetch, refetchTimeline]
  );

  return {
    lead,
    timeline: timeline ?? [],
    loading,
    error,
    logActivity,
    assignLead,
    qualifyLead,
    rejectLead,
    updateLead,
    refetch,
  };
}

export function useLeadSources() {
  const repo = useRepository();
  const { data, loading } = useAsyncList(() => repo.leadSources.list(), [repo]);
  return { sources: data ?? [], loading };
}
