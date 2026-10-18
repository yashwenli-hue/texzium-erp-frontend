"use client";

import { useEffect, useState } from "react";
import { useRepository } from "../repository/RepositoryProvider";
import { PRESALES_QUEUES, queueCountQuery } from "../repository/shared/presalesQueues";

/**
 * How many leads each Pre-Sales queue holds, inside what the person may see (each count is the
 * backend's own total for that filter). Fetched once per visit and when `refreshKey` changes; a
 * count that cannot be read is left out (the queue still works).
 */
export function usePresalesQueueCounts(me: string | null, showDeactivated: boolean, refreshKey: unknown): Record<string, number | undefined> {
  const repo = useRepository();
  const [counts, setCounts] = useState<Record<string, number | undefined>>({});
  useEffect(() => {
    let cancelled = false;
    for (const q of PRESALES_QUEUES) {
      const query = queueCountQuery(q, me, { showDeactivated });
      if (!query) continue;
      repo.leads
        .search(query)
        .then((r) => !cancelled && setCounts((c) => ({ ...c, [q.key]: r.total })))
        .catch(() => !cancelled && setCounts((c) => ({ ...c, [q.key]: undefined })));
    }
    return () => {
      cancelled = true;
    };
  }, [repo, me, showDeactivated, refreshKey]);
  return counts;
}
