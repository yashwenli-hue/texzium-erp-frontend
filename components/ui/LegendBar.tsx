export interface LegendRow {
  label: React.ReactNode;
  sub?: string;
  pct: number;
  value: string;
  color?: string;
}

export function LegendBar({ rows }: { rows: LegendRow[] }) {
  return (
    <div className="legend">
      {rows.map((r, i) => (
        <div className="row" key={i}>
          <div className="lab">
            {r.label}
            {r.sub && <small>{r.sub}</small>}
          </div>
          <div style={{ flex: 1.4 }}>
            <div className="bar">
              <i style={{ width: `${r.pct}%`, background: r.color }} />
            </div>
          </div>
          <div className="val tnum">{r.value}</div>
        </div>
      ))}
    </div>
  );
}
