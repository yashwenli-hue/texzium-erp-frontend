"use client";

import { useId } from "react";
import { Button } from "./Button";
import type { ActionState } from "../../lib/repository/shared/quotationLifecycle";

export interface DocumentAction {
  key: string;
  label: string;
  icon?: string;
  variant?: "primary" | "ghost";
  /** Extra class, e.g. "danger-ghost" or "danger". */
  className?: string;
  state: ActionState;
  onClick: () => void;
}

function joinLabels(labels: string[]): string {
  if (labels.length <= 1) return labels[0] ?? "";
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}

/**
 * A document's action row. An action that is not available stays visible and
 * disabled, and the reason is written out below as text (a tooltip alone is
 * invisible on touch and to assistive technology). Actions that are unavailable
 * for the same reason are grouped into one line ("Approve, Revise and Reject —
 * A rejected quotation is final.").
 */
export function DocumentActions({ actions, testId }: { actions: DocumentAction[]; testId?: string }) {
  const baseId = useId();

  const reasons = new Map<string, string[]>();
  for (const a of actions) {
    if (!a.state.enabled && a.state.reason) {
      reasons.set(a.state.reason, [...(reasons.get(a.state.reason) ?? []), a.label]);
    }
  }
  const reasonIds = new Map([...reasons.keys()].map((r, i) => [r, `${baseId}-r${i}`]));

  return (
    <div data-testid={testId}>
      <div className="doc-actions">
        {actions.map((a) => (
          <Button
            key={a.key}
            variant={a.variant ?? "ghost"}
            icon={a.icon}
            className={a.className}
            disabled={!a.state.enabled}
            aria-describedby={!a.state.enabled && a.state.reason ? reasonIds.get(a.state.reason) : undefined}
            data-action={a.key}
            onClick={a.onClick}
          >
            {a.label}
          </Button>
        ))}
      </div>
      {reasons.size > 0 && (
        <ul className="action-reasons" aria-label="Why some actions are unavailable">
          {[...reasons.entries()].map(([reason, labels]) => (
            <li key={reason} id={reasonIds.get(reason)}>
              <span>
                <b>{joinLabels(labels)}</b> — {reason}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
