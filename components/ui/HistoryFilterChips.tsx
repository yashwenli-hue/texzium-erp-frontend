"use client";

import { HISTORY_FILTER_LABEL, HistoryFilter } from "../../lib/repository/shared/customerCockpit";
import { FilterChips } from "./FilterChips";

/**
 * The filters of a history list ("All", "Status", "GST"…), each with how many
 * events it holds: FilterChips for a history. Offered only when they filter something
 * ("All" alone, or "All" and one category that equals it, filters nothing).
 */
export function HistoryFilterChips({ filters, value, onChange }: { filters: Array<{ filter: HistoryFilter; count: number }>; value: HistoryFilter; onChange: (f: HistoryFilter) => void }) {
  if (filters.length <= 2) return null;
  return (
    <div className="hist-filter">
      <FilterChips label="Filter the history" value={value} onChange={onChange} options={filters.map(({ filter, count }) => ({ value: filter, label: HISTORY_FILTER_LABEL[filter], count }))} />
    </div>
  );
}
