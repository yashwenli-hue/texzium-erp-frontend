"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { SelectField, TextAreaField, TextField } from "../ui/FormField";
import { ComboboxField } from "../ui/Combobox";
import { useRepository } from "../../lib/repository/RepositoryProvider";
import { useDeletionPreview, useSurvivorOptions } from "../../lib/hooks/useDataDeletion";
import {
  DELETION_REASON_CODES,
  DELETION_REASON_LABEL,
  DELETION_REASON_MAX_LENGTH,
  DeletionBlocker,
  DeletionEntityType,
  DeletionReasonCode,
  DeletionResult,
  ENTITY_NOUN,
  RECOVERY_WINDOW_DAYS,
  canDeactivateInstead,
  normalizeReason,
  reasonProblem,
  typedNameMatches,
} from "../../lib/repository/shared/dataDeletion";
import { canConfirmDelete, submitDeletion } from "../../lib/ui/deletionFlow";
import { createSingleFlight } from "../../lib/ui/singleFlight";

/** A screen reader is told how many characters are left once this few remain. */
const COUNT_WARNING_AT = 50;
export function reasonCountStatus(left: number): string {
  const n = (k: number) => `${k} ${k === 1 ? "character" : "characters"}`;
  if (left < 0) return `${n(-left)} over the limit.`;
  return left <= COUNT_WARNING_AT ? `${n(left)} left.` : "";
}

/** The things that stand in the way, each with what it means and what to do. */
export function BlockerList({ blockers }: { blockers: DeletionBlocker[] }) {
  return (
    <ul className="gov-blockers" data-testid="deletion-blockers">
      {blockers.map((b) => (
        <li key={b.code} data-code={b.code}>
          <span className="gov-blocker-msg">{b.message}</span>
          {b.hint && <span className="gov-blocker-hint">{b.hint}</span>}
        </li>
      ))}
    </ul>
  );
}

/**
 * Moves a lead or a customer to the Recycle Bin. Preview first: the dialog asks the server
 * what stands in the way and what would go, and only an eligible record gets the form: a
 * reason (one of five, and 1-500 characters of explanation), for a duplicate the record that
 * survives (searched with the same combobox as the lead's location), and the record's name
 * typed back to confirm. The wording says what really happens: the record goes to the
 * Recycle Bin and can be restored for 30 days; it is erased automatically after that.
 *
 * Nothing is deleted until the server says so. While the request runs, the form and both
 * buttons are inert and a second activation is ignored (one request). If the record changed
 * after the preview (409), the dialog says so and offers to review again; if something now
 * stands in the way (409), it shows what. The success message belongs to the caller, shown
 * only after onDeleted.
 */
