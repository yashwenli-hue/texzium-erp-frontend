"use client";

import { useEffect, useState } from "react";
import { useRepository } from "../repository/RepositoryProvider";
import { SearchResults } from "../repository/interfaces";

const DEBOUNCE_MS = 180;

/**
 * Live, debounced search against the current dataset. Debouncing is done
 * here (not in the repository) since it's a UI concern — the real API
 * repository will receive the same debounced calls as the mock does.
 */
const EMPTY_RESULTS: SearchResults = {
  leads: [],
  customers: [],
  contacts: [],
  quotations: [],
  notes: [],
  opportunities: [],
  salesOrders: [],
  salesInvoices: [],
};

export function useSearch() {
  const repo = useRepository();
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY_RESULTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!term.trim()) {
      setResults(EMPTY_RESULTS);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    let cancelled = false;
    const handle = setTimeout(() => {
      repo.search
        .search(term)
        .then((r) => {
          if (cancelled) return;
          setResults(r);
          setLoading(false);
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          setError(err instanceof Error ? err.message : "Search failed. Please try again.");
          setResults(EMPTY_RESULTS);
          setLoading(false);
        });
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [term, repo]);

  const totalCount =
    results.leads.length +
    results.customers.length +
    results.contacts.length +
    results.quotations.length +
    results.notes.length +
    results.opportunities.length +
    results.salesOrders.length +
    results.salesInvoices.length;

  return { term, setTerm, results, loading, error, totalCount };
}
