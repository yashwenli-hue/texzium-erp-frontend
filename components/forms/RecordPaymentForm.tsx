"use client";

import { useState } from "react";
import { Modal } from "../ui/Modal";
import { TextField, FieldRow } from "../ui/FormField";
import { Button } from "../ui/Button";
import { useToast } from "../ui/Toast";
import { CreatePaymentCollectionInput } from "../../lib/repository/interfaces";
import { RecordPaymentResult } from "../../lib/types/domain";
import { formatInr } from "../../lib/format";

/**
 * Field-for-field mirror of the VERIFIED CreatePaymentCollectionDto:
 * salesInvoiceId (fixed), paymentDate, amountReceived, paymentMode,
 * referenceNo — all required. The backend computes nothing here and does
 * NOT clamp an overpayment at zero — this form does not pre-validate the
 * amount against the current outstanding balance, since the backend itself
 * imposes no such rule; the caller is expected to show the real returned
 * balance afterward, including a negative one if it occurs.
 */
export function RecordPaymentForm({
  salesInvoiceId,
  invoiceNumber,
  outstandingBalance,
  onClose,
  onSubmit,
}: {
  salesInvoiceId: string;
  invoiceNumber: string;
  outstandingBalance: number;
  onClose: () => void;
  onSubmit: (input: CreatePaymentCollectionInput) => Promise<RecordPaymentResult>;
}) {
  const toast = useToast();
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [amountReceived, setAmountReceived] = useState(String(outstandingBalance > 0 ? outstandingBalance : ""));
  const [paymentMode, setPaymentMode] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!paymentDate) e.paymentDate = "Payment date is required";
    if (!amountReceived.trim() || isNaN(Number(amountReceived)) || Number(amountReceived) <= 0)
      e.amountReceived = "Enter an amount greater than 0";
    if (!paymentMode.trim()) e.paymentMode = "Payment mode is required";
    if (!referenceNo.trim()) e.referenceNo = "Reference number is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        salesInvoiceId,
        paymentDate: new Date(paymentDate).toISOString(),
        amountReceived: Number(amountReceived),
        paymentMode: paymentMode.trim(),
        referenceNo: referenceNo.trim(),
      });
      toast.show(`Payment of ${formatInr(Number(amountReceived))} recorded`, "check");
      onClose();
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : "Something went wrong recording the payment. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title="Record Payment"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Recording…" : "Record Payment"}
          </Button>
        </>
      }
    >
      <p style={{ fontSize: 12, color: "var(--muted)", marginTop: -8, marginBottom: 14 }}>
        Against invoice <b style={{ color: "var(--text)" }}>{invoiceNumber}</b>
        {outstandingBalance > 0 && <> — outstanding {formatInr(outstandingBalance)}</>}
      </p>
      <FieldRow>
        <TextField label="Payment Date" required type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} error={errors.paymentDate} />
        <TextField label="Amount Received (₹)" required type="number" min={0} value={amountReceived} onChange={(e) => setAmountReceived(e.target.value)} error={errors.amountReceived} />
      </FieldRow>
      <FieldRow>
        <TextField label="Payment Mode" required value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} error={errors.paymentMode} placeholder="e.g. Bank Transfer, UPI, Cheque" />
        <TextField label="Reference Number" required value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} error={errors.referenceNo} placeholder="e.g. UTR / transaction id" />
      </FieldRow>
      <p style={{ fontSize: 11.5, color: "var(--faint)" }}>
        The backend does not stop an amount larger than the outstanding balance — if this results in a
        negative balance, it will be shown exactly as the backend returns it.
      </p>
      {errors.form && <p style={{ color: "var(--bad)", fontSize: 12.5 }}>{errors.form}</p>}
    </Modal>
  );
}
