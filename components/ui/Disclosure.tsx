import { ReactNode } from "react";
import { Icon } from "./Icon";

/**
 * A secondary list that stays out of the way until asked for: the documents under
 * a deal, the older history. A native <details>, so it is keyboard-operable and
 * announced correctly by assistive technology without any script, and it renders
 * the same on the server and the client. `count` says how much is inside before it
 * is opened.
 */
export function Disclosure({
  summary,
  count,
  defaultOpen,
  children,
  testId,
}: {
  summary: string;
  count?: number;
  defaultOpen?: boolean;
  children: ReactNode;
  testId?: string;
}) {
  return (
    <details className="disclosure" open={defaultOpen} data-testid={testId}>
      <summary>
        <span className="d-label">{summary}</span>
        {count !== undefined && <span className="d-count">{count}</span>}
        <Icon name="down" size={14} className="d-chev" />
      </summary>
      <div className="d-body">{children}</div>
    </details>
  );
}
