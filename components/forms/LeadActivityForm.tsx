"use client";

import { useState } from "react";
import { Modal } from "../ui/Modal";
import { SelectField, TextField, TextAreaField, FieldRow } from "../ui/FormField";
import { Button } from "../ui/Button";
import { useToast } from "../ui/Toast";
import { LogLeadActivityInput } from "../../lib/repository/interfaces";
import { validateLeadActivityInput } from "../../lib/repository/shared/leadActivity";
import {
  CALL_OUTCOME_LABEL,
  CallOutcome,
  LEAD_ACTIVITY_REMARKS_MAX_LENGTH,
  LEAD_ACTIVITY_TYPES,
  LeadActivityType,
  leadActivityMeta,
} from "../../lib/types/domain";

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const OUTCOMES: Array<{ value: CallOutcome | ""; label: string }> = [
  { value: "", label: "Not recorded" },
  { value: "CONNECTED", label: CALL_OUTCOME_LABEL.CONNECTED },
  { value: "NOT_CONNECTED", label: CALL_OUTCOME_LABEL.NOT_CONNECTED },
];

/**
 * Logs an interaction with a lead (call, meeting, email, WhatsApp, ...) without changing
 * its status. A call can carry its outcome; "Not connected (CNC)" records the attempt and
 * moves nothing. There is no "logged by" field: the signed-in user is recorded by the
 * backend, in connected and mock mode alike. Follow-ups are scheduled separately.
 */
export function LeadActivityForm({
  customerName,
  onClose,
  onSubmit,
  initialType = "CALL",
  initialOutcome,
  context,
}: {
  customerName: string;
  onClose: () => void;
  onSubmit: (input: LogLeadActivityInput) => Promise<unknown>;
  initialType?: LeadActivityType;
  initialOutcome?: CallOutcome;
  /** Where the form was opened from, e.g. "for the opportunity Needle loom", shown under the title. */
  context?: string;
}) {
  const toast = useToast();
  const [activityType, setActivityType] = useState<LeadActivityType>(initialType);
  const [outcome, setOutcome] = useState<CallOutcome | "">(initialOutcome ?? "");
  const [when, setWhen] = useState(() => toLocalInputValue(new Date()));
  const [whenEdited, setWhenEdited] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    // Only send a time the person actually chose; otherwise the backend stamps "now".
    const input: LogLeadActivityInput = {
      activityType,
      remarks,
      ...(activityType === "CALL" && outcome ? { outcome } : {}),
      occurredAt: whenEdited && when ? new Date(when).toISOString() : undefined,
    };
    try {
      validateLeadActivityInput(input);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Check the details and try again.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(input);
      toast.success(
        activityType === "CALL" && outcome === "NOT_CONNECTED" ? "Call logged as not connected (CNC)" : `${leadActivityMeta(activityType).label} logged`,
      );
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong logging the activity. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title={`Log Activity — ${customerName}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Logging…" : "Log Activity"}
          </Button>
        </>
      }
    >
      {context && <p className="form-context">{context}</p>}
      <FieldRow>
        <SelectField
          label="Activity Type"
          value={activityType}
          onChange={(e) => setActivityType(e.target.value as LeadActivityType)}
          options={LEAD_ACTIVITY_TYPES.map((t) => ({ value: t.value, label: t.label }))}
        />
        <TextField
          label="When it happened"
          type="datetime-local"
          value={when}
          max={toLocalInputValue(new Date())}
          onChange={(e) => { setWhen(e.target.value); setWhenEdited(true); }}
        />
      </FieldRow>
      {activityType === "CALL" && (
        <fieldset className="choice-row">
          <legend>Call outcome</legend>
          {OUTCOMES.map((o) => (
            <label key={o.value || "none"} className={`choice${outcome === o.value ? " on" : ""}`}>
              <input type="radio" name="call-outcome" value={o.value} checked={outcome === o.value} onChange={() => setOutcome(o.value)} />
              {o.label}
            </label>
          ))}
        </fieldset>
      )}
      <TextAreaField
        label={activityType === "CALL" && outcome ? "What happened (optional)" : "What happened"}
        required={!(activityType === "CALL" && outcome)}
        rows={4}
        maxLength={LEAD_ACTIVITY_REMARKS_MAX_LENGTH}
        value={remarks}
        onChange={(e) => setRemarks(e.target.value)}
        placeholder="e.g. Spoke to the buyer — needs 500 units, wants a quote by Friday"
      />
      <p className="form-hint">
        This is added to the lead&apos;s history under your name and does not change the lead&apos;s stage.
        To schedule the next step, add a follow-up.
      </p>
      {error && <p className="form-error" role="alert">{error}</p>}
    </Modal>
  );
}
