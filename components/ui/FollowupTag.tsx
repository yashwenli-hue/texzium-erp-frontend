import { FollowupUrgency } from "../../lib/followup";
import { formatDate } from "../../lib/format";

const STYLE: Record<FollowupUrgency, { bg: string; fg: string }> = {
  Overdue: { bg: "var(--bad-bg)", fg: "var(--bad)" },
  "Due Today": { bg: "var(--warn-bg)", fg: "var(--warn)" },
  Tomorrow: { bg: "var(--info-bg)", fg: "var(--info)" },
  Scheduled: { bg: "var(--line-2)", fg: "var(--muted)" },
  None: { bg: "transparent", fg: "var(--faint)" },
};

/** MOCK/UI-ONLY — derived from mock Task data, not a real backend Followup. See lib/followup.ts. */
export function FollowupTag({ urgency, dueAt }: { urgency: FollowupUrgency; dueAt: string | null }) {
  const style = STYLE[urgency];
  if (urgency === "None") {
    return <span style={{ fontSize: 12, color: "var(--faint)" }}>No follow-up</span>;
  }
  const label = urgency === "Scheduled" && dueAt ? formatDate(dueAt) : urgency;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontSize: 11.5,
        fontWeight: 700,
        padding: "4px 9px",
        borderRadius: 20,
        background: style.bg,
        color: style.fg,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />
      {label}
    </span>
  );
}
