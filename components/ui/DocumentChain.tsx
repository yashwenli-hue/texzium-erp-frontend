import Link from "next/link";
import { ReactNode } from "react";
import { Icon } from "./Icon";

/**
 * The state of a stage of a chain. The same words are used by StageChain (the compact
 * chain of a deal): "normal" and "done" are an ordinary stage that exists, "current"
 * the one the work is at, "attention" one that needs someone, "upcoming" one not yet
 * reached, "closed" one that ended without leading on.
 */
export type ChainStageState = "normal" | "done" | "current" | "upcoming" | "closed" | "attention";

export interface ChainStage {
  key: string;
  /** "Quotation", "Proforma Invoice", "Sales Order" */
  label: string;
  /** The document's number, or what is missing ("Not created yet"). */
  title: string;
  href?: string;
  status?: ReactNode;
  /** One short line: what is true of this stage or what it is waiting for. */
  hint?: string;
  state: ChainStageState;
  /** The call to action that creates this stage, when it is available. */
  action?: ReactNode;
}

const STAGE_ICON: Record<string, string> = { quotation: "notepad", proforma: "receipt", order: "cart" };

/**
 * Quotation -> Proforma Invoice -> Sales Order, one card per stage with its state
 * and what it is waiting for, the document you are on highlighted. It replaces
 * the scattered "related documents" tables for the main story: a person can tell
 * where a deal stands without knowing how the backend links the documents.
 * Presentational only; it owns no Sales Order creation or editing.
 */
export function DocumentChain({ stages }: { stages: ChainStage[] }) {
  return (
    <ol className="doc-chain" aria-label="Quotation to Sales Order" data-testid="document-chain">
      {stages.map((s) => (
        <li
          key={s.key}
          className={`dc-stage ${s.state === "normal" || s.state === "done" ? "" : `dc-${s.state}`}`}
          aria-current={s.state === "current" ? "step" : undefined}
          data-stage={s.key}
        >
          <span className="dc-label">
            <Icon name={STAGE_ICON[s.key] ?? "file"} size={13} />
            {s.label}
          </span>
          {s.href && s.state !== "current" ? (
            <Link href={s.href} className="dc-title">
              {s.title}
            </Link>
          ) : (
            <span className="dc-title">{s.title}</span>
          )}
          {s.status && <div className="dc-status">{s.status}</div>}
          {s.hint && <div className="dc-hint">{s.hint}</div>}
          {s.action && <div className="dc-cta">{s.action}</div>}
        </li>
      ))}
    </ol>
  );
}
