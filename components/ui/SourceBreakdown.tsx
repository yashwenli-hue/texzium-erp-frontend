import { Lead } from "../../lib/types/domain";
import { LegendBar } from "./LegendBar";

const PALETTE = ["#6366F1", "#F59E0B", "#0EA5E9", "#EC4899", "#84CC16", "#94A3B8"];

export function SourceBreakdown({ leads }: { leads: Lead[] }) {
  const counts = new Map<string, number>();
  leads.forEach((l) => counts.set(l.source, (counts.get(l.source) ?? 0) + 1));
  const entries = [...counts.entries()].sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) {
    return <p style={{ color: "var(--muted)", fontSize: 13 }}>No leads yet to break down by source.</p>;
  }

  const max = Math.max(...entries.map((e) => e[1]));

  return (
    <LegendBar
      rows={entries.map(([source, count], i) => ({
        label: (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
            <i
              style={{
                width: 9,
                height: 9,
                borderRadius: 3,
                background: PALETTE[i % PALETTE.length],
                display: "inline-block",
              }}
            />
            {source}
          </span>
        ),
        pct: (count / max) * 100,
        value: `${count} lead${count === 1 ? "" : "s"}`,
        color: PALETTE[i % PALETTE.length],
      }))}
    />
  );
}
