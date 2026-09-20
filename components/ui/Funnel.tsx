import { Lead, isQualifiedLeadStatus } from "../../lib/types/domain";
import { Icon } from "./Icon";

const FUNNEL_LABELS = ["New", "Contacted", "Qualified"];
const RAMP: { shade: string; txt: string }[] = [
  { shade: "#A7F3D0", txt: "#065F46" },
  { shade: "#34D399", txt: "#fff" },
  { shade: "#059669", txt: "#fff" },
];

/**
 * Lead qualification funnel: New → Contacted → Qualified. "Won"/"Lost"/
 * "Proposal"/"Negotiation" no longer appear here — those are Opportunity
 * stages (a Lead's lifecycle ends at Qualified or Rejected; see
 * lib/types/domain.ts). Rejected leads are called out as a separate
 * leakage stat rather than a funnel stage, since rejection is a gated
 * action, not a step in the qualification sequence. "Qualified" counts
 * both the enum's own QUALIFIED value and SALES_ASSIGNED — the status the
 * real qualify() action actually sets (see isQualifiedLeadStatus).
 */
export function LeadFunnel({ leads }: { leads: Lead[] }) {
  const total = leads.length;
  const counts = [
    leads.filter((l) => l.status === "NEW").length,
    leads.filter((l) => l.status === "CONTACTED" || l.status === "PRE_SALES_ASSIGNED").length,
    leads.filter((l) => isQualifiedLeadStatus(l.status)).length,
  ];
  const maxCount = Math.max(...counts, 1);
  const rejectedCount = leads.filter((l) => l.status === "REJECTED").length;

  let worstIdx = -1;
  let worstDrop = -Infinity;
  for (let i = 0; i < counts.length - 1; i++) {
    if (counts[i] > 0) {
      const drop = (counts[i] - counts[i + 1]) / counts[i];
      if (drop > worstDrop) {
        worstDrop = drop;
        worstIdx = i;
      }
    }
  }

  return (
    <div className="funnel">
      {FUNNEL_LABELS.map((label, i) => {
        const count = counts[i];
        const pct = count === 0 ? 4 : Math.max(8, (count / maxCount) * 100);
        const flagged = i === worstIdx && worstDrop > 0;
        const ramp = RAMP[i];
        return (
          <div className="f" key={label}>
            <div
              className="bx"
              style={{
                width: `${pct}%`,
                background: flagged ? "var(--bad)" : ramp.shade,
                color: ramp.txt,
              }}
            >
              {label}
            </div>
            <div className="meta">
              <b>{count}</b> leads <span className="tnum">({total ? Math.round((count / total) * 100) : 0}%)</span>
              {flagged && (
                <span
                  style={{
                    color: "var(--bad)",
                    fontWeight: 600,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    marginLeft: 6,
                  }}
                >
                  <Icon name="alert" size={14} /> weakest conversion — {Math.round(worstDrop * 100)}% drop to next stage
                </span>
              )}
            </div>
          </div>
        );
      })}
      {rejectedCount > 0 && (
        <div className="f" style={{ marginTop: 2 }}>
          <div className="bx" style={{ width: "auto", minWidth: 74, background: "var(--bad-bg)", color: "var(--bad)" }}>
            Rejected
          </div>
          <div className="meta">
            <b>{rejectedCount}</b> lead{rejectedCount === 1 ? "" : "s"} did not qualify{" "}
            <span className="tnum">({total ? Math.round((rejectedCount / total) * 100) : 0}%)</span>
          </div>
        </div>
      )}
    </div>
  );
}
