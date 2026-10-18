"use client";

import { useState } from "react";
import { Modal } from "../ui/Modal";
import { TextField, TextAreaField } from "../ui/FormField";
import { Button } from "../ui/Button";
import { useToast } from "../ui/Toast";
import { toLocalDateTimeInput } from "../../lib/format";
import { FormError } from "../ui/FormError";

/**
 * Create or reschedule a LeadFollowup. VERIFIED CreateFollowupDto: leadId,
 * followupDate, remarks?. Reschedule only accepts { followupDate } — remarks
 * isn't editable there, so the field is hidden in that mode. See
 * docs/backend-ui-contract.md §5.
 */
export function FollowupForm({
  mode,
  initialDate,
  onClose,
  onSubmit,
}: {
  mode: "create" | "reschedule";
  initialDate?: string;
  onClose: () => void;
  onSubmit: (followupDate: string, remarks?: string) => Promise<unknown>;
}) {
  const toast = useToast();
  const [followupDate, setFollowupDate] = useState(initialDate ? toLocalDateTimeInput(initialDate) : "");
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!followupDate) {
      setError("Pick a follow-up date and time.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(new Date(followupDate).toISOString(), mode === "create" ? remarks.trim() || undefined : undefined);
      toast.success(mode === "create" ? "Follow-up scheduled" : "Follow-up rescheduled");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title={mode === "create" ? "Schedule Follow-up" : "Reschedule Follow-up"}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Saving…" : mode === "create" ? "Schedule" : "Reschedule"}
          </Button>
        </>
      }
    >
      <TextField
        label="Follow-up Date & Time"
        type="datetime-local"
        required
        value={followupDate}
        onChange={(e) => setFollowupDate(e.target.value)}
      />
      {mode === "create" && (
        <TextAreaField
          label="Remarks"
          rows={3}
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="What needs to happen on this follow-up? (optional)"
        />
      )}
      <FormError message={error} />
    </Modal>
  );
}
