"use client";

import { useCallback, useMemo, useState } from "react";
import { useRepository } from "../repository/RepositoryProvider";
import { useAsyncList } from "./useAsyncList";
import { CreateOpportunityInput, OpportunitySortField } from "../repository/interfaces";
import { Opportunity, OpportunityStage } from "../types/domain";
import { OpportunityStageConflictError } from "../repository/shared/opportunityStage";
import { SortState } from "../types/common";
import { CustomerConflictError } from "../repository/shared/customerLifecycle";

const NOT_LOADED_MESSAGE = "This opportunity isn't loaded any more. Reload and try again.";

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

  // The move names the stage on screen as `fromStage`, so the backend only
  // applies it while the opportunity is still there. If someone else moved it
  // first (conflict), reload so the board shows the truth, then let the caller
  // show the message. Nothing is changed optimistically.
  const items = data?.items;
  const updateStage = useCallback(
    async (id: string, toStage: OpportunityStage) => {
      const current = items?.find((o: Opportunity) => o.id === id);
      if (!current) throw new Error(NOT_LOADED_MESSAGE);
      try {
        await repo.opportunities.updateStage(id, current.stage, toStage);
        refetch();
      } catch (err) {
        if (err instanceof OpportunityStageConflictError) refetch();
        throw err;
      }
    },
    [repo, refetch, items]
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
    async (toStage: OpportunityStage) => {
      if (!id) return;
      if (!opportunity) throw new Error(NOT_LOADED_MESSAGE);
      try {
        await repo.opportunities.updateStage(id, opportunity.stage, toStage);
        refetch();
      } catch (err) {
        if (err instanceof OpportunityStageConflictError) refetch();
        throw err;
      }
    },
    [id, repo, refetch, opportunity]
  );

  // Links, changes or removes the opportunity's customer. The backend decides
  // (the customer and the lead must be active; the customer is locked once a
  // quotation exists): after success or a refusal because the record moved on,
  // the screen is reloaded so it shows the truth. A 403 reloads nothing.
  const linkCustomer = useCallback(
    async (customerId: string | null) => {
      if (!id) throw new Error(NOT_LOADED_MESSAGE);
      try {
        const updated = await repo.opportunities.linkCustomer(id, customerId);
        refetch();
        return updated;
      } catch (err) {
        if (err instanceof CustomerConflictError) refetch();
        throw err;
      }
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
    linkCustomer,
    refetch,
  };
}
