"use client";

import { useRef, useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { TextField } from "../ui/FormField";
import { useRepository } from "../../lib/repository/RepositoryProvider";
import { DeletionLogEntry, ENTITY_LABEL, ENTITY_NOUN, PurgeResult, recoveryText, typedNameMatches } from "../../lib/repository/shared/dataDeletion";
import { canConfirmPurge, submitPurge } from "../../lib/ui/deletionFlow";
import { createSingleFlight } from "../../lib/ui/singleFlight";
import { formatDate } from "../../lib/format";

/**
 * Erases the saved copy of a record in the Recycle Bin, for good. An administrator may do this
 * at any time: after the recovery period (the copy would be erased automatically soon anyway)
 * or before it, for example for test records.
 *
 * It says plainly what it is: irreversible, the record can never be restored through
 * RevenueOS afterwards. It shows what is about to be erased (kind, name, how much recovery time
 * is left), asks the person to tick that they understand, and, while the record could still be
 * restored or not, to type its name as well. While the request runs both buttons and the fields are
 * inert and a second activation is ignored (one request); if someone restored or erased the
 * record in the meantime (409) the dialog says so and the list is refreshed. The success
 * message belongs to the caller, shown only after onPurged.
 */
export function PurgeRecordDialog({
  entry,
  onClose,
  onPurged,
  onOutOfDate,
}: {
  entry: DeletionLogEntry;
  onClose: () => void;
  onPurged: (result: PurgeResult) => void;
  /** The record turned out to be restored or erased already: refresh the list behind. */
  onOutOfDate?: () => void;
}) {
  const repo = useRepository();
  const noun = ENTITY_NOUN[entry.entityType];
  const recoverable = entry.status === "DELETED" && entry.recoverable;
  const [acknowledged, setAcknowledged] = useState(false);
  const [typed, setTyped] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [closed, setClosed] = useState(false);
  const flight = useRef(createSingleFlight()).current;

  // The name of a record that can still be restored (the only kind this dialog is for): it is the safe identifying label.
  const name = entry.entityLabel ?? "";
  const typedOk = typedNameMatches(typed, name);
  const ready = canConfirmPurge({ acknowledged, typedOk, submitting }) && !closed;

  async function confirm() {
    // A second activation while one is running changes nothing, not even the busy state.
    if (!ready || flight.isBusy()) return;
    setError(null);
    setSubmitting(true);
    const outcome = await submitPurge(repo.dataDeletions, flight, entry.id);
    if (outcome.kind === "ignored") return;
    setSubmitting(false);
    switch (outcome.kind) {
      case "done":
        onPurged(outcome.result);
        return;
      case "closed":
        setClosed(true);
        setError(outcome.message);
        onOutOfDate?.();
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
        {closed ? "Close" : "Cancel"}
      </Button>
      {!closed && (
        <Button variant="primary" className="danger" onClick={confirm} disabled={!ready} aria-describedby={!ready && !submitting ? "purge-why" : undefined}>
          {submitting ? "Erasing…" : "Erase permanently"}
        </Button>
      )}
    </>
  );

  return (
    <Modal title={`Erase permanently — ${name}`} onClose={close} footer={footer}>
      <div className="gov-dialog" data-testid="purge-dialog" data-recoverable={recoverable ? "true" : "false"}>
        <div role="alert" className="gov-alert gov-alert-danger">
          <b>This cannot be undone.</b> Erasing removes the saved copy of this {noun} for good. Afterwards it can never be restored through RevenueOS, not even by an administrator.
        </div>

        <dl className="bin-detail" data-testid="purge-facts">
          <div><dt>Kind</dt><dd>{ENTITY_LABEL[entry.entityType]}</dd></div>
          <div><dt>Name</dt><dd><b>{name}</b>{entry.entityCode ? ` · ${entry.entityCode}` : ""}</dd></div>
          <div><dt>Deleted</dt><dd>{formatDate(entry.deletedAt)}</dd></div>
          <div><dt>Recovery time left</dt><dd data-testid="purge-recovery">{recoveryText(entry)}</dd></div>
        </dl>

        {recoverable && (
          <p className="gov-warn" data-testid="purge-early-warning">
            <Icon name="info" size={13} /> Its recovery period is still open: until then it could be restored. Erasing it now ends that. (Left alone, it is erased automatically when the period ends.)
          </p>
        )}
        {!recoverable && (
          <p className="gov-muted">Its recovery period has ended. It would be erased automatically soon; erasing it now does the same.</p>
        )}
        <p className="gov-muted">The entry stays in the Deletion Log, marked as erased, with who erased it and when.</p>

        {!closed && (
          <>
            <label className="gov-check">
              <input type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} disabled={submitting} data-testid="purge-ack" />
              <span>I understand that this is permanent and that this {noun} can no longer be recovered.</span>
            </label>
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
              data-testid="purge-typed"
            />
            <span id="purge-why" className="sr-only">
              {!acknowledged ? "Tick that you understand this is permanent. " : ""}
              {!typedOk ? `Type the ${noun}'s name to confirm.` : ""}
            </span>
          </>
        )}

        {error && (
          <p className="gov-error" role="alert" data-testid="purge-error">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
