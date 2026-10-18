import Link from "next/link";
import { Icon } from "./Icon";

export interface JourneyStep {
  key: string;
  label: string;
  detail?: string;
  state: "done" | "current" | "todo" | "stopped";
  href?: string;
}

/**
 * Where a record is in the sales journey (Received → Pre-sales → Qualified → Opportunity → Quotation),
 * the same strip on the lead and the opportunity, so both pages answer "what stage is this" the same
 * way. Steps that are another record link to it. An ordered list; the current step is marked for
 * assistive technology. On a phone it scrolls sideways inside itself, never the page.
 */
export function RecordJourney({ steps, label = "Sales journey" }: { steps: JourneyStep[]; label?: string }) {
  return (
    <ol className="journey" aria-label={label}>
      {steps.map((s) => {
        const body = (
          <>
            <span className="j-dot" aria-hidden="true">
              {s.state === "done" ? <Icon name="check" size={11} /> : s.state === "stopped" ? <Icon name="close" size={11} /> : null}
            </span>
            <span className="j-text">
              <span className="j-label">{s.label}</span>
              {s.detail && <span className="j-detail">{s.detail}</span>}
            </span>
          </>
        );
        return (
          <li key={s.key} className={`j-${s.state}`} aria-current={s.state === "current" || s.state === "stopped" ? "step" : undefined}>
            {s.href ? <Link href={s.href} className="j-link">{body}</Link> : body}
          </li>
        );
      })}
    </ol>
  );
}
