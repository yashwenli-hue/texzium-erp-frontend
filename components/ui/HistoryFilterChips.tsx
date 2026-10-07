"use client";

import { HISTORY_FILTER_LABEL, HistoryFilter } from "../../lib/repository/shared/customerCockpit";

/**
 * The filters of a history list ("All", "Status", "GST"…), each with how many
 * events it holds. Real buttons with aria-pressed, so they work from the keyboard
 * and are announced as toggles. Only the filters that have something in them are
 * passed in, so there is never a filter that shows nothing.
 */
export function HistoryFilterChips({ filters, value, onChange }: { filters: Array<{ filter: HistoryFilter; count: number }>; value: HistoryFilter; onChange: (f: HistoryFilter) => void }) {
  if (filters.length <= 2) return null; // "All" alone, or "All" and one other that equals it, filters nothing
  return (
    <div className="hist-filter" role="group" aria-label="Filter the history">
      {filters.map(({ filter, count }) => (
        <button key={filter} type="button" className={`chip ${value === filter ? "active" : ""}`} aria-pressed={value === filter} onClick={() => onChange(filter)}>
          {HISTORY_FILTER_LABEL[filter]} {count}
        </button>
      ))}
    </div>
  );
}
