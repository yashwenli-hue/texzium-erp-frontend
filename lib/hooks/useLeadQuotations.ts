"use client";

import { useRepository } from "../repository/RepositoryProvider";
import { useAsyncList } from "./useAsyncList";

/** A lead's quotations without prices (GET /leads/:id/quotations). */
export function useLeadQuotations(leadId: string | undefined, enabled = true) {
  const repo = useRepository();
  const { data, loading, error, refetch } = useAsyncList(
    () => (leadId && enabled ? repo.leadQuotations.listForLead(leadId) : Promise.resolve([])),
    [repo, leadId, enabled]
  );
  return { quotations: data ?? [], loading, error, refetch };
}
