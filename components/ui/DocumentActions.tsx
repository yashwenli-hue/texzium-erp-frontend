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
 *
 * `size="sm"` is the row-sized version for the actions of one row in a list (a GST
 * registration, say): small buttons, and the reason lines span the whole row.
 * `sharedReason` is for a list whose rows are all locked for one reason: the caller
 * writes that reason once above the list (an element with `id`), and the buttons
 * locked for it point at that element instead of each row repeating the sentence.
 */
export function DocumentActions({
  actions,
  testId,
  size,
  sharedReason,
}: {
  actions: DocumentAction[];
  testId?: string;
  size?: "sm";
  sharedReason?: { id: string; text: string };
}) {
  const baseId = useId();
  const compact = size === "sm";
  const isShared = (a: DocumentAction) => !!sharedReason && !a.state.enabled && a.state.reason === sharedReason.text;

  const reasons = new Map<string, string[]>();
  for (const a of actions) {
    if (!a.state.enabled && a.state.reason && !isShared(a)) {
      reasons.set(a.state.reason, [...(reasons.get(a.state.reason) ?? []), a.label]);
    }
  }
  const reasonIds = new Map([...reasons.keys()].map((r, i) => [r, `${baseId}-r${i}`]));

  return (
    <div data-testid={testId} className={compact ? "da-contents" : undefined}>
      <div className={compact ? "doc-actions compact" : "doc-actions"}>
        {actions.map((a) => (
          <Button
            key={a.key}
            variant={a.variant ?? "ghost"}
            icon={a.icon}
            className={`${compact ? "sm " : ""}${a.className ?? ""}`.trim() || undefined}
            disabled={!a.state.enabled}
            aria-describedby={isShared(a) ? sharedReason!.id : !a.state.enabled && a.state.reason ? reasonIds.get(a.state.reason) : undefined}
            data-action={a.key}
            onClick={a.onClick}
          >
            {a.label}
          </Button>
        ))}
      </div>
      {reasons.size > 0 && (
        <ul className={compact ? "action-reasons compact" : "action-reasons"} aria-label="Why some actions are unavailable">
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
