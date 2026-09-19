export type TagColor = "g" | "w" | "b" | "i" | "n";

export function Tag({ children, color }: { children: React.ReactNode; color: TagColor }) {
  return <span className={`tag ${color}`}>{children}</span>;
}

/** Maps domain status/stage strings to a consistent tag color across the app. */
export const STAGE_COLOR: Record<string, TagColor> = {
  // "New" is shared with CustomerStatus (see LEAD_STATUS_COLOR below for why
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

// Dedicated color map for the verified Lead lifecycle (LEAD_STATUSES in
// lib/types/domain.ts). Kept separate from the shared STAGE_COLOR above
// because "New" and "Qualified" are reused there by CustomerStatus and
// OpportunityStage with different intended colors — this keeps Lead's own
// four statuses mutually distinguishable (design review Stage 1.3.1 §1.3)
// without leaking that requirement into Customers/Opportunities. No new
// status values are introduced, only presentation color.
export const LEAD_STATUS_COLOR: Record<string, TagColor> = {
  New: "n",
  Contacted: "w",
  Qualified: "g",
  Rejected: "b",
};

export function LeadStatusTag({ status }: { status: string }) {
  return <Tag color={LEAD_STATUS_COLOR[status] ?? "n"}>{status}</Tag>;
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
