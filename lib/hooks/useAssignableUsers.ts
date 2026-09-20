"use client";

import { useRepository } from "../repository/RepositoryProvider";
import { useAsyncList } from "./useAsyncList";

export function useAssignableUsers() {
  const repo = useRepository();
  const { data, loading, error } = useAsyncList(() => repo.users.listAssignable(), [repo]);
  return { users: data ?? [], loading, error };
}
