"use client";

import { useState } from "react";
import { Modal } from "../ui/Modal";
import { TextField, SelectField, FieldRow } from "../ui/FormField";
import { Button } from "../ui/Button";
import { useToast } from "../ui/Toast";
import { CreateQuotationInput } from "../../lib/repository/interfaces";
import { QuotationStatus } from "../../lib/types/domain";

const STATUSES: QuotationStatus[] = ["Draft", "Sent", "Viewed", "Accepted", "Rejected", "Expired"];

export function QuotationForm({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (input: CreateQuotationInput) => Promise<unknown>;
}) {
  const toast = useToast();
  const [customerName, setCustomerName] = useState("");
  const [opportunityName, setOpportunityName] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<QuotationStatus>("Draft");
  const [validUntil, setValidUntil] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!customerName.trim()) e.customerName = "Customer name is required";
    if (!amount.trim() || isNaN(Number(amount)) || Number(amount) <= 0)
      e.amount = "Enter a valid amount greater than 0";
    if (!ownerName.trim()) e.ownerName = "Assign an owner";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const created = await onSubmit({
        customerName: customerName.trim(),
        opportunityName: opportunityName.trim() || "—",
        amount: Number(amount),
        status,
        validUntil: validUntil ? new Date(validUntil).toISOString() : null,
        ownerName: ownerName.trim(),
      });
      toast.show("Quotation created", "check");
      onClose();
    } catch {
      setErrors({ form: "Something went wrong creating the quotation. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title="New Quotation"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Creating…" : "Create Quotation"}
          </Button>
        </>
      }
    >
      <FieldRow>
        <TextField label="Customer" required value={customerName} onChange={(e) => setCustomerName(e.target.value)} error={errors.customerName} placeholder="e.g. GreenVolt Energy" />
        <TextField label="Opportunity" value={opportunityName} onChange={(e) => setOpportunityName(e.target.value)} placeholder="Optional" />
      </FieldRow>
      <FieldRow>
        <TextField label="Amount (₹)" required type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} error={errors.amount} placeholder="e.g. 6400000" />
        <SelectField label="Status" value={status} onChange={(e) => setStatus(e.target.value as QuotationStatus)} options={STATUSES.map((s) => ({ value: s, label: s }))} />
      </FieldRow>
      <FieldRow>
        <TextField label="Valid Until" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
        <TextField label="Owner" required value={ownerName} onChange={(e) => setOwnerName(e.target.value)} error={errors.ownerName} placeholder="e.g. Anita S." />
      </FieldRow>
      {errors.form && <p style={{ color: "var(--bad)", fontSize: 12.5 }}>{errors.form}</p>}
    </Modal>
  );
}
