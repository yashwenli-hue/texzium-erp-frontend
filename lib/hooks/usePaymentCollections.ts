"use client";

import { useCallback } from "react";
import { useRepository } from "../repository/RepositoryProvider";
import { CreatePaymentCollectionInput } from "../repository/interfaces";

/** Create-only — see IPaymentCollectionRepository. No list/history hook exists for this resource because the backend offers none. */
export function useRecordPayment() {
  const repo = useRepository();
  const recordPayment = useCallback(
    (input: CreatePaymentCollectionInput) => repo.paymentCollections.create(input),
    [repo]
  );
  return { recordPayment };
}
