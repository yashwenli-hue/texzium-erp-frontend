"use client";

import { useState } from "react";
import { Modal } from "../ui/Modal";
import { TextField, TextAreaField, SelectField, FieldRow } from "../ui/FormField";
import { Button } from "../ui/Button";
import { useToast } from "../ui/Toast";
import { CreatePaymentTermInput } from "../../lib/repository/interfaces";
import { SALES_ORDER_PAYMENT_TYPES, formatPaymentType } from "../../lib/types/domain";
import { SALES_ORDER_REMARKS_MAX_LENGTH } from "../../lib/repository/shared/salesOrderLifecycle";
import { formatInr } from "../../lib/format";

/**
 * Payment terms for a Sales Order: payment type (FULL_ADVANCE, PARTIAL_ADVANCE
 * or CREDIT), advance and balance amounts, and optionally credit days, a due
 * date and remarks. Mirrors the backend's validation; the backend decides. The
 * order total is shown for reference only — no split is enforced or computed
 * here, and nothing server-owned (actor, order status) is part of the form.
 */
export function SalesOrderPaymentTermForm({
  salesOrderCode,
  orderTotal,
  onClose,
  onSubmit,
}: {
  salesOrderCode: string;
  orderTotal: number;
  onClose: () => void;
  onSubmit: (input: Omit<CreatePaymentTermInput, "salesOrderId">) => Promise<unknown>;
}) {
  const toast = useToast();
  const [paymentType, setPaymentType] = useState<string>(SALES_ORDER_PAYMENT_TYPES[1]);
  const [advanceAmount, setAdvanceAmount] = useState("0");
  const [balanceAmount, setBalanceAmount] = useState(String(orderTotal));
  const [creditDays, setCreditDays] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (advanceAmount.trim() === "" || isNaN(Number(advanceAmount)) || Number(advanceAmount) < 0) e.advanceAmount = "Enter 0 or more";
    if (balanceAmount.trim() === "" || isNaN(Number(balanceAmount)) || Number(balanceAmount) < 0) e.balanceAmount = "Enter 0 or more";
    if (creditDays.trim() !== "" && (!Number.isInteger(Number(creditDays)) || Number(creditDays) < 0)) e.creditDays = "Enter a whole number of days";
    if (remarks.trim().length > SALES_ORDER_REMARKS_MAX_LENGTH) e.remarks = `Keep remarks under ${SALES_ORDER_REMARKS_MAX_LENGTH} characters`;
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        paymentType,
        advanceAmount: Number(advanceAmount),
        balanceAmount: Number(balanceAmount),
        creditDays: creditDays.trim() === "" ? undefined : Number(creditDays),
        dueDate: dueDate || undefined,
        remarks: remarks.trim() || undefined,
      });
      toast.show("Payment terms saved", "check");
      onClose();
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : "Something went wrong saving the payment terms. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title="Payment Terms"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Saving…" : "Save Payment Terms"}
          </Button>
        </>
      }
    >
      <p style={{ fontSize: 12, color: "var(--muted)", marginTop: -8, marginBottom: 14 }}>
        For <b style={{ color: "var(--text)" }}>{salesOrderCode}</b> · order total {formatInr(orderTotal)}
      </p>
      <SelectField
        label="Payment Type"
        required
        value={paymentType}
        onChange={(e) => setPaymentType(e.target.value)}
        options={SALES_ORDER_PAYMENT_TYPES.map((t) => ({ value: t, label: formatPaymentType(t) }))}
      />
      <FieldRow>
        <TextField label="Advance Amount (₹)" required type="number" min={0} value={advanceAmount} onChange={(e) => setAdvanceAmount(e.target.value)} error={errors.advanceAmount} />
        <TextField label="Balance Amount (₹)" required type="number" min={0} value={balanceAmount} onChange={(e) => setBalanceAmount(e.target.value)} error={errors.balanceAmount} />
      </FieldRow>
      <FieldRow>
        <TextField label="Credit Days" type="number" min={0} value={creditDays} onChange={(e) => setCreditDays(e.target.value)} error={errors.creditDays} placeholder="Optional" />
        <TextField label="Due Date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} error={errors.dueDate} />
      </FieldRow>
      <TextAreaField label="Remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} error={errors.remarks} placeholder="Optional" />
      {errors.form && <p style={{ color: "var(--bad)", fontSize: 12.5 }}>{errors.form}</p>}
    </Modal>
  );
}
