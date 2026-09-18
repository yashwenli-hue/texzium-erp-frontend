"use client";

import { useState } from "react";
import { Modal } from "../ui/Modal";
import { TextField, TextAreaField, SelectField, FieldRow } from "../ui/FormField";
import { Button } from "../ui/Button";
import { useToast } from "../ui/Toast";
import { CreateLeadInput } from "../../lib/repository/interfaces";
import { useLeadSources } from "../../lib/hooks/useLeads";

/**
 * Field-for-field mirror of the VERIFIED CreateLeadDto — no industry/city/
 * deal-value/owner inputs here. Deal value lives on the Opportunity (created
 * later, once the lead is qualified); owner is set via the separate Assign
 * action. See docs/backend-ui-contract.md §3.
 */
export function LeadForm({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (input: CreateLeadInput) => Promise<unknown>;
}) {
  const toast = useToast();
  const { sources, loading: sourcesLoading } = useLeadSources();
  const [customerName, setCustomerName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [phone, setPhone] = useState("");
  const [alternatePhone, setAlternatePhone] = useState("");
  const [email, setEmail] = useState("");
  const [productInterest, setProductInterest] = useState("");
  const [remarks, setRemarks] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const effectiveSourceId = sourceId || sources[0]?.id || "";

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!customerName.trim()) e.customerName = "Lead / customer name is required";
    if (!phone.trim()) e.phone = "Phone number is required";
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email)) e.email = "Enter a valid email address";
    if (!effectiveSourceId) e.sourceId = "Select a lead source";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        customerName: customerName.trim(),
        companyName: companyName.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim(),
        alternatePhone: alternatePhone.trim() || undefined,
        sourceId: effectiveSourceId,
        uiContext: {
          productInterest: productInterest.trim() || undefined,
          remarks: remarks.trim() || undefined,
        },
      });
      toast.show(`Lead "${customerName.trim()}" created`, "check");
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
        label="Customer / Lead Name"
        required
        value={customerName}
        onChange={(e) => setCustomerName(e.target.value)}
        error={errors.customerName}
        placeholder="e.g. Sterling Pumps"
      />
      <TextField
        label="Company Name"
        value={companyName}
        onChange={(e) => setCompanyName(e.target.value)}
        placeholder="e.g. Sterling Pumps Pvt Ltd (optional)"
      />
      <FieldRow>
        <SelectField
          label="Source"
          required
          value={effectiveSourceId}
          onChange={(e) => setSourceId(e.target.value)}
          error={errors.sourceId}
          disabled={sourcesLoading}
          options={sources.map((s) => ({ value: s.id, label: s.name }))}
        />
        <TextField label="Alternate Phone" value={alternatePhone} onChange={(e) => setAlternatePhone(e.target.value)} placeholder="+91 … (optional)" />
      </FieldRow>
      <FieldRow>
        <TextField label="Phone" required value={phone} onChange={(e) => setPhone(e.target.value)} error={errors.phone} placeholder="+91 …" />
        <TextField label="Email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} placeholder="name@company.com (optional)" />
      </FieldRow>

      <div className="field-divider">
        <span>Additional context</span>
        <small>Stored locally for this demo — not yet part of the connected backend</small>
      </div>
      <TextField label="Product / Interest" value={productInterest} onChange={(e) => setProductInterest(e.target.value)} placeholder="e.g. Hydraulic Pump Systems (optional)" />
      <TextAreaField label="Remarks" rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Any context worth capturing now (optional)" />

      {errors.form && <p style={{ color: "var(--bad)", fontSize: 12.5 }}>{errors.form}</p>}
    </Modal>
  );
}
