"use client";

import { useState } from "react";
import { Modal } from "../ui/Modal";
import { TextField, FieldRow } from "../ui/FormField";
import { Button } from "../ui/Button";
import { useToast } from "../ui/Toast";
import { CreateCustomerInput } from "../../lib/repository/interfaces";

export function CustomerForm({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (input: CreateCustomerInput) => Promise<unknown>;
}) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [city, setCity] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ltv, setLtv] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Customer name is required";
    if (!ownerName.trim()) e.ownerName = "Assign an account owner";
    if (ltv && (isNaN(Number(ltv)) || Number(ltv) < 0)) e.ltv = "Enter a valid amount";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        industry: industry.trim() || "Not specified",
        city: city.trim() || "Not specified",
        ownerName: ownerName.trim(),
        lifetimeValue: ltv ? Number(ltv) : 0,
      });
      toast.show(`Customer "${name.trim()}" created`, "check");
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
      <TextField label="Customer Name" required value={name} onChange={(e) => setName(e.target.value)} error={errors.name} placeholder="e.g. GreenVolt Energy" />
      <FieldRow>
        <TextField label="Industry" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g. Solar EPC" />
        <TextField label="City" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Jaipur" />
      </FieldRow>
      <FieldRow>
        <TextField label="Account Owner" required value={ownerName} onChange={(e) => setOwnerName(e.target.value)} error={errors.ownerName} placeholder="e.g. Anita S." />
        <TextField label="Lifetime Value (₹)" type="number" min={0} value={ltv} onChange={(e) => setLtv(e.target.value)} error={errors.ltv} placeholder="Optional" />
      </FieldRow>
      {errors.form && <p style={{ color: "var(--bad)", fontSize: 12.5 }}>{errors.form}</p>}
    </Modal>
  );
}
