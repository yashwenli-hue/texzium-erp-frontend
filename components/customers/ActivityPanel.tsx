"use client";

import { useMemo, useState } from "react";
import { Button } from "../ui/Button";
import { CustomerHistory } from "../ui/DocumentLifecycleHistory";
import { HistoryFilterChips } from "../ui/HistoryFilterChips";
import { HistoryFilter, filterCustomerEvents, historyFilterCounts } from "../../lib/repository/shared/customerCockpit";
import type { CustomerEvent } from "../../lib/types/domain";

const RECENT = 5;

/**
 * The customer's history: the latest few entries, with the rest one press away and
 * filters (All, Status, Details, GST, Deals) once there is enough to filter. The list
 * is the same CustomerHistory the page used before; this only decides how much of it
 * to show and which part.
 */
export function ActivityPanel({ events, loading, error, onRetry }: { events: CustomerEvent[]; loading?: boolean; error?: Error | null; onRetry?: () => void }) {
  const [filter, setFilter] = useState<HistoryFilter>("all");
  const [showAll, setShowAll] = useState(false);
  const filters = useMemo(() => historyFilterCounts(events), [events]);
  const filtered = useMemo(() => filterCustomerEvents(events, filter), [events, filter]);
  const hidden = showAll ? 0 : Math.max(0, filtered.length - RECENT);
  // Whether the whole history reaches back to the creation event, whatever is filtered or folded.
  const startsAtCreation = events.some((e) => e.action === "CUSTOMER_CREATED");
  return (
    <section className="card panel" id="activity" aria-labelledby="activity-title" data-testid="activity-panel">
      <div className="panel-head">
        <h3 id="activity-title">Activity</h3>
      </div>
      <HistoryFilterChips filters={filters} value={filter} onChange={(f) => { setFilter(f); setShowAll(false); }} />
      <CustomerHistory events={filtered} limit={showAll ? undefined : RECENT} startsAtCreation={startsAtCreation} showFoot={filter === "all"} loading={loading} error={error} onRetry={onRetry} />
      {(hidden > 0 || (showAll && filtered.length > RECENT)) && (
        <div className="activity-more">
          <Button variant="ghost" className="sm" onClick={() => setShowAll((v) => !v)}>
            {showAll ? "Show fewer" : `Show ${hidden} earlier`}
          </Button>
        </div>
      )}
    </section>
  );
}
