"use client";

import { useCallback } from "react";
import { useRepository } from "../repository/RepositoryProvider";
import { useAsyncList } from "./useAsyncList";
import { CreateProformaInvoiceInput } from "../repository/interfaces";

export function useProformaInvoices() {
  const repo = useRepository();

  const { data, loading, error, refetch } = useAsyncList(
    () => repo.proformaInvoices.list(),
    [repo]
  );

  const createProformaInvoice = useCallback(
    async (input: CreateProformaInvoiceInput) => {
      const proforma = await repo.proformaInvoices.create(input);
      refetch();
      return proforma;
    },
    [repo, refetch]
  );

  return {
    proformaInvoices: data?.items ?? [],
    loading,
    error,
    createProformaInvoice,
    refetch,
  };
}

export function useProformaInvoiceDetail(id: string | undefined) {
  const repo = useRepository();

  const { data: proforma, loading, error, refetch } = useAsyncList(
    () => (id ? repo.proformaInvoices.getById(id) : Promise.resolve(null)),
    [repo, id]
  );

  const { data: quotation } = useAsyncList(
    () => (proforma?.quotationId ? repo.quotations.getById(proforma.quotationId) : Promise.resolve(null)),
    [repo, proforma?.quotationId]
  );

  const { data: opportunity } = useAsyncList(
    () => (quotation?.opportunityId ? repo.opportunities.getById(quotation.opportunityId) : Promise.resolve(null)),
    [repo, quotation?.opportunityId]
  );

  const approveProformaInvoice = useCallback(async () => {
    if (!id) return;
    await repo.proformaInvoices.approve(id);
    refetch();
  }, [id, repo, refetch]);

  return { proforma, quotation, opportunity, loading, error, approveProformaInvoice, refetch };
}
