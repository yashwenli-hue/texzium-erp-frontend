"use client";

import { useCallback } from "react";
import { useRepository } from "../repository/RepositoryProvider";

export function useReceiptVoucher() {
  const repo = useRepository();
  const generate = useCallback((paymentCollectionId: string) => repo.receiptVouchers.generate(paymentCollectionId), [repo]);
  return { generate };
}
