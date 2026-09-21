"use client";

import { useCallback } from "react";
import { useRepository } from "../repository/RepositoryProvider";

export function usePaymentLink() {
  const repo = useRepository();
  const generate = useCallback((salesInvoiceId: string) => repo.paymentLinks.generate(salesInvoiceId), [repo]);
  return { generate };
}
