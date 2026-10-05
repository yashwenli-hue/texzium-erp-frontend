"use client";

import { useCallback, useMemo, useState } from "react";
import { useRepository } from "../repository/RepositoryProvider";
import { useAsyncList } from "./useAsyncList";
import { CreateOpportunityInput, OpportunitySortField } from "../repository/interfaces";
import { OpportunityStage } from "../types/domain";
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

  const updateStage = useCallback(
    async (id: string, stage: OpportunityStage) => {
      await repo.opportunities.updateStage(id, stage);
      refetch();
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
    updateStage,
    refetch,
  };
}

export function useOpportunityDetail(id: string | undefined) {
  const repo = useRepository();

  const { data: opportunity, loading, error, refetch } = useAsyncList(
    () => (id ? repo.opportunities.getById(id) : Promise.resolve(null)),
    [repo, id]
  );

  // GET /opportunities/:id embeds the lead (with notes and timelines), so the
  // separate lead and timeline fetches only run when it was not embedded
  // (the mock repository).
  const embeddedLead = opportunity?.lead;

  const { data: fetchedLead } = useAsyncList(
    () => (opportunity && !opportunity.lead ? repo.leads.getById(opportunity.leadId) : Promise.resolve(null)),
    [repo, opportunity?.leadId, !!opportunity?.lead]
  );
  const lead = embeddedLead ?? fetchedLead;

  const { data: fetchedTimeline } = useAsyncList(
    () => (lead && !lead.timelines ? repo.leads.getTimeline(lead.id) : Promise.resolve([])),
    [repo, lead?.id, !!lead?.timelines]
  );
  const timeline = lead?.timelines ?? fetchedTimeline ?? [];

  const updateStage = useCallback(
    async (stage: OpportunityStage) => {
      if (!id) return;
      await repo.opportunities.updateStage(id, stage);
      refetch();
    },
    [id, repo, refetch]
  );

  return {
    opportunity,
    lead,
    timeline,
    loading,
    error,
    updateStage,
    refetch,
  };
}
