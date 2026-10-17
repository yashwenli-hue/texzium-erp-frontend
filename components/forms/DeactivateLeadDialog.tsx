"use client";

import { useState } from "react";
import { Modal } from "../ui/Modal";
import { TextAreaField } from "../ui/FormField";
import { Button } from "../ui/Button";
import { useToast } from "../ui/Toast";
import {
  LEAD_DEACTIVATION_EFFECT,
  LEAD_DEACTIVATION_NOT_FOR,
  LEAD_DEACTIVATION_REASON_MAX_LENGTH,
  LEAD_DEACTIVATION_USE_FOR,
  describeDeactivationBlockers,
  validateDeactivationReason,
} from "../../lib/repository/shared/leadLifecycle";

/**
 * Deactivation is the safe way to remove an erroneous, duplicate, junk, test,
 * or otherwise invalid lead from active sales without deleting its historical
 * record. It is not a substitute for correcting valid lead information, so the
 * dialog says so and points to Edit for that case.
 *
 * `opportunities` / `pendingFollowups` only let the dialog explain a blocker up
 * front; the backend is the authority and its message is shown if it refuses.
 */
export function DeactivateLeadDialog({
  customerName,
  opportunities,
  pendingFollowups,
  onClose,
  onSubmit,
}: {
  customerName: string;
  opportunities: number;
  pendingFollowups: number;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<unknown>;
}) {
  const toast = useToast();
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const blocked = describeDeactivationBlockers({ opportunities, pendingFollowups });

  async function handleSubmit() {
    let clean: string;
    try {
      clean = validateDeactivationReason(reason);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Add a reason and try again.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(clean);
      toast.success(`${customerName} deactivated`);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not deactivate this lead. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title={`Deactivate Lead — ${customerName}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" className="danger" onClick={handleSubmit} disabled={submitting || !!blocked}>
            {submitting ? "Deactivating…" : "Deactivate Lead"}
          </Button>
        </>
      }
    >
      <p style={{ fontSize: 13.5 }}>{LEAD_DEACTIVATION_USE_FOR}</p>
      <p style={{ fontSize: 13.5, marginTop: 8 }}>{LEAD_DEACTIVATION_NOT_FOR}</p>
      <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 8 }}>{LEAD_DEACTIVATION_EFFECT}</p>

      {blocked ? (
        <div
          role="alert"
          style={{ marginTop: 14, padding: "10px 13px", borderRadius: 10, background: "var(--warn-bg)", color: "var(--text)", fontSize: 13 }}
        >
          <b>Not available right now.</b> {blocked}
          {opportunities > 0 && (
            <div style={{ marginTop: 4, color: "var(--muted)" }}>
              A lead with an opportunity is already part of the sales pipeline, so it can&apos;t be taken out of it.
            </div>
          )}
          {pendingFollowups > 0 && (
            <div style={{ marginTop: 4, color: "var(--muted)" }}>Complete or cancel its pending follow-ups first.</div>
          )}
        </div>
      ) : (
        <div style={{ marginTop: 14 }}>
          <TextAreaField
            label="Reason"
            required
            rows={3}
            maxLength={LEAD_DEACTIVATION_REASON_MAX_LENGTH}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="For example: duplicate of the Sterling Pumps lead"
          />
          <p style={{ color: "var(--faint-text)", fontSize: 11.5, marginTop: -4 }}>
            {reason.length}/{LEAD_DEACTIVATION_REASON_MAX_LENGTH}
          </p>
        </div>
      )}
      {error && <p style={{ color: "var(--bad)", fontSize: 12.5, marginTop: 8 }}>{error}</p>}
    </Modal>
  );
}
