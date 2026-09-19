"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "./Icon";
import { FilterMap } from "../../lib/types/common";

export interface FilterGroupConfig {
  key: string;
  label: string;
  options: string[];
}

export function valuesOf(value: FilterMap, key: string): string[] {
  const v = value[key];
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

const SEARCH_THRESHOLD = 6;

/**
 * One compact multi-select dropdown for a single filter group. A search
 * box only appears once a group has enough options to warrant one — the
 * "many options → searchable dropdown" rule from the design review.
 */
function FilterDropdown({
  group,
  active,
  onChange,
}: {
  group: FilterGroupConfig;
  active: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const filteredOptions = useMemo(
    () => group.options.filter((o) => o.toLowerCase().includes(query.toLowerCase())),
    [group.options, query]
  );

  function toggle(option: string) {
    onChange(active.includes(option) ? active.filter((v) => v !== option) : [...active, option]);
  }

  return (
    <div className="fd" ref={ref}>
      <button className={`fd-trigger ${active.length ? "active" : ""}`} onClick={() => setOpen((o) => !o)}>
        {group.label}
        {active.length > 0 && <span className="fd-count">{active.length}</span>}
        <Icon name="down" size={12} />
      </button>
      {open && (
        <div className="fd-panel">
          {group.options.length > SEARCH_THRESHOLD && (
            <input
              className="fd-search"
              placeholder={`Search ${group.label.toLowerCase()}…`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          )}
          <div className="fd-options">
            {filteredOptions.length === 0 && <div className="fd-empty">No matches</div>}
            {filteredOptions.map((opt) => (
              <label className="fd-opt" key={opt}>
                <input type="checkbox" checked={active.includes(opt)} onChange={() => toggle(opt)} />
                {opt}
              </label>
            ))}
          </div>
          {active.length > 0 && (
            <button className="fd-clear" onClick={() => onChange([])}>
              Clear {group.label.toLowerCase()}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * A row of independent compact filter dropdowns, one per group — replaces
 * a single long combined popover so each dimension (Status, Source, City,
 * …) stays quick to scan and search on its own. Wraps on narrow screens.
 */
export function FilterBar({
  groups,
  value,
  onChange,
}: {
  groups: FilterGroupConfig[];
  value: FilterMap;
  onChange: (next: FilterMap) => void;
}) {
  return (
    <div className="filter-bar">
      {groups.map((g) => (
        <FilterDropdown
          key={g.key}
          group={g}
          active={valuesOf(value, g.key)}
          onChange={(next) => onChange({ ...value, [g.key]: next.length ? next : undefined })}
        />
      ))}
    </div>
  );
}

/** Removable chips mirroring every currently active filter value, plus a "Clear all". */
export function ActiveFilterChips({
  groups,
  value,
  onChange,
}: {
  groups: FilterGroupConfig[];
  value: FilterMap;
  onChange: (next: FilterMap) => void;
}) {
  const active = groups.flatMap((g) => valuesOf(value, g.key).map((v) => ({ groupKey: g.key, groupLabel: g.label, value: v })));
  if (active.length === 0) return null;

  function remove(groupKey: string, v: string) {
    const current = valuesOf(value, groupKey).filter((x) => x !== v);
    onChange({ ...value, [groupKey]: current.length ? current : undefined });
  }

  return (
    <div className="active-filter-chips">
      {active.map((a) => (
        <span className="af-chip" key={`${a.groupKey}:${a.value}`}>
          <span className="af-chip-label">{a.groupLabel}:</span> {a.value}
          <button onClick={() => remove(a.groupKey, a.value)} aria-label={`Remove ${a.groupLabel} filter ${a.value}`}>
            <Icon name="close" size={11} />
          </button>
        </span>
      ))}
      {active.length > 1 && (
        <button className="af-clear" onClick={() => onChange({})}>
          Clear all
        </button>
      )}
    </div>
  );
}
