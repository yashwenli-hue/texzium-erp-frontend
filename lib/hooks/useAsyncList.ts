"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface AsyncListState<T> {
  data: T | undefined;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Generic "fetch on mount / dependency change, expose a refetch()" hook.
 * Every entity hook (useLeads, useCustomers, ...) is a thin wrapper around
 * this, calling into a repository method. This is deliberately the same
 * shape you'd use against a real REST API (loading/error/data/refetch),
 * so swapping the mock repository for the real one requires no change here.
 */
export function useAsyncList<T>(
  fetcher: () => Promise<T>,
  deps: React.DependencyList
): AsyncListState<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetcherRef
      .current()
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  return { data, loading, error, refetch };
}
