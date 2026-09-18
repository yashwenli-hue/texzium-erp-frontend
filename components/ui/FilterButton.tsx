"use client";

import { useState, useRef, useEffect } from "react";
import { Icon } from "./Icon";
import { FilterMap } from "../../lib/types/common";

export interface FilterGroupConfig {
  key: string;
  label: string;
  options: string[];
}

function valuesOf(value: FilterMap, key: string): string[] {
  const v = value[key];
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

/** Multi-select filter popover: each group's active options are toggled independently. */
export function FilterButton({
  groups,
  value,
  onChange,
}: {
  groups: FilterGroupConfig[];
  value: FilterMap;
  onChange: (next: FilterMap) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const activeCount = groups.reduce((n, g) => n + valuesOf(value, g.key).length, 0);

  function toggle(groupKey: string, option: string) {
    const current = valuesOf(value, groupKey);
    const next = current.includes(option) ? current.filter((v) => v !== option) : [...current, option];
    onChange({ ...value, [groupKey]: next.length ? next : undefined });
  }

  return (
    <div style={{ position: "relative", display: "inline-block" }} ref={ref}>
      <button className="btn ghost" onClick={() => setOpen((o) => !o)}>
        <Icon name="filter" size={16} />
        Filter{activeCount > 0 ? ` (${activeCount})` : ""}
      </button>
      {open && (
        <>
          <div className="filter-backdrop" onClick={() => setOpen(false)} />
          <div className="filter-panel">
            <h4>Filter</h4>
            {groups.map((g) => {
              const active = valuesOf(value, g.key);
              return (
                <div className="group" key={g.key}>
                  <div className="group-label">{g.label}</div>
                  <div className="filter-options">
                    {g.options.map((opt) => (
                      <span
                        key={opt}
                        className={`filter-opt ${active.includes(opt) ? "active" : ""}`}
                        onClick={() => toggle(g.key, opt)}
                      >
                        {active.includes(opt) && <Icon name="check" size={11} />}
                        {opt}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
              <button className="btn ghost sm" onClick={() => onChange({})}>
                Clear all
              </button>
              <button className="btn primary sm" onClick={() => setOpen(false)}>
                Done
              </button>
            </div>
          </div>
        </>
      )}
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
