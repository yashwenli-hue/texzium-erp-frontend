"use client";

import { useState } from "react";
import { Modal } from "../ui/Modal";
import { TextField, TextAreaField, FieldRow } from "../ui/FormField";
import { Button } from "../ui/Button";
import { useToast } from "../ui/Toast";
import { formatInrExact } from "../../lib/format";
import { PROFORMA_REMARKS_MAX_LENGTH } from "../../lib/repository/shared/proformaLifecycle";
import type { CreateProformaInvoiceInput } from "../../lib/repository/interfaces";

/**
 * Creating a Proforma Invoice asks for dates and remarks only. The amount is the
 * approved quotation's and the backend derives it, so it is shown here, locked,
 * for the person to confirm, never typed. A Proforma can only be created from an
 * APPROVED quotation that has no other active Proforma; the backend enforces both.
 */
export function ProformaInvoiceForm({
  quoteNo,
  amounts,
  breakdownAvailable,
  onClose,
  onSubmit,
}: {
  quoteNo: string;
  amounts: { taxableAmount?: number; gstPercent?: number; gstAmount?: number; totalAmount: number };
  breakdownAvailable: boolean;
  onClose: () => void;
  onSubmit: (input: Omit<CreateProformaInvoiceInput, "quotationId">) => Promise<unknown>;
}) {
  const toast = useToast();
  const today = new Date().toISOString().slice(0, 10);
  const [issueDate, setIssueDate] = useState(today);
  const [validityDate, setValidityDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!issueDate) e.issueDate = "Issue date is required";
    // A Proforma whose last valid day has already passed could never be approved
    // or become a Sales Order, so it is not worth creating.
    if (validityDate && validityDate < today) e.validityDate = "That date has already passed, so the Proforma would be expired from the start.";
    else if (validityDate && issueDate && validityDate < issueDate) e.validityDate = "Valid until can't be before the issue date.";
    if (remarks.trim().length > PROFORMA_REMARKS_MAX_LENGTH) e.remarks = `Keep remarks under ${PROFORMA_REMARKS_MAX_LENGTH} characters.`;
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        issueDate: new Date(issueDate).toISOString(),
        validityDate: validityDate ? new Date(validityDate).toISOString() : undefined,
        remarks: remarks.trim() || undefined,
      });
      toast.success("Proforma invoice created — it needs approval");
      onClose();
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : "Something went wrong creating the proforma invoice. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title="New Proforma Invoice"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Creating…" : "Create Proforma Invoice"}
          </Button>
        </>
      }
    >
      <div className="summary" style={{ margin: "-4px 0 14px", padding: "12px 14px", border: "1px solid var(--line)", borderRadius: 12 }} data-testid="proforma-derived-amount">
        <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".4px", color: "var(--muted)", fontWeight: 700, marginBottom: 6 }}>
          Amount from approved quotation {quoteNo}
        </p>
        {breakdownAvailable && amounts.taxableAmount !== undefined && amounts.gstAmount !== undefined && (
          <>
            <div className="row"><span className="k">Taxable amount</span><span className="v">{formatInrExact(amounts.taxableAmount)}</span></div>
            <div className="row"><span className="k">GST {amounts.gstPercent}%</span><span className="v">{formatInrExact(amounts.gstAmount)}</span></div>
          </>
        )}
        <div className="row total"><span className="k">Total</span><span className="v">{formatInrExact(amounts.totalAmount)}</span></div>
        <p className="src" style={{ marginTop: 8 }}>
          The amount is taken from the quotation and can&apos;t be changed here. Only one active Proforma Invoice can exist for a quotation.
        </p>
      </div>
      <FieldRow>
        <TextField label="Issue date" required type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} error={errors.issueDate} />
        <TextField label="Valid until" type="date" value={validityDate} min={today} onChange={(e) => setValidityDate(e.target.value)} error={errors.validityDate} />
      </FieldRow>
      <p style={{ fontSize: 11.5, color: "var(--faint-text)", marginTop: -8, marginBottom: 12 }}>
        Valid until is optional. The Proforma stays valid through the end of that day (UTC); after it, it can&apos;t be approved or
        turned into a Sales Order. Leave it empty for no expiry.
      </p>
      <TextAreaField label="Remarks" rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional" error={errors.remarks} />
      {errors.form && <p role="alert" style={{ color: "var(--bad)", fontSize: 12.5 }}>{errors.form}</p>}
    </Modal>
  );
}
