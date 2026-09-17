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
export function useSearch() {
  const repo = useRepository();
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<SearchResults>({
    leads: [],
    customers: [],
    contacts: [],
    quotations: [],
    notes: [],
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!term.trim()) {
      setResults({ leads: [], customers: [], contacts: [], quotations: [], notes: [] });
      setLoading(false);
      return;
    }
    setLoading(true);
    const handle = setTimeout(() => {
      repo.search.search(term).then((r) => {
        setResults(r);
        setLoading(false);
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [term, repo]);

  const totalCount =
    results.leads.length +
    results.customers.length +
    results.contacts.length +
    results.quotations.length +
    results.notes.length;

  return { term, setTerm, results, loading, totalCount };
}
