"use client";

import { useCallback } from "react";
import { useRepository } from "../repository/RepositoryProvider";
import { SaveLeadBantInput } from "../repository/interfaces";
import { useAsyncList } from "./useAsyncList";

/** A lead's BANT analysis: the questions, the saved answers and the server's score. */
export function useLeadBant(leadId: string | undefined) {
  const repo = useRepository();
  const { data, loading, error, refetch } = useAsyncList(
    () => (leadId ? repo.leadBant.get(leadId) : Promise.resolve(undefined)),
    [repo, leadId]
  );

  const save = useCallback(
    async (input: SaveLeadBantInput) => {
      if (!leadId) throw new Error("No lead to save the BANT for.");
      const view = await repo.leadBant.save(leadId, input);
      refetch();
      return view;
    },
    [repo, leadId, refetch]
  );

  return { bant: data, loading, error, refetch, save };
}
