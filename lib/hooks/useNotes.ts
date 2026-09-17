"use client";

import { useCallback } from "react";
import { useRepository } from "../repository/RepositoryProvider";
import { useAsyncList } from "./useAsyncList";
import { CreateNoteInput } from "../repository/interfaces";

export function useNotes() {
  const repo = useRepository();

  const { data, loading, error, refetch } = useAsyncList(
    () => repo.notes.list(),
    [repo]
  );

  const createNote = useCallback(
    async (input: CreateNoteInput) => {
      const note = await repo.notes.create(input);
      refetch();
      return note;
    },
    [repo, refetch]
  );

  return {
    notes: data?.items ?? [],
    loading,
    error,
    createNote,
    refetch,
  };
}

export function useNotesByRelated(linkedId: string | undefined) {
  const repo = useRepository();
  const { data, refetch } = useAsyncList(
    () => (linkedId ? repo.notes.listByRelated(linkedId) : Promise.resolve([])),
    [repo, linkedId]
  );
  return { notes: data ?? [], refetch };
}
