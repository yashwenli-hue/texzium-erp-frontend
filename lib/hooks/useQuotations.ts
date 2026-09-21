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

export function useQuotationDetail(id: string | undefined) {
  const repo = useRepository();

  const { data: quotation, loading, error, refetch } = useAsyncList(
    () => (id ? repo.quotations.getById(id) : Promise.resolve(null)),
    [repo, id]
  );

  const { data: opportunity } = useAsyncList(
    () => (quotation?.opportunityId ? repo.opportunities.getById(quotation.opportunityId) : Promise.resolve(null)),
    [repo, quotation?.opportunityId]
  );

  const reviseQuotation = useCallback(
    async (amount: number, note?: string) => {
      if (!id) return;
      await repo.quotations.revise(id, amount, note);
      refetch();
    },
    [id, repo, refetch]
  );

  const approveQuotation = useCallback(async () => {
    if (!id) return;
    await repo.quotations.approve(id);
    refetch();
  }, [id, repo, refetch]);

  const convertQuotation = useCallback(async () => {
    if (!id) return undefined;
    const { salesOrderId } = await repo.quotations.convert(id);
    refetch();
    return salesOrderId;
  }, [id, repo, refetch]);

  return { quotation, opportunity, loading, error, reviseQuotation, approveQuotation, convertQuotation, refetch };
}
