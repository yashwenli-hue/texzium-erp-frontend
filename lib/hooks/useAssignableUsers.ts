"use client";

import { useRepository } from "../repository/RepositoryProvider";
import { useAsyncList } from "./useAsyncList";

export function useAssignableUsers() {
  const repo = useRepository();
  const { data, loading, error } = useAsyncList(() => repo.users.listAssignable(), [repo]);
  return { users: data ?? [], loading, error };
}

/**
 * Why the people to choose from could not be listed, in words the person can act on. A refused list
 * (403) is not the same as "nobody is available": it needs the users.view permission.
 */
export function peopleListProblem(error: Error | null): string | null {
  if (!error) return null;
  return (error as { status?: number }).status === 403
    ? "You can't see the list of people to choose from: it needs the users.view permission. Ask an administrator."
    : "Couldn't load the list of people. Close this and try again.";
}
