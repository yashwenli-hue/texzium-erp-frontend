"use client";

import { useState } from "react";
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
  onConfirm,
  onClose,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  destructive?: boolean;
  noteLabel?: string;
  onConfirm: (note?: string) => Promise<unknown>;
  onClose: () => void;
}) {
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
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
      <p style={{ fontSize: 13.5, color: "var(--text)", marginBottom: noteLabel ? 14 : 0 }}>{body}</p>
      {noteLabel && (
        <TextAreaField
          label={noteLabel}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional — add context for the record"
        />
      )}
      {error && <p style={{ color: "var(--bad)", fontSize: 12.5 }}>{error}</p>}
    </Modal>
  );
}
