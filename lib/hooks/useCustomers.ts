"use client";

import { useCallback, useMemo, useState } from "react";
import { useRepository } from "../repository/RepositoryProvider";
import { useAsyncList } from "./useAsyncList";
import { CreateCustomerInput } from "../repository/interfaces";
import { FilterMap } from "../types/common";

export function useCustomers() {
  const repo = useRepository();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FilterMap>({});

  const query = useMemo(() => ({ search, filters }), [search, filters]);

  const { data, loading, error, refetch } = useAsyncList(
    () => repo.customers.list(query),
    [repo, JSON.stringify(query)]
  );

  const createCustomer = useCallback(
    async (input: CreateCustomerInput) => {
      const customer = await repo.customers.create(input);
      refetch();
      return customer;
    },
    [repo, refetch]
  );

  return {
    customers: data?.items ?? [],
    total: data?.total ?? 0,
    loading,
    error,
    search,
    setSearch,
    filters,
    setFilters,
    createCustomer,
    refetch,
  };
}

export function useCustomerDetail(id: string | undefined) {
  const repo = useRepository();

  const { data: customer, loading, error, refetch } = useAsyncList(
    () => (id ? repo.customers.getById(id) : Promise.resolve(null)),
    [repo, id]
  );

  const { data: contacts } = useAsyncList(
    () => (customer ? repo.contacts.listByCompanyName(customer.customerName) : Promise.resolve([])),
    [repo, customer?.customerName]
  );

  const { data: quotations } = useAsyncList(
    () =>
      customer
        ? repo.quotations
            .list({ search: customer.customerName })
            .then((p) => p.items.filter((q) => q.customerName === customer.customerName))
        : Promise.resolve([]),
    [repo, customer?.customerName]
  );

  return {
    customer,
    contacts: contacts ?? [],
    quotations: quotations ?? [],
    loading,
    error,
    refetch,
  };
}
