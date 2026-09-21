"use client";

import { useState } from "react";
import { Modal } from "../ui/Modal";
import { TextField, FieldRow } from "../ui/FormField";
import { Button } from "../ui/Button";
import { useToast } from "../ui/Toast";
import { CreateCustomerInput } from "../../lib/repository/interfaces";

/**
 * Field-for-field mirror of the VERIFIED CreateCustomerDto: customerCode,
 * customerName, panNumber?, email?, phone?, customerType?. Account-profile
 * fields the prototype used to collect here (industry, city, owner, lifetime
 * value) aren't part of this DTO — they're defaulted by the repository
 * instead (see MockCustomerRepository.create()), not collected from the user.
 */
export function CustomerForm({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (input: CreateCustomerInput) => Promise<unknown>;
}) {
  const toast = useToast();
  const [customerName, setCustomerName] = useState("");
  const [customerCode, setCustomerCode] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [customerType, setCustomerType] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!customerName.trim()) e.customerName = "Customer name is required";
    if (!customerCode.trim()) e.customerCode = "Customer code is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        customerCode: customerCode.trim(),
        customerName: customerName.trim(),
        panNumber: panNumber.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        customerType: customerType.trim() || undefined,
      });
      toast.show(`Customer "${customerName.trim()}" created`, "check");
      onClose();
    } catch {
      setErrors({ form: "Something went wrong creating the customer. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title="New Customer"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Creating…" : "Create Customer"}
          </Button>
        </>
      }
    >
      <FieldRow>
        <TextField label="Customer Name" required value={customerName} onChange={(e) => setCustomerName(e.target.value)} error={errors.customerName} placeholder="e.g. GreenVolt Energy" />
        <TextField label="Customer Code" required value={customerCode} onChange={(e) => setCustomerCode(e.target.value)} error={errors.customerCode} placeholder="e.g. CUST-1009" />
      </FieldRow>
      <FieldRow>
        <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Optional" />
        <TextField label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" />
      </FieldRow>
      <FieldRow>
        <TextField label="PAN Number" value={panNumber} onChange={(e) => setPanNumber(e.target.value)} placeholder="Optional" />
        <TextField label="Customer Type" value={customerType} onChange={(e) => setCustomerType(e.target.value)} placeholder="Optional" />
      </FieldRow>
      {errors.form && <p style={{ color: "var(--bad)", fontSize: 12.5 }}>{errors.form}</p>}
    </Modal>
  );
}
