"use client";

import { useCallback } from "react";
import { useRepository } from "../repository/RepositoryProvider";
import { useAsyncList } from "./useAsyncList";

/**
 * Every follow-up the person may see, with its lead. `enabled` is false without
 * leads.followups.view: then nothing is asked for (the backend would refuse it anyway).
 * Each action refetches, so the lists reflect what the backend saved.
 */
export function useFollowupWorklist(enabled: boolean) {
  const repo = useRepository();
  const { data, loading, error, refetch } = useAsyncList(
    () => (enabled ? repo.leadFollowups.listAll() : Promise.resolve([])),
    [repo, enabled]
  );

  const complete = useCallback(async (id: string) => { await repo.leadFollowups.complete(id); refetch(); }, [repo, refetch]);
  const reschedule = useCallback(async (id: string, followupDate: string) => { await repo.leadFollowups.reschedule(id, followupDate); refetch(); }, [repo, refetch]);
  const cancel = useCallback(async (id: string) => { await repo.leadFollowups.cancel(id); refetch(); }, [repo, refetch]);

  return { items: data ?? [], loaded: data !== undefined, loading, error, refetch, complete, reschedule, cancel };
}
