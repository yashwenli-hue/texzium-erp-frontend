"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRepository } from "../repository/RepositoryProvider";
import { DeletionEntityType, DeletionLogEntry, DeletionLogQuery, DeletionPreview, RestorePreview } from "../repository/shared/dataDeletion";
import { ComboOption } from "../ui/comboboxSearch";
import { formatLeadLocationShort } from "../geo/leadLocation";

interface Loaded<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  reload: () => void;
}

/** One async read, with the same shape everywhere: the latest request wins, a reload re-runs it. */
function useLoaded<T>(load: (() => Promise<T>) | null, deps: unknown[]): Loaded<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!!load);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);
  const latest = useRef(0);

  useEffect(() => {
    if (!load) {
      setLoading(false);
      return;
    }
    const mine = ++latest.current;
    setLoading(true);
    setError(null);
    load().then(
      (value) => {
        if (mine === latest.current) {
          setData(value);
          setLoading(false);
        }
      },
      (err) => {
        if (mine === latest.current) {
          setError(err instanceof Error ? err : new Error("Something went wrong."));
          setLoading(false);
        }
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, loading, error, reload };
}

export function useDeletionPreview(entityType: DeletionEntityType, id: string): Loaded<DeletionPreview> {
  const repo = useRepository();
  return useLoaded(() => repo.dataDeletions.preview(entityType, id), [repo, entityType, id]);
}

export function useRestorePreview(recordId: string): Loaded<RestorePreview> {
  const repo = useRepository();
  return useLoaded(() => repo.dataDeletions.restorePreview(recordId), [repo, recordId]);
}

export function useDeletionLog(query?: DeletionLogQuery, enabled = true): Loaded<DeletionLogEntry[]> {
  const repo = useRepository();
  return useLoaded(enabled ? () => repo.dataDeletions.list(query) : null, [repo, enabled, JSON.stringify(query ?? {})]);
}

/**
 * The records a duplicate can name as the survivor: every other lead (or customer), found by
 * name, phone or code. Loaded only once it is wanted.
 */
export function useSurvivorOptions(entityType: DeletionEntityType, excludeId: string, wanted: boolean): Loaded<ComboOption[]> {
  const repo = useRepository();
  return useLoaded(
    wanted
      ? async () => {
          if (entityType === "LEAD") {
            const page = await repo.leads.list(undefined, { includeInactive: true });
            return page.items
              .filter((l) => l.id !== excludeId)
              .map((l) => ({
                value: l.id,
                label: l.customerName,
                hint: [l.companyName, formatLeadLocationShort(l)].filter(Boolean).join(" · ") || l.phone,
                keywords: [l.phone, l.email ?? "", l.companyName ?? "", l.alternatePhone ?? ""].filter(Boolean),
              }));
          }
          const page = await repo.customers.list();
          return page.items
            .filter((c) => c.id !== excludeId)
            .map((c) => ({ value: c.id, label: c.customerName, hint: c.customerCode, keywords: [c.customerCode, c.panNumber ?? "", c.phone ?? "", c.email ?? ""].filter(Boolean) }));
        }
      : null,
    [repo, entityType, excludeId, wanted]
  );
}
