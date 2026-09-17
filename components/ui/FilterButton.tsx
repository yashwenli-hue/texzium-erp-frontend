"use client";

import { useState, useRef, useEffect } from "react";
import { Icon } from "./Icon";
import { FilterMap } from "../../lib/types/common";

export interface FilterGroupConfig {
  key: string;
  label: string;
  options: string[];
}

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

  const activeCount = Object.values(value).filter((v) => v && v !== "All").length;

  function toggle(groupKey: string, option: string) {
    const current = value[groupKey];
    const next = current === option ? undefined : option;
    onChange({ ...value, [groupKey]: next });
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
            {groups.map((g) => (
              <div className="group" key={g.key}>
                <div className="group-label">{g.label}</div>
                <div className="filter-options">
                  {g.options.map((opt) => (
                    <span
                      key={opt}
                      className={`filter-opt ${value[g.key] === opt ? "active" : ""}`}
                      onClick={() => toggle(g.key, opt)}
                    >
                      {opt}
                    </span>
                  ))}
                </div>
              </div>
            ))}
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
