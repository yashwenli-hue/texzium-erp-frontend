/**
 * Work queues above a list: each a named, counted preset of the list's filters. Toggle buttons
 * (aria-pressed), so the chosen one is announced; the hint says what is in it. On a phone the row
 * scrolls sideways inside itself. Choosing a queue only filters the list.
 */
export interface QueueItem {
  key: string;
  label: string;
  hint: string;
  count?: number;
}

export function QueueBar({ items, active, onSelect, label = "Work queues" }: { items: QueueItem[]; active?: string; onSelect: (key: string) => void; label?: string }) {
  return (
    <div className="queue-bar" role="group" aria-label={label}>
      {items.map((q) => (
        <button key={q.key} type="button" className={`queue${active === q.key ? " active" : ""}`} aria-pressed={active === q.key} onClick={() => onSelect(q.key)} title={q.hint}>
          <span className="q-label">{q.label}</span>
          <span className="q-count" aria-label={q.count === undefined ? "count unavailable" : `${q.count} leads`}>{q.count ?? "–"}</span>
          <span className="q-hint">{q.hint}</span>
        </button>
      ))}
    </div>
  );
}
