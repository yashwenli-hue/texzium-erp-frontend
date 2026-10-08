"use client";

import { useEffect, useState } from "react";
import { useRepository } from "../repository/RepositoryProvider";
import { Opportunity } from "../types/domain";

/** Where the lookup of a document's deal stands. "none": the document records no deal at all. */
export type OpportunityStatus = "none" | "loading" | "ready" | "missing" | "error";

/**
 * The deal (opportunity) a quotation, Proforma, Sales Order or Sales Invoice belongs to,
 * with an honest account of the lookup: still loading, found, not found, or could not be
 * read. It is what a document's customer is read from: the customer of a document is the
 * customer linked to its deal, nothing else. The state is tied to the id it was fetched
 * for, so the moment the document's deal changes (or arrives) the status is "loading"
 * again rather than briefly reading as "no deal".
 */
export function useDocumentOpportunity(opportunityId: string | undefined): { opportunity: Opportunity | null; status: OpportunityStatus } {
  const repo = useRepository();
  const [result, setResult] = useState<{ forId?: string; opportunity: Opportunity | null; failed: boolean }>({ opportunity: null, failed: false });

  useEffect(() => {
    if (!opportunityId) return;
    let cancelled = false;
    repo.opportunities
      .getById(opportunityId)
      .then((o) => {
        if (!cancelled) setResult({ forId: opportunityId, opportunity: o, failed: false });
      })
      .catch(() => {
        if (!cancelled) setResult({ forId: opportunityId, opportunity: null, failed: true });
      });
    return () => {
      cancelled = true;
    };
  }, [repo, opportunityId]);

  const status: OpportunityStatus = !opportunityId ? "none" : result.forId !== opportunityId ? "loading" : result.failed ? "error" : result.opportunity ? "ready" : "missing";
  return { opportunity: status === "ready" ? result.opportunity : null, status };
}
