"use client";

import { useCallback } from "react";
import { useRepository } from "../repository/RepositoryProvider";
import { useAsyncList } from "./useAsyncList";
import { CreateSalesOrderInput } from "../repository/interfaces";

export function useSalesOrders() {
  const repo = useRepository();

  const { data, loading, error, refetch } = useAsyncList(
    () => repo.salesOrders.list(),
    [repo]
  );

  const createSalesOrder = useCallback(
    async (input: CreateSalesOrderInput) => {
      const salesOrder = await repo.salesOrders.create(input);
      refetch();
      return salesOrder;
    },
    [repo, refetch]
  );

  return {
    salesOrders: data?.items ?? [],
    loading,
    error,
    createSalesOrder,
    refetch,
  };
}

export function useSalesOrderDetail(id: string | undefined) {
  const repo = useRepository();

  const { data: salesOrder, loading, error, refetch } = useAsyncList(
    () => (id ? repo.salesOrders.getById(id) : Promise.resolve(null)),
    [repo, id]
  );

  const { data: proforma } = useAsyncList(
    () => (salesOrder?.proformaInvoiceId ? repo.proformaInvoices.getById(salesOrder.proformaInvoiceId) : Promise.resolve(null)),
    [repo, salesOrder?.proformaInvoiceId]
  );

  const { data: quotation } = useAsyncList(
    () => (salesOrder?.quotationId ? repo.quotations.getById(salesOrder.quotationId) : Promise.resolve(null)),
    [repo, salesOrder?.quotationId]
  );

  const { data: opportunity } = useAsyncList(
    () => (salesOrder?.opportunityId ? repo.opportunities.getById(salesOrder.opportunityId) : Promise.resolve(null)),
    [repo, salesOrder?.opportunityId]
  );

  return { salesOrder, proforma, quotation, opportunity, loading, error, refetch };
}