export function DeleteRecordDialog({
  entityType,
  id,
  name,
  onClose,
  onDeleted,
  onDeactivateInstead,
}: {
  entityType: DeletionEntityType;
  id: string;
  name: string;
  onClose: () => void;
  onDeleted: (result: DeletionResult) => void;
  /** For a lead: offered when deactivating would be possible instead of deleting. */
  onDeactivateInstead?: () => void;
}) {
  const repo = useRepository();
  const noun = ENTITY_NOUN[entityType];
  const { data: preview, loading, error: loadError, reload } = useDeletionPreview(entityType, id);
  const [reasonCode, setReasonCode] = useState<DeletionReasonCode | "">("");
  const [reason, setReason] = useState("");
  const [survivor, setSurvivor] = useState("");
  const [typed, setTyped] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [stale, setStale] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const flight = useRef(createSingleFlight()).current;
  const survivors = useSurvivorOptions(entityType, id, reasonCode === "DUPLICATE");
  const reasonId = useId();
  const countId = useId();

  const problem = reasonProblem(reason);
  const showProblem = reason.length > 0 && problem ? problem : undefined;
  const length = normalizeReason(reason).length;
  const typedOk = typedNameMatches(typed, name);
  const eligible = !!preview?.eligible;
  const ready = canConfirmDelete({ eligible, reasonCode, reasonProblem: problem, typedOk, submitting, stale: !!stale });

  // A new preview (after "review again") clears the stale notice.
  useEffect(() => {
    if (preview) setStale(null);
  }, [preview]);

  const survivorOptions = useMemo(() => survivors.data ?? [], [survivors.data]);

  async function confirm() {
    // A second activation while one is running changes nothing, not even the busy state.
    if (!preview || !reasonCode || !ready || flight.isBusy()) return;
    setError(null);
    setSubmitting(true);
    const outcome = await submitDeletion(repo.dataDeletions, flight, entityType, id, {
      reasonCode,
      reason,
      version: preview.version,
      ...(reasonCode === "DUPLICATE" && survivor ? { duplicateOfId: survivor } : {}),
    });
    if (outcome.kind === "ignored") return;
    setSubmitting(false);
    switch (outcome.kind) {
      case "done":
        onDeleted(outcome.result);
        return;
      case "stale":
        setStale(outcome.message);
        return;
      case "blocked":
        // Something now stands in the way: the preview shows what.
        setError(outcome.message);
        reload();
        return;
      case "error":
        setError(outcome.message);
        return;
    }
  }

  const close = () => {
    if (!submitting) onClose();
  };

  const footer = (
    <>
      <Button variant="ghost" onClick={close} disabled={submitting}>
        {preview && !eligible ? "Close" : "Cancel"}
      </Button>
      {eligible && !stale && (
        <Button variant="primary" className="danger" onClick={confirm} disabled={!ready} aria-describedby={!ready ? `${reasonId}-why` : undefined}>
          {submitting ? "Moving…" : "Move to Recycle Bin"}
        </Button>
      )}
      {stale && (
        <Button variant="primary" onClick={reload}>
          Review again
        </Button>
      )}
    </>
  );

  return (
    <Modal title={`Delete ${noun} — ${name}`} onClose={close} footer={footer}>
      <div className="gov-dialog" data-testid="delete-dialog" data-state={loading ? "loading" : loadError ? "error" : stale ? "stale" : eligible ? "eligible" : "blocked"}>
        {loading && !preview && (
          <p className="gov-muted" role="status" aria-busy="true">
            Checking what depends on this {noun}…
          </p>
        )}

        {loadError && !preview && (
          <div role="alert" className="gov-alert">
            <b>Couldn&apos;t check this {noun}.</b> {loadError.message}
            <div style={{ marginTop: 8 }}>
              <Button variant="ghost" onClick={reload}>
                Try again
              </Button>
            </div>
          </div>
        )}

        {preview && !eligible && (
          <>
            <div role="alert" className="gov-alert" data-testid="delete-blocked">
              <b>This {noun} can&apos;t be deleted.</b> It stays on record, because:
            </div>
            <BlockerList blockers={preview.blockers} />
            {entityType === "LEAD" && onDeactivateInstead && canDeactivateInstead(preview.blockers) && (
              <p className="gov-muted">
                If it should only leave active sales, you can{" "}
                <button type="button" className="linklike" onClick={onDeactivateInstead}>
                  deactivate it instead
                </button>
                .
              </p>
            )}
          </>
        )}

        {preview && eligible && (
          <>
            <p className="gov-lead">
              This moves the {noun} to the <b>Recycle Bin</b>. An administrator can restore it for {preview.recoveryDays || RECOVERY_WINDOW_DAYS} days. After that its saved copy is erased automatically.
            </p>

            <div className="gov-box" data-testid="delete-impact">
              <div className="gov-box-title">Goes to the Recycle Bin</div>
              <ul>
                {preview.removes.map((line) => (
                  <li key={line.label}>
                    <span>{line.label}</span>
                    <b className="tnum">{line.count}</b>
                  </li>
                ))}
              </ul>
              {preview.keeps.map((k) => (
                <p key={k} className="gov-keeps">
                  <Icon name="info" size={13} /> {k}
                </p>
              ))}
            </div>

            {stale ? (
              <div role="alert" className="gov-alert" data-testid="delete-stale">
                <b>This {noun} changed after you reviewed it.</b> Review it again before deleting. What you typed is kept.
              </div>
            ) : (
              <>
                <SelectField
                  label="Reason"
                  required
                  value={reasonCode}
                  onChange={(e) => setReasonCode(e.target.value as DeletionReasonCode | "")}
                  disabled={submitting}
                  options={[{ value: "", label: "Choose a reason", disabled: true }, ...DELETION_REASON_CODES.map((c) => ({ value: c, label: DELETION_REASON_LABEL[c] }))]}
                />

                {reasonCode === "DUPLICATE" && (
                  <ComboboxField
                    label={`Surviving ${noun} (optional)`}
                    hint={`The ${noun} that is kept. It is told, in its history, that this duplicate was deleted.`}
                    options={survivorOptions}
                    value={survivor}
                    onChange={setSurvivor}
                    placeholder={survivors.loading ? "Loading…" : `Search ${noun}s by name, phone or code`}
                    noMatchText={`No matching ${noun}`}
                    disabled={submitting || survivors.loading}
                  />
                )}
                {reasonCode === "DUPLICATE" && survivors.error && (
                  <p className="gov-muted" role="status">
                    The list of {noun}s could not be loaded; you can still delete without naming one.
                  </p>
                )}

                <TextAreaField
                  label="Explanation"
                  required
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={submitting}
                  error={showProblem}
                  placeholder={`For example: the same buyer was entered twice`}
                  aria-describedby={countId}
                />
                <div className="stage-count-row">
                  <span className="stage-hint">Kept with the record in the Deletion Log.</span>
                  <span id={countId} className={`stage-count${problem && reason.length > 0 ? " over" : ""}`} data-testid="reason-count">
                    {length}/{DELETION_REASON_MAX_LENGTH}
                  </span>
                </div>
                <span className="sr-only" role="status" aria-live="polite">
                  {reasonCountStatus(DELETION_REASON_MAX_LENGTH - length)}
                </span>

                <TextField
                  label={`Type the ${noun}'s name to confirm`}
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  disabled={submitting}
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  placeholder={name}
                  hint={`Type “${name}” exactly (capital letters and spacing do not matter).`}
                  data-testid="delete-typed"
                />
                <span id={`${reasonId}-why`} className="sr-only">
                  {!reasonCode ? "Choose a reason. " : ""}
                  {problem ? "Add an explanation. " : ""}
                  {!typedOk ? `Type the ${noun}'s name to confirm.` : ""}
                </span>
              </>
            )}
          </>
        )}

        {error && (
          <p className="gov-error" role="alert" data-testid="delete-error">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
