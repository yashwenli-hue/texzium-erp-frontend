import { ReactNode } from "react";

/**
 * Wraps a screen's skeleton so it is announced: assistive technology hears
 * "Loading customers" instead of silence, and the region is marked busy. The
 * skeleton itself stays decorative. Presentational only.
 */
export function LoadingRegion({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}
