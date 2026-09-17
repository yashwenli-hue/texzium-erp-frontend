"use client";

import { useCallback } from "react";
import { useRepository } from "../repository/RepositoryProvider";
import { useAsyncList } from "./useAsyncList";
import { CreateTaskInput } from "../repository/interfaces";

export function useTasks() {
  const repo = useRepository();

  const { data, loading, error, refetch } = useAsyncList(
    () => repo.tasks.list(),
    [repo]
  );

  const createTask = useCallback(
    async (input: CreateTaskInput) => {
      const task = await repo.tasks.create(input);
      refetch();
      return task;
    },
    [repo, refetch]
  );

  const toggleDone = useCallback(
    async (id: string, done: boolean) => {
      await repo.tasks.setDone(id, done);
      refetch();
    },
    [repo, refetch]
  );

  return {
    tasks: data?.items ?? [],
    loading,
    error,
    createTask,
    toggleDone,
    refetch,
  };
}
