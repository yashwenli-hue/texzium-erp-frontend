import { LeadStatus } from "../../lib/types/domain";

export type TagColor = "g" | "w" | "b" | "i" | "n";

export function Tag({ children, color }: { children: React.ReactNode; color: TagColor }) {
  return <span className={`tag ${color}`}>{children}</span>;
}

/** Maps domain status/stage strings to a consistent tag color across the app. */
export const STAGE_COLOR: Record<string, TagColor> = {
  // "New" is shared with CustomerStatus (see LEAD_STATUS_STYLE below for why
  // Lead itself no longer reads this entry) — design review Stage 1.3.1 §3
  // asks Customer's New badge to be blue.
  New: "i",
  Contacted: "n",
  Qualified: "n",
  Proposal: "w",
  Negotiation: "i",
  Won: "g",
  Lost: "b",
  Active: "g",
  "At Risk": "w",
  Churned: "b",
  Draft: "n",
  Revised: "w",
  Approved: "g",
  Converted: "i",
  Rejected: "b",
  "Decision Maker": "i",
  Champion: "g",
  Influencer: "n",
  Hot: "b",
  Warm: "w",
  // Design review Stage 1.3.1 §1.3: Cold must read as blue, distinguishable
  // from Hot (red) and Warm (amber).
  Cold: "i",
  High: "b",
  Medium: "w",
  Low: "n",
};

export function StatusTag({ status }: { status: string }) {
  return <Tag color={STAGE_COLOR[status] ?? "n"}>{status}</Tag>;
}

// Dedicated lifecycle palette for the verified Lead statuses (LEAD_STATUSES
// in lib/types/domain.ts) — its own hue per stage, separate from the
// shared STAGE_COLOR palette above and from Score's own deep red/amber/blue
// (see LEAD_SCORE_STYLE below). New/blue and Qualified/green read as the
// natural "entry" and "success" cues; Contacted gets a hue (teal) neither
// Score nor Follow-up use anywhere, so a Warm+Contacted+Due-Today row never
// shows three same-colored badges; Rejected keeps the deep filled
// purple/indigo treatment as the clearly terminal state. Where a status
// happens to share a hue family with Score (New/blue vs. Cold/blue), the
// tint-vs-solid-fill weight keeps them visually distinct at a glance — see
// design review Stage 1.3 patch 04 §3. No new status values are
// introduced, only presentation color, and the text label always renders
// alongside it so nothing depends on color alone.
export const LEAD_STATUS_STYLE: Record<LeadStatus, { bg: string; fg: string }> = {
  New: { bg: "#DBEAFE", fg: "#1E3A8A" },
  Contacted: { bg: "#CCFBF1", fg: "#0F766E" },
  Qualified: { bg: "#D1FAE5", fg: "#065F46" },
  Rejected: { bg: "#4338CA", fg: "#FFFFFF" },
};

export function LeadStatusTag({ status }: { status: string }) {
  const style = LEAD_STATUS_STYLE[status as LeadStatus] ?? { bg: "var(--line-2)", fg: "var(--muted)" };
  return (
    <span className="tag" style={{ background: style.bg, color: style.fg }}>
      {status}
    </span>
  );
}

// Deep/saturated solid-fill treatment for Lead Score (Hot/Warm/Cold) —
// reuses the app's existing red/amber/blue brand tokens (--bad/--warn/
// --info) but as a bold filled pill (white text) instead of the pale tint
// every other badge in the app uses, so Score reads as its own
// higher-contrast "heat scale," distinct in weight from both Status's
// lifecycle palette and Follow-up's urgency palette even where a hue
// (blue) is shared. See design review Stage 1.3 patch 04 §2.
export const LEAD_SCORE_STYLE: Record<string, { bg: string; fg: string }> = {
  Hot: { bg: "var(--bad)", fg: "#FFFFFF" },
  Warm: { bg: "var(--warn)", fg: "#FFFFFF" },
  Cold: { bg: "var(--info)", fg: "#FFFFFF" },
};

export function LeadScoreTag({ score, suffix }: { score: string; suffix?: string }) {
  const style = LEAD_SCORE_STYLE[score] ?? { bg: "var(--line-2)", fg: "var(--muted)" };
  return (
    <span className="tag" style={{ background: style.bg, color: style.fg }}>
      {score}
      {suffix ? ` ${suffix}` : ""}
    </span>
  );
}

export const TINT: Record<TagColor, { bg: string; fg: string }> = {
  n: { bg: "var(--line-2)", fg: "var(--muted)" },
  w: { bg: "var(--warn-bg)", fg: "var(--warn)" },
  i: { bg: "var(--info-bg)", fg: "var(--info)" },
  g: { bg: "var(--good-bg)", fg: "var(--good)" },
  b: { bg: "var(--bad-bg)", fg: "var(--bad)" },
};

export function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <span
      className={`chip ${active ? "active" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {label}
    </span>
  );
}

export function ChipGroup({ children }: { children: React.ReactNode }) {
  return <div className="chips">{children}</div>;
}
