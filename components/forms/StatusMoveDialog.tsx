"use client";

import { useRef, useState } from "react";
import { Modal } from "../ui/Modal";
import { TextAreaField } from "../ui/FormField";
import { Button } from "../ui/Button";
import { LeadStatusTag } from "../ui/Tag";
import { LeadStatus, LEAD_STATUS_MOVE_TARGETS, formatLeadStatus } from "../../lib/types/domain";
import { OPPORTUNITY_STAGE_REMARK_MAX_LENGTH as REMARK_MAX } from "../../lib/repository/shared/opportunityStage";

const MEANING: Partial<Record<LeadStatus, string>> = {
  NEW: "Not worked on yet.",
  CONTACTED: "Reached the person; working out whether it is a fit.",
  UNDERQUALIFIED: "Contacted, but not a fit yet (budget, timing, requirement). Can still be qualified later.",
};

/**
 * A pre-qualification status move (New, Contacted, Underqualified) with an optional remark
 * that goes into the lead's history. Qualify, Reject and Reopen have their own actions.
 * The backend refuses the move if the lead changed since this page loaded.
 */
export function StatusMoveDialog({
  current,
  customerName,
  onClose,
  onSubmit,
}: {
  current: LeadStatus;
  customerName: string;
  onClose: () => void;
  onSubmit: (status: LeadStatus, remark?: string) => Promise<unknown>;
}) {
  const choices = LEAD_STATUS_MOVE_TARGETS.filter((s) => s !== current);
  const [status, setStatus] = useState<LeadStatus>(choices[0]);
  const [remark, setRemark] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const running = useRef(false);

  async function submit() {
    if (running.current) return;
    if (remark.trim().length > REMARK_MAX) {
      setError(`Keep the remark under ${REMARK_MAX} characters.`);
      return;
    }
    running.current = true;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(status, remark.trim() || undefined);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not change the status. Please try again.");
    } finally {
      running.current = false;
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title={`Update status — ${customerName}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button variant="primary" onClick={submit} disabled={submitting}>
            {submitting ? "Saving…" : `Mark ${formatLeadStatus(status)}`}
          </Button>
        </>
      }
    >
      <p className="form-context">
        Now <LeadStatusTag status={current} />
      </p>
      <fieldset className="choice-row" style={{ flexDirection: "column", alignItems: "stretch" }}>
        <legend>New status</legend>
        {choices.map((s) => (
          <label key={s} className={`choice${status === s ? " on" : ""}`} style={{ alignItems: "flex-start" }}>
            <input type="radio" name="lead-status" value={s} checked={status === s} onChange={() => setStatus(s)} style={{ marginTop: 3 }} />
            <span>
              <b style={{ display: "block" }}>{formatLeadStatus(s)}</b>
              <small style={{ color: "var(--text-2)" }}>{MEANING[s]}</small>
            </span>
          </label>
        ))}
      </fieldset>
      <TextAreaField
        label="Remark (optional)"
        rows={3}
        maxLength={REMARK_MAX}
        value={remark}
        onChange={(e) => setRemark(e.target.value)}
        placeholder="e.g. Budget is only approved for next quarter"
      />
      {error && <p className="form-error" role="alert">{error}</p>}
    </Modal>
  );
}
