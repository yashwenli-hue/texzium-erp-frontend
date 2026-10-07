import Link from "next/link";
import { ChainStageState } from "./DocumentChain";
import { Icon } from "./Icon";
import { MoneyText } from "./MoneyText";

/** One step of a StageChain. Nothing in it is specific to any module: whoever builds the steps decides what they mean. */
export interface StageChainStep {
  key: string;
  label: string;
  state: ChainStageState;
  /** One or two words: "Approved", "Pending store approval", "Overdue". */
  summary: string;
  tone?: "bad" | "warn" | "action" | "info" | "good";
  amount?: number;
  /** How many documents sit at this step when there is more than one. */
  count?: number;
  /** The record this step is, when it has one: the step is then a link to it. */
  href?: string;
}

const STATE_ICON: Record<ChainStageState, string> = { normal: "check", done: "check", current: "pulse", attention: "alert", upcoming: "clock", closed: "close" };
const STATE_WORD: Record<ChainStageState, string> = { normal: "done", done: "done", current: "in progress", attention: "needs attention", upcoming: "not started", closed: "closed" };
const SAME_AS_DONE = (s: ChainStageState) => (s === "normal" ? "done" : s);

/**
 * The compact sibling of DocumentChain: the same idea (the stages of something, each
 * with its state and where to go), made small enough to sit several to a page, one for
 * every deal, as a row of steps or, when it is narrow, a list. DocumentChain stays the
 * large one-card-per-stage chain of a document's own page; they share their state words
 * (ChainStageState), so the two read the same.
 *
 * A step with a record is a link to it. State is never colour alone: every step has an
 * icon and its state written for assistive technology; the step the work is at is
 * marked aria-current. The row/list switch follows the chain's own width (a container
 * query), the same on the server and the client. Presentational only: it knows nothing
 * about what the stages are.
 */
export function StageChain({ steps, label = "Progress" }: { steps: StageChainStep[]; label?: string }) {
  return (
    <div className="sc-wrap">
      <ol className="stage-chain" aria-label={label} data-testid="stage-chain">
        {steps.map((s) => {
          const state = SAME_AS_DONE(s.state);
          const marked = state === "current" || state === "attention";
          const body = (
            <>
              <span className="sc-head">
                <Icon name={STATE_ICON[s.state]} size={13} />
                <span className="sc-label">{s.label}</span>
              </span>
              <span className="sc-summary">
                {s.summary}
                {s.count ? ` ×${s.count}` : ""}
              </span>
              {s.amount !== undefined && (
                <span className="sc-amount">
                  <MoneyText value={s.amount} />
                </span>
              )}
              <span className="sr-only">{`, ${STATE_WORD[s.state]}`}</span>
            </>
          );
          return (
            <li key={s.key} className={`sc-step sc-${state} sc-tone-${s.tone ?? "info"}`} aria-current={marked ? "step" : undefined} data-step={s.key}>
              {s.href ? (
                <Link href={s.href} className="sc-link">
                  {body}
                </Link>
              ) : (
                <span className="sc-link">{body}</span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
