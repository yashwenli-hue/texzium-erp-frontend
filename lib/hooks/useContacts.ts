"use client";

import { useCallback, useMemo, useState } from "react";
import { useRepository } from "../repository/RepositoryProvider";
import { useAsyncList } from "./useAsyncList";
import { CreateContactInput } from "../repository/interfaces";
import { FilterMap } from "../types/common";

export function useContacts() {
  const repo = useRepository();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FilterMap>({});

  const query = useMemo(() => ({ search, filters }), [search, filters]);

  const { data, loading, error, refetch } = useAsyncList(
    () => repo.contacts.list(query),
    [repo, JSON.stringify(query)]
  );

  const createContact = useCallback(
    async (input: CreateContactInput) => {
      const contact = await repo.contacts.create(input);
      refetch();
      return contact;
    },
    [repo, refetch]
  );

  return {
    contacts: data?.items ?? [],
    total: data?.total ?? 0,
    loading,
    error,
    search,
    setSearch,
    filters,
    setFilters,
    createContact,
    refetch,
  };
}
