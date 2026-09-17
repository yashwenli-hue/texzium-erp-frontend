import { Icon } from "./Icon";

export interface LifecycleStepConfig {
  key: string;
  label: string;
}

/**
 * Horizontal progress stepper for gated, multi-stage backend lifecycles
 * (Opportunity stage today; Sales Order approval gates once Quote-to-Cash
 * lands). Collapses to a single compact line below the tablet breakpoint —
 * see .lifecycle-stepper / .lifecycle-compact in globals.css.
 *
 * `lostKey`/`lostLabel` render a distinct terminal flag for a dead-end
 * outcome (e.g. "Lost") instead of forcing it into the linear step order.
 */
export function LifecycleStepper({
  steps,
  currentKey,
  lostKey,
  lostLabel,
}: {
  steps: LifecycleStepConfig[];
  currentKey: string;
  lostKey?: string;
  lostLabel?: string;
}) {
  const isLost = !!lostKey && currentKey === lostKey;
  const currentIdx = steps.findIndex((s) => s.key === currentKey);
  const compactLabel = isLost
    ? lostLabel ?? "Lost"
    : currentIdx >= 0
    ? `Step ${currentIdx + 1} of ${steps.length}: ${steps[currentIdx].label}`
    : currentKey;

  return (
    <div className={`lifecycle-stepper-wrap ${isLost ? "lost" : ""}`}>
      <div className="lifecycle-stepper" role="list" aria-label="Lifecycle progress">
        {steps.map((s, i) => {
          const state = isLost ? "past" : i < currentIdx ? "done" : i === currentIdx ? "current" : "upcoming";
          return (
            <div className={`ls-step ls-${state}`} role="listitem" key={s.key}>
              <div className="ls-node">
                {state === "done" ? <Icon name="check" size={12} /> : <span>{i + 1}</span>}
              </div>
              <div className="ls-label">{s.label}</div>
              {i < steps.length - 1 && <div className="ls-connector" />}
            </div>
          );
        })}
        {isLost && (
          <div className="ls-lost-flag">
            <Icon name="close" size={13} /> {lostLabel ?? "Lost"}
          </div>
        )}
      </div>
      <div className="lifecycle-compact">{compactLabel}</div>
    </div>
  );
}
