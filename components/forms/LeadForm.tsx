"use client";

import { useState } from "react";
import { Modal } from "../ui/Modal";
import { TextField, SelectField, FieldRow } from "../ui/FormField";
import { Button } from "../ui/Button";
import { useToast } from "../ui/Toast";
import { CreateLeadInput } from "../../lib/repository/interfaces";

const SOURCES = ["Website", "Referral", "Meta Ads", "LinkedIn", "IndiaMart", "Manual"];

export function LeadForm({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (input: CreateLeadInput) => Promise<unknown>;
}) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [city, setCity] = useState("");
  const [source, setSource] = useState(SOURCES[0]);
  const [value, setValue] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Company / lead name is required";
    if (!phone.trim()) e.phone = "Phone number is required";
    if (!email.trim()) e.email = "Email is required";
    else if (!/^\S+@\S+\.\S+$/.test(email)) e.email = "Enter a valid email address";
    if (!value.trim() || isNaN(Number(value)) || Number(value) <= 0)
      e.value = "Enter a valid deal value greater than 0";
    if (!ownerName.trim()) e.ownerName = "Assign an owner";
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
        source,
        value: Number(value),
        ownerName: ownerName.trim(),
        phone: phone.trim(),
        email: email.trim(),
      });
      toast.show(`Lead "${name.trim()}" created`, "check");
      onClose();
    } catch (err) {
      setErrors({ form: "Something went wrong creating the lead. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title="New Lead"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Creating…" : "Create Lead"}
          </Button>
        </>
      }
    >
      <TextField
        label="Company / Lead Name"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={errors.name}
        placeholder="e.g. Sterling Pumps"
      />
      <FieldRow>
        <TextField label="Industry" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g. Manufacturing" />
        <TextField label="City" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Pune" />
      </FieldRow>
      <FieldRow>
        <SelectField
          label="Source"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          options={SOURCES.map((s) => ({ value: s, label: s }))}
        />
        <TextField
          label="Deal Value (₹)"
          required
          type="number"
          min={0}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          error={errors.value}
          placeholder="e.g. 1840000"
        />
      </FieldRow>
      <TextField
        label="Owner"
        required
        value={ownerName}
        onChange={(e) => setOwnerName(e.target.value)}
        error={errors.ownerName}
        placeholder="e.g. Rohit M."
      />
      <FieldRow>
        <TextField label="Phone" required value={phone} onChange={(e) => setPhone(e.target.value)} error={errors.phone} placeholder="+91 …" />
        <TextField label="Email" required value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} placeholder="name@company.com" />
      </FieldRow>
      {errors.form && <p style={{ color: "var(--bad)", fontSize: 12.5 }}>{errors.form}</p>}
    </Modal>
  );
}
