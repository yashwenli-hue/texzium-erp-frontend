"use client";

import { useCallback } from "react";
import { useRepository } from "../repository/RepositoryProvider";
import { useAsyncList } from "./useAsyncList";
import { CreateFollowupInput } from "../repository/interfaces";

export function useLeadFollowups(leadId: string | undefined) {
  const repo = useRepository();

  const { data, loading, error, refetch } = useAsyncList(
    () => (leadId ? repo.leadFollowups.listByLead(leadId) : Promise.resolve([])),
    [repo, leadId]
  );

  const createFollowup = useCallback(
    async (input: CreateFollowupInput) => {
      const row = await repo.leadFollowups.create(input);
      refetch();
      return row;
    },
    [repo, refetch]
  );

  const completeFollowup = useCallback(
    async (id: string) => {
      await repo.leadFollowups.complete(id);
      refetch();
    },
    [repo, refetch]
  );

  const rescheduleFollowup = useCallback(
    async (id: string, followupDate: string) => {
      await repo.leadFollowups.reschedule(id, followupDate);
      refetch();
    },
    [repo, refetch]
  );

  const cancelFollowup = useCallback(
    async (id: string) => {
      await repo.leadFollowups.cancel(id);
      refetch();
    },
    [repo, refetch]
  );

  return {
    followups: data ?? [],
    loading,
    error,
    createFollowup,
    completeFollowup,
    rescheduleFollowup,
    cancelFollowup,
    refetch,
  };
}
