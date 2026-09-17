const SHAPES = {
  up: [4, 10, 7, 14, 11, 18, 15, 22],
  down: [22, 18, 20, 14, 16, 10, 12, 6],
  flat: [12, 13, 11, 13, 12, 14, 12, 13],
};

export function Sparkline({ dir }: { dir: "up" | "down" | "flat" }) {
  const pts = SHAPES[dir];
  const max = Math.max(...pts);
  const min = Math.min(...pts);
  const w = 62;
  const h = 25;
  const step = w / (pts.length - 1);
  const norm = (v: number) => h - ((v - min) / (max - min || 1)) * h;
  const d = pts.map((v, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${norm(v).toFixed(1)}`).join(" ");
  const color = dir === "up" ? "var(--good)" : dir === "down" ? "var(--bad)" : "var(--faint)";
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: "visible" }}>
      <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
