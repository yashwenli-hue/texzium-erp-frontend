"use client";

import { useRef, useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { useRepository } from "../../lib/repository/RepositoryProvider";
import { useRestorePreview } from "../../lib/hooks/useDataDeletion";
import { ENTITY_NOUN, RestoreResult, daysLeft } from "../../lib/repository/shared/dataDeletion";
import { submitRestore } from "../../lib/ui/deletionFlow";
import { createSingleFlight } from "../../lib/ui/singleFlight";
import { formatDate } from "../../lib/format";

/**
 * Puts a record back from the Recycle Bin. The server decides whether it can be: the
 * dialog shows the answer (still inside the 30 days? has anything it needs gone, or taken
 * its name, code, PAN or GSTIN since?), what it will put back, and only an eligible record
 * gets the button. Nothing is restored until the server says so; a second activation is
 * ignored; if something changed since the preview (409) the dialog says so and offers to
 * review again. The success message belongs to the caller, shown only after onRestored.
 */
export function RestoreRecordDialog({
  recordId,
  onClose,
  onRestored,
}: {
  recordId: string;
  onClose: () => void;
  onRestored: (result: RestoreResult) => void;
}) {
  const repo = useRepository();
  const { data: preview, loading, error: loadError, reload } = useRestorePreview(recordId);
  const [submitting, setSubmitting] = useState(false);
  const [stale, setStale] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const flight = useRef(createSingleFlight()).current;

  const noun = preview ? ENTITY_NOUN[preview.entityType] : "record";
  const eligible = !!preview?.eligible;

  async function confirm() {
    // A second activation while one is running changes nothing, not even the busy state.
    if (!preview || !eligible || stale || flight.isBusy()) return;
    setError(null);
    setSubmitting(true);
    const outcome = await submitRestore(repo.dataDeletions, flight, recordId, preview.version);
    if (outcome.kind === "ignored") return;
    setSubmitting(false);
    switch (outcome.kind) {
      case "done":
        onRestored(outcome.result);
        return;
      case "stale":
        setStale(outcome.message);
        return;
      case "blocked":
      case "closed":
        setError(outcome.message);
        setStale(null);
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

  return (
    <Modal
      title={preview ? `Restore ${noun} — ${preview.label}` : "Restore"}
      onClose={close}
      footer={
        <>
          <Button variant="ghost" onClick={close} disabled={submitting}>
            {preview && !eligible ? "Close" : "Cancel"}
          </Button>
          {eligible && !stale && (
            <Button variant="primary" onClick={confirm} disabled={submitting}>
              {submitting ? "Restoring…" : `Restore ${noun}`}
            </Button>
          )}
          {stale && (
            <Button
              variant="primary"
              onClick={() => {
                setStale(null);
                reload();
              }}
            >
              Review again
            </Button>
          )}
        </>
      }
    >
      <div className="gov-dialog" data-testid="restore-dialog" data-state={loading ? "loading" : loadError ? "error" : stale ? "stale" : eligible ? "eligible" : "blocked"}>
        {loading && !preview && (
          <p className="gov-muted" role="status" aria-busy="true">
            Checking whether it can be restored…
          </p>
        )}
        {loadError && !preview && (
          <div role="alert" className="gov-alert">
            <b>Couldn&apos;t check this record.</b> {loadError.message}
            <div style={{ marginTop: 8 }}>
              <Button variant="ghost" onClick={reload}>
                Try again
              </Button>
            </div>
          </div>
        )}

        {preview && eligible && (
          <>
            <p className="gov-lead">
              This puts the {noun} back, with its original identity and history. It was deleted on {formatDate(preview.deletedAt)}; it can be restored until {formatDate(preview.purgeAfter)} ({daysLeft(preview.purgeAfter)} {daysLeft(preview.purgeAfter) === 1 ? "day" : "days"} left).
            </p>
            <div className="gov-box" data-testid="restore-impact">
              <div className="gov-box-title">Will be put back</div>
              <ul>
                {preview.restores.map((line) => (
                  <li key={line.label}>
                    <span>{line.label}</span>
                    <b className="tnum">{line.count}</b>
                  </li>
                ))}
              </ul>
              <p className="gov-keeps">
                <Icon name="info" size={13} /> A note that it was restored is added to its history.
              </p>
            </div>
          </>
        )}

        {preview && !eligible && (
          <>
            <div role="alert" className="gov-alert" data-testid="restore-blocked">
              <b>This {noun} can&apos;t be restored.</b>
            </div>
            <ul className="gov-blockers" data-testid="restore-conflicts">
              {preview.conflicts.map((c) => (
                <li key={c.code} data-code={c.code}>
                  <span className="gov-blocker-msg">{c.message}</span>
                </li>
              ))}
            </ul>
            {preview.conflicts.some((c) => c.code !== "RESTORE_WINDOW_EXPIRED" && c.code !== "ALREADY_RESTORED" && c.code !== "ALREADY_PURGED") && (
              <p className="gov-muted">Resolve what is listed (for example change the other record), then check again.</p>
            )}
            <Button variant="ghost" onClick={reload}>
              Check again
            </Button>
          </>
        )}

        {stale && (
          <div role="alert" className="gov-alert" data-testid="restore-stale">
            <b>This record changed after you reviewed it.</b> Review it again before restoring.
          </div>
        )}
        {error && (
          <p className="gov-error" role="alert" data-testid="restore-error">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
