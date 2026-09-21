"use client";

import { useState } from "react";
import { Modal } from "../ui/Modal";
import { TextField, TextAreaField, FieldRow } from "../ui/FormField";
import { Button } from "../ui/Button";
import { useToast } from "../ui/Toast";
import { CreateProformaInvoiceInput } from "../../lib/repository/interfaces";
import { formatInr } from "../../lib/format";

/**
 * Field-for-field mirror of the VERIFIED CreateProformaInvoiceDto:
 * quotationId (fixed — always created from a specific Quotation), issueDate,
 * totalAmount, validityDate?, remarks?. Unlike Quotation, the backend does
 * NOT compute totalAmount here — it stores exactly what's sent, so this
 * defaults to the source quotation's own backend-computed total (the most
 * truthful available number) but remains editable since the backend imposes
 * no cross-check against it. See docs/backend-ui-contract.md §9.
 */
export function ProformaInvoiceForm({
  quotationId,
  quoteNo,
  defaultTotalAmount,
  onClose,
  onSubmit,
}: {
  quotationId: string;
  quoteNo: string;
  defaultTotalAmount: number;
  onClose: () => void;
  onSubmit: (input: CreateProformaInvoiceInput) => Promise<unknown>;
}) {
  const toast = useToast();
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [totalAmount, setTotalAmount] = useState(String(defaultTotalAmount));
  const [validityDate, setValidityDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!issueDate) e.issueDate = "Issue date is required";
    if (!totalAmount.trim() || isNaN(Number(totalAmount)) || Number(totalAmount) <= 0)
      e.totalAmount = "Enter a valid amount greater than 0";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        quotationId,
        issueDate: new Date(issueDate).toISOString(),
        totalAmount: Number(totalAmount),
        validityDate: validityDate ? new Date(validityDate).toISOString() : undefined,
        remarks: remarks.trim() || undefined,
      });
      toast.show("Proforma invoice created", "check");
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
      <p style={{ fontSize: 12, color: "var(--muted)", marginTop: -8, marginBottom: 14 }}>
        From quotation <b style={{ color: "var(--text)" }}>{quoteNo}</b>
      </p>
      <FieldRow>
        <TextField label="Issue Date" required type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} error={errors.issueDate} />
        <TextField label="Valid Until" type="date" value={validityDate} onChange={(e) => setValidityDate(e.target.value)} placeholder="Optional" />
      </FieldRow>
      <TextField
        label="Total Amount (₹)"
        required
        type="number"
        min={0}
        value={totalAmount}
        onChange={(e) => setTotalAmount(e.target.value)}
        error={errors.totalAmount}
      />
      <p style={{ fontSize: 11.5, color: "var(--faint)", marginTop: -10 }}>
        Defaulted from the quotation&apos;s total ({formatInr(defaultTotalAmount)}) — the backend doesn&apos;t
        recompute this, so double-check it before creating.
      </p>
      <TextAreaField label="Remarks" rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional" />
      {errors.form && <p style={{ color: "var(--bad)", fontSize: 12.5 }}>{errors.form}</p>}
    </Modal>
  );
}
