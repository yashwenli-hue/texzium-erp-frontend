"use client";

import { useCallback } from "react";
import { useRepository } from "../repository/RepositoryProvider";
import { useAsyncList } from "./useAsyncList";

export function useNotifications() {
  const repo = useRepository();

  const { data, loading, error, refetch } = useAsyncList(
    () => repo.notifications.list(),
    [repo]
  );

  const markRead = useCallback(
    async (id: string) => {
      await repo.notifications.markRead(id);
      refetch();
    },
    [repo, refetch]
  );

  const markAllRead = useCallback(async () => {
    await repo.notifications.markAllRead();
    refetch();
  }, [repo, refetch]);

  return {
    notifications: data ?? [],
    loading,
    error,
    markRead,
    markAllRead,
    refetch,
  };
}
