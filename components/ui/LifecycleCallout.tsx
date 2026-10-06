import { ReactNode } from "react";
import { Icon } from "./Icon";

export type CalloutTone = "good" | "warn" | "bad" | "info" | "neutral";

/**
 * The line that says what is true of a document right now, what happens next,
 * and why something is locked. It sits above the commercial detail so a person
 * never has to work the state out from a disabled button. Presentational only.
 */
export function LifecycleCallout({
  tone,
  icon,
  title,
  children,
  actions,
  testId,
}: {
  tone: CalloutTone;
  icon: string;
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
  testId?: string;
}) {
  return (
    <div className={`callout ${tone}`} role="status" data-testid={testId}>
      <div className="ic" aria-hidden="true">
        <Icon name={icon} size={16} />
      </div>
      <div className="txt">
        <h4>{title}</h4>
        {children}
        {actions && <div className="callout-actions">{actions}</div>}
      </div>
    </div>
  );
}
