"use client";

import { useCallback } from "react";
import { useRepository } from "../repository/RepositoryProvider";
import { useAsyncList } from "./useAsyncList";
import { CreateQuotationInput } from "../repository/interfaces";

export function useQuotations() {
  const repo = useRepository();

  const { data, loading, error, refetch } = useAsyncList(
    () => repo.quotations.list(),
    [repo]
  );

  const createQuotation = useCallback(
    async (input: CreateQuotationInput) => {
      const quotation = await repo.quotations.create(input);
      refetch();
      return quotation;
    },
    [repo, refetch]
  );

  return {
    quotations: data?.items ?? [],
    loading,
    error,
    createQuotation,
    refetch,
  };
}
