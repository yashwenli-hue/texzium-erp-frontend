import { Lead } from "../../lib/types/domain";
import { sourceColor } from "./SourceBadge";

const R = 42;
const STROKE = 15;
const CIRC = 2 * Math.PI * R;

/**
 * Donut/ring chart, hand-rolled in inline SVG (no charting dependency —
 * the project has none and this doesn't warrant adding one). Same source
 * colors as SourceBadge so the ring and the Leads table badges read as one
 * system.
 */
export function SourceBreakdown({ leads }: { leads: Lead[] }) {
  const counts = new Map<string, number>();
  leads.forEach((l) => counts.set(l.sourceName, (counts.get(l.sourceName) ?? 0) + 1));
  const entries = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const total = leads.length;

  if (entries.length === 0) {
    return <p style={{ color: "var(--muted)", fontSize: 13 }}>No leads yet to break down by source.</p>;
  }

  let cumulative = 0;
  const segments = entries.map(([source, count]) => {
    const pct = total ? (count / total) * 100 : 0;
    const dash = (pct / 100) * CIRC;
    const seg = { source, count, pct, dash, offset: cumulative };
    cumulative += dash;
    return seg;
  });

  return (
    <div className="donut-wrap">
      <div className="donut-chart">
        <svg viewBox="0 0 100 100" width={128} height={128}>
          <circle cx="50" cy="50" r={R} fill="none" stroke="var(--line-2)" strokeWidth={STROKE} />
          <g transform="rotate(-90 50 50)">
            {segments.map((s) => (
              <circle
                key={s.source}
                cx="50"
                cy="50"
                r={R}
                fill="none"
                stroke={sourceColor(s.source)}
                strokeWidth={STROKE}
                strokeDasharray={`${s.dash} ${CIRC - s.dash}`}
                strokeDashoffset={-s.offset}
                strokeLinecap={segments.length > 1 ? "butt" : "round"}
              />
            ))}
          </g>
        </svg>
        <div className="donut-center">
          <b>{total}</b>
          <small>leads</small>
        </div>
      </div>
      <div className="donut-legend">
        {segments.map((s) => (
          <div className="dl-row" key={s.source}>
            <span className="dl-dot" style={{ background: sourceColor(s.source) }} />
            <span className="dl-name">{s.source}</span>
            <span className="dl-val">
              {s.count} <small>({Math.round(s.pct)}%)</small>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
