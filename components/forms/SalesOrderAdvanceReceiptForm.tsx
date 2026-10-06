"use client";

import { useState } from "react";
import { Modal } from "../ui/Modal";
import { TextField, TextAreaField, SelectField, FieldRow } from "../ui/FormField";
import { Button } from "../ui/Button";
import { useToast } from "../ui/Toast";
import { CreateAdvanceReceiptInput } from "../../lib/repository/interfaces";
import { SALES_ORDER_PAYMENT_MODES, formatPaymentMode } from "../../lib/types/domain";
import { SALES_ORDER_REFERENCE_MAX_LENGTH, SALES_ORDER_REMARKS_MAX_LENGTH } from "../../lib/repository/shared/salesOrderLifecycle";

/**
 * Records an advance payment received for a Sales Order. It starts PENDING; a
 * person with the verify permission then verifies or rejects it from the order
 * page. The verification state, verifier and time are set by the backend and are
 * not fields here.
 */
export function SalesOrderAdvanceReceiptForm({
  salesOrderCode,
  onClose,
  onSubmit,
}: {
  salesOrderCode: string;
  onClose: () => void;
  onSubmit: (input: Omit<CreateAdvanceReceiptInput, "salesOrderId">) => Promise<unknown>;
}) {
  const toast = useToast();
  const [receiptDate, setReceiptDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [amountReceived, setAmountReceived] = useState("");
  const [paymentMode, setPaymentMode] = useState<string>(SALES_ORDER_PAYMENT_MODES[2]);
  const [referenceNo, setReferenceNo] = useState("");
  const [remarks, setRemarks] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!receiptDate) e.receiptDate = "Receipt date is required";
    if (!amountReceived.trim() || isNaN(Number(amountReceived)) || Number(amountReceived) <= 0) e.amountReceived = "Enter an amount greater than 0";
    if (referenceNo.trim().length > SALES_ORDER_REFERENCE_MAX_LENGTH) e.referenceNo = `Keep the reference under ${SALES_ORDER_REFERENCE_MAX_LENGTH} characters`;
    if (remarks.trim().length > SALES_ORDER_REMARKS_MAX_LENGTH) e.remarks = `Keep remarks under ${SALES_ORDER_REMARKS_MAX_LENGTH} characters`;
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        receiptDate: new Date(receiptDate).toISOString(),
        amountReceived: Number(amountReceived),
        paymentMode,
        referenceNo: referenceNo.trim() || undefined,
        remarks: remarks.trim() || undefined,
      });
      toast.show("Advance receipt recorded", "check");
      onClose();
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : "Something went wrong recording the receipt. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title="Record Advance Receipt"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Saving…" : "Record Receipt"}
          </Button>
        </>
      }
    >
      <p style={{ fontSize: 12, color: "var(--muted)", marginTop: -8, marginBottom: 14 }}>
        For <b style={{ color: "var(--text)" }}>{salesOrderCode}</b> — recorded as pending until it is verified.
      </p>
      <FieldRow>
        <TextField label="Receipt Date" required type="date" value={receiptDate} onChange={(e) => setReceiptDate(e.target.value)} error={errors.receiptDate} />
        <TextField label="Amount Received (₹)" required type="number" min={0} value={amountReceived} onChange={(e) => setAmountReceived(e.target.value)} error={errors.amountReceived} />
      </FieldRow>
      <SelectField
        label="Payment Mode"
        required
        value={paymentMode}
        onChange={(e) => setPaymentMode(e.target.value)}
        options={SALES_ORDER_PAYMENT_MODES.map((m) => ({ value: m, label: formatPaymentMode(m) }))}
      />
      <TextField label="Reference No." value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} error={errors.referenceNo} placeholder="Optional — UTR, cheque number…" />
      <TextAreaField label="Remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} error={errors.remarks} placeholder="Optional" />
      {errors.form && <p style={{ color: "var(--bad)", fontSize: 12.5 }}>{errors.form}</p>}
    </Modal>
  );
}
