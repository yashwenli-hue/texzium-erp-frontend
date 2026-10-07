"use client";

import { ReactNode, useState } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { TextAreaField } from "./FormField";

/**
 * Gated, permission-sensitive actions (Qualify, Reject) go through an
 * explicit confirm step rather than a casual drag — see the Lead detail
 * page. `noteLabel` optionally collects a remark (e.g. rejection reason)
 * that's passed back to onConfirm.
 */
export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  destructive,
  noteLabel,
  noteRequired,
  children,
  onConfirm,
  onClose,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  destructive?: boolean;
  noteLabel?: string;
  /** When true, `note` is required before onConfirm fires — e.g. the backend requires a rejection reason. */
  noteRequired?: boolean;
  /** More to read before deciding (what the action touches), shown under the sentence and above the note. */
  children?: ReactNode;
  onConfirm: (note?: string) => Promise<unknown>;
  onClose: () => void;
}) {
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (noteRequired && !note.trim()) {
      setError(`${noteLabel ?? "This field"} is required.`);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm(note.trim() || undefined);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            className={destructive ? "danger" : undefined}
            onClick={handleConfirm}
            disabled={submitting}
          >
            {submitting ? "Working…" : confirmLabel}
          </Button>
        </>
      }
    >
      <p style={{ fontSize: 13.5, color: "var(--text)", marginBottom: noteLabel || children ? 14 : 0 }}>{body}</p>
      {children && <div style={{ marginBottom: noteLabel ? 14 : 0 }}>{children}</div>}
      {noteLabel && (
        <TextAreaField
          label={noteLabel}
          required={noteRequired}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={noteRequired ? "Required — add context for the record" : "Optional — add context for the record"}
        />
      )}
      {error && <p style={{ color: "var(--bad)", fontSize: 12.5 }}>{error}</p>}
    </Modal>
  );
}
