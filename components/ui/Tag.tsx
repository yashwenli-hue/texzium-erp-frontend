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

// Dedicated indigo/violet family for the verified Lead lifecycle
// (LEAD_STATUSES in lib/types/domain.ts) — deliberately its own hue,
// separate from the shared STAGE_COLOR palette above. Score (Hot/Warm/Cold)
// already spans red/amber/blue and Follow-up (Overdue/Due/Upcoming) spans
// red/amber/blue/grey, so Status previously ended up reusing the same
// tones and reading as "the same visual system" in a Lead Master row. This
// keeps the four statuses mutually distinguishable via lightness/fill
// (not hue alone) while staying visually unmistakable as its own group —
// see design review Stage 1.3.3 §2. No new status values are introduced,
// only presentation color, and the text label is always rendered alongside
// it so nothing depends on color alone.
export const LEAD_STATUS_STYLE: Record<LeadStatus, { bg: string; fg: string }> = {
  New: { bg: "#EEF2FF", fg: "#4F46E5" },
  Contacted: { bg: "#E0E7FF", fg: "#4338CA" },
  Qualified: { bg: "#C7D2FE", fg: "#312E81" },
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
