"use client";

import { useId, useRef, useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { OpportunityStageTag } from "../ui/Tag";
import { TextAreaField } from "../ui/FormField";
import { useAuth } from "../../lib/auth/AuthContext";
import { OpportunityStage, formatOpportunityStage } from "../../lib/types/domain";
import {
  OPPORTUNITY_STAGE_REMARK_MAX_LENGTH,
  OpportunityStageConflictError,
  StageDialogCopy,
  normalizeStageRemark,
  stageDialogCopy,
  stageRemarkProblem,
} from "../../lib/repository/shared/opportunityStage";
import { SingleFlight, createSingleFlight } from "../../lib/ui/singleFlight";

/** A screen reader is told how many characters are left once this few remain. */
const COUNT_WARNING_AT = 50;

const characters = (n: number) => `${n} ${n === 1 ? "character" : "characters"}`;

/** What is spoken about the remark's length: nothing until it matters. */
export function countStatus(left: number): string {
  if (left < 0) return `${characters(-left)} over the limit.`;
  return left <= COUNT_WARNING_AT ? `${characters(left)} left.` : "";
}

/**
 * The one confirmation for every opportunity stage change: the opportunity page (forward,
 * back, Won, Lost) and the dashboard board (every drop). It shows the transition being
 * made, which account is making it, and an optional remark that is kept with the history
 * event, apart from the system's own sentence. The account is the signed-in user, which
 * the server takes from the request: nothing about who is acting is ever sent.
 *
 * Nothing moves until Confirm. While the request runs, Confirm and Cancel are inert and
 * a second activation is ignored, so a double click cannot move (or fail) twice. A move
 * the server refuses is explained in the dialog; one made stale by someone else's move
 * leaves only Close, because confirming the same move again could not succeed.
 */
export function OpportunityStageDialog({
  opportunityTitle,
  customerName,
  from,
  to,
  onConfirm,
  onClose,
}: {
  opportunityTitle: string;
  customerName?: string;
  from: OpportunityStage;
  to: OpportunityStage;
  /** Makes the move. Receives the trimmed remark, or undefined when there is none. Throws to keep the dialog open with the message. */
  onConfirm: (remark: string | undefined) => Promise<unknown>;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const copy = stageDialogCopy(from, to);
  const [remark, setRemark] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const flight = useRef(createSingleFlight()).current;

  const problem = stageRemarkProblem(remark);

  return (
    <Modal
      title={copy.title}
      // Closing while the request is on its way would hide an outcome the person is waiting for.
      onClose={submitting ? () => {} : onClose}
      footer={
        <StageDialogFooter
          copy={copy}
          stale={stale}
          submitting={submitting}
          blocked={!!problem}
          onClose={onClose}
          onConfirm={() =>
            confirmStageMove({ flight, remark, stale, onConfirm, onClose, setSubmitting, setError, setStale })
          }
        />
      }
    >
      <StageDialogBody
        opportunityTitle={opportunityTitle}
        customerName={customerName}
        from={from}
        to={to}
        copy={copy}
        actor={user?.email}
        remark={remark}
        onRemark={setRemark}
        submitting={submitting}
        stale={stale}
        error={error}
      />
    </Modal>
  );
}

/** What Confirm does. The state is the dialog's; it is passed in so the sequence can be tested without a browser. */
export async function confirmStageMove({
  flight,
  remark,
  stale,
  onConfirm,
  onClose,
  setSubmitting,
  setError,
  setStale,
}: {
  flight: SingleFlight;
  remark: string;
  stale: boolean;
  onConfirm: (remark: string | undefined) => Promise<unknown>;
  onClose: () => void;
  setSubmitting: (busy: boolean) => void;
  setError: (message: string | null) => void;
  setStale: (stale: boolean) => void;
}): Promise<void> {
  if (stale || stageRemarkProblem(remark)) return;
  await flight.run(async () => {
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm(normalizeStageRemark(remark));
      onClose();
    } catch (err) {
      if (err instanceof OpportunityStageConflictError) setStale(true);
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  });
}

export function StageDialogFooter({
  copy,
  stale,
  submitting,
  blocked,
  onClose,
  onConfirm,
}: {
  copy: StageDialogCopy;
  stale: boolean;
  submitting: boolean;
  /** The remark cannot be sent (too long). */
  blocked: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (stale) {
    return (
      <Button variant="primary" onClick={onClose}>
        Close
      </Button>
    );
  }
  return (
    <>
      <Button variant="ghost" onClick={onClose} disabled={submitting}>
        Cancel
      </Button>
      <Button variant="primary" className={copy.destructive ? "danger" : undefined} onClick={onConfirm} disabled={submitting || blocked}>
        {submitting ? "Working…" : copy.confirmLabel}
      </Button>
    </>
  );
}

export function StageDialogBody({
  opportunityTitle,
  customerName,
  from,
  to,
  copy,
  actor,
  remark,
  onRemark,
  submitting,
  stale,
  error,
}: {
  opportunityTitle: string;
  customerName?: string;
  from: OpportunityStage;
  to: OpportunityStage;
  copy: StageDialogCopy;
  /** The signed-in account, for display only. */
  actor?: string;
  remark: string;
  onRemark: (text: string) => void;
  submitting: boolean;
  stale: boolean;
  error: string | null;
}) {
  const countId = useId();
  const hintId = useId();
  const problem = stageRemarkProblem(remark);
  const length = normalizeStageRemark(remark)?.length ?? 0;
  const left = OPPORTUNITY_STAGE_REMARK_MAX_LENGTH - length;

  return (
    <div className="stage-dialog" data-testid="stage-dialog" data-kind={copy.kind}>
      <p className="stage-deal">
        <b>{opportunityTitle}</b>
        {customerName ? <span> · {customerName}</span> : null}
      </p>

      <div className="stage-transition" role="group" aria-label={`Stage change: ${formatOpportunityStage(from)} to ${formatOpportunityStage(to)}`} data-testid="stage-transition">
        <OpportunityStageTag stage={from} />
        <span className="arrow" aria-hidden="true">
          <Icon name="arrow" size={14} />
        </span>
        <OpportunityStageTag stage={to} />
      </div>

      {copy.note && <p className="stage-note">{copy.note}</p>}

      <p className="stage-actor" data-testid="stage-actor">
        Recorded under <b>{actor ?? "your account"}</b>
      </p>

      {stale ? null : (
        <>
          <TextAreaField
            label="Remark (optional)"
            rows={4}
            value={remark}
            onChange={(e) => onRemark(e.target.value)}
            disabled={submitting}
            error={problem ?? undefined}
            placeholder="Why this move, or what happens next. It is kept in the opportunity's history."
            aria-describedby={`${hintId} ${countId}`}
          />
          <div className="stage-count-row">
            <span id={hintId} className="stage-hint">
              Optional. Shown in the history next to your name.
            </span>
            <span id={countId} className={`stage-count${problem ? " over" : ""}`} data-testid="stage-count">
              {length}/{OPPORTUNITY_STAGE_REMARK_MAX_LENGTH}
            </span>
          </div>
          <span className="sr-only" role="status" aria-live="polite" data-testid="stage-count-status">
            {countStatus(left)}
          </span>
        </>
      )}

      {error && (
        <p className="stage-error" role="alert" data-testid="stage-error">
          {error}
        </p>
      )}
    </div>
  );
}
