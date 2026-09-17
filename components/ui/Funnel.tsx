import { Lead, LeadStage } from "../../lib/types/domain";
import { Icon } from "./Icon";

const FUNNEL_STAGES: LeadStage[] = ["New", "Contacted", "Qualified", "Proposal", "Negotiation", "Won"];
const RAMP: { shade: string; txt: string }[] = [
  { shade: "#A7F3D0", txt: "#065F46" },
  { shade: "#6EE7B7", txt: "#065F46" },
  { shade: "#34D399", txt: "#fff" },
  { shade: "#10B981", txt: "#fff" },
  { shade: "#059669", txt: "#fff" },
  { shade: "#047857", txt: "#fff" },
];

/**
 * Single-hue funnel (light → dark) with the weakest stage-to-stage
 * conversion flagged in the status "bad" color. Counts are computed live
 * from whatever leads currently exist — this deliberately does NOT reuse
 * the prototype's hardcoded 1,284/870/540/... figures, since those were
 * fictional prototype data, not real production numbers.
 */
export function LeadFunnel({ leads }: { leads: Lead[] }) {
  const counts = FUNNEL_STAGES.map((stage) => leads.filter((l) => l.stage === stage).length);
  const maxCount = Math.max(...counts, 1);

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
      {FUNNEL_STAGES.map((stage, i) => {
        const count = counts[i];
        const pct = count === 0 ? 4 : Math.max(8, (count / maxCount) * 100);
        const flagged = i === worstIdx && worstDrop > 0;
        const ramp = RAMP[i];
        return (
          <div className="f" key={stage}>
            <div
              className="bx"
              style={{
                width: `${pct}%`,
                background: flagged ? "var(--bad)" : ramp.shade,
                color: ramp.txt,
              }}
            >
              {stage}
            </div>
            <div className="meta">
              <b>{count}</b> leads
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
    </div>
  );
}
