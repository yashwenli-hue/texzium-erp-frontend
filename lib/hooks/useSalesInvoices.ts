"use client";

import { useCallback } from "react";
import { useRepository } from "../repository/RepositoryProvider";
import { useAsyncList } from "./useAsyncList";
import { CreateSalesInvoiceInput } from "../repository/interfaces";

export function useSalesInvoices() {
  const repo = useRepository();

  const { data, loading, error, refetch } = useAsyncList(
    () => repo.salesInvoices.list(),
    [repo]
  );

  const createSalesInvoice = useCallback(
    async (input: CreateSalesInvoiceInput) => {
      const invoice = await repo.salesInvoices.create(input);
      refetch();
      return invoice;
    },
    [repo, refetch]
  );

  return {
    salesInvoices: data?.items ?? [],
    loading,
    error,
    createSalesInvoice,
    refetch,
  };
}

export function useSalesInvoiceDetail(id: string | undefined) {
  const repo = useRepository();

  const { data: invoice, loading, error, refetch } = useAsyncList(
    () => (id ? repo.salesInvoices.getById(id) : Promise.resolve(null)),
    [repo, id]
  );

  const { data: salesOrder } = useAsyncList(
    () => (invoice?.salesOrderId ? repo.salesOrders.getById(invoice.salesOrderId) : Promise.resolve(null)),
    [repo, invoice?.salesOrderId]
  );

  const { data: proforma } = useAsyncList(
    () => (invoice?.proformaInvoiceId ? repo.proformaInvoices.getById(invoice.proformaInvoiceId) : Promise.resolve(null)),
    [repo, invoice?.proformaInvoiceId]
  );

  const { data: quotation } = useAsyncList(
    () => (invoice?.quotationId ? repo.quotations.getById(invoice.quotationId) : Promise.resolve(null)),
    [repo, invoice?.quotationId]
  );

  const { data: opportunity } = useAsyncList(
    () => (invoice?.opportunityId ? repo.opportunities.getById(invoice.opportunityId) : Promise.resolve(null)),
    [repo, invoice?.opportunityId]
  );

  return { invoice, salesOrder, proforma, quotation, opportunity, loading, error, refetch };
}
