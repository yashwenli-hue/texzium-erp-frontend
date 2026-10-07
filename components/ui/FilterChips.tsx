"use client";

/**
 * A row of filter choices, one of which is on ("All 12", "Needs GST 3"…). Real
 * buttons with aria-pressed, so they work from the keyboard and are announced as
 * toggles (the older `Chip` is a styled span). Only pass the choices that hold
 * something, so there is never a filter that shows nothing.
 */
export function FilterChips<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: Array<{ value: T; label: string; count?: number }>;
  value: T;
  onChange: (v: T) => void;
  /** What is being filtered, for assistive technology ("Filter customers"). */
  label: string;
}) {
  return (
    <div className="chips filter-chips" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" className={`chip ${value === o.value ? "active" : ""}`} aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
          {o.count !== undefined ? ` ${o.count}` : ""}
        </button>
      ))}
    </div>
  );
}
