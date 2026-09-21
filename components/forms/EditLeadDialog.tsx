"use client";

import { useState } from "react";
import { Modal } from "../ui/Modal";
import { TextField, TextAreaField, SelectField, FieldRow } from "../ui/FormField";
import { Button } from "../ui/Button";
import { useToast } from "../ui/Toast";
import { UpdateLeadInput } from "../../lib/repository/interfaces";
import { useLeadSources } from "../../lib/hooks/useLeads";
import { Lead } from "../../lib/types/domain";

/**
 * Mirrors the VERIFIED UpdateLeadDto for the "real" fields; product
 * interest/remarks/city stay in the separate uiContext block (MOCK/UI-ONLY
 * — see LeadUIContext in lib/types/domain.ts).
 */
export function EditLeadDialog({
  lead,
  onClose,
  onSubmit,
}: {
  lead: Lead;
  onClose: () => void;
  onSubmit: (input: UpdateLeadInput) => Promise<unknown>;
}) {
  const toast = useToast();
  const { sources } = useLeadSources();
  const [customerName, setCustomerName] = useState(lead.customerName);
  const [companyName, setCompanyName] = useState(lead.companyName ?? "");
  const [sourceId, setSourceId] = useState(lead.sourceId);
  const [phone, setPhone] = useState(lead.phone);
  const [alternatePhone, setAlternatePhone] = useState(lead.alternatePhone ?? "");
  const [email, setEmail] = useState(lead.email ?? "");
  const [productInterest, setProductInterest] = useState(lead.uiContext?.productInterest ?? "");
  const [city, setCity] = useState(lead.uiContext?.city ?? "");
  const [remarks, setRemarks] = useState(lead.uiContext?.remarks ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!customerName.trim()) e.customerName = "Lead / customer name is required";
    if (!phone.trim()) e.phone = "Phone number is required";
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email)) e.email = "Enter a valid email address";
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
        sourceId,
        uiContext: {
          productInterest: productInterest.trim() || undefined,
          city: city.trim() || undefined,
          remarks: remarks.trim() || undefined,
        },
      });
      toast.show("Lead updated", "check");
      onClose();
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : "Something went wrong saving these changes. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title="Edit Lead"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Saving…" : "Save Changes"}
          </Button>
        </>
      }
    >
      <TextField label="Customer / Lead Name" required value={customerName} onChange={(e) => setCustomerName(e.target.value)} error={errors.customerName} />
      <FieldRow>
        <TextField label="Company Name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Optional" />
        <SelectField label="Source" value={sourceId} onChange={(e) => setSourceId(e.target.value)} options={sources.map((s) => ({ value: s.id, label: s.name }))} />
      </FieldRow>
      <FieldRow>
        <TextField label="Phone" required value={phone} onChange={(e) => setPhone(e.target.value)} error={errors.phone} />
        <TextField label="Alternate Phone" value={alternatePhone} onChange={(e) => setAlternatePhone(e.target.value)} placeholder="Optional" />
      </FieldRow>
      <TextField label="Email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} placeholder="Optional" />

      <div className="field-divider">
        <span>Additional context</span>
        <small>Stored locally for this demo — not yet part of the connected backend</small>
      </div>
      <FieldRow>
        <TextField label="Product / Interest" value={productInterest} onChange={(e) => setProductInterest(e.target.value)} placeholder="e.g. Hydraulic Pump Systems" />
        <TextField label="City" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Optional" />
      </FieldRow>
      <TextAreaField label="Remarks" rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Context for the next person who talks to this account…" />

      {errors.form && <p style={{ color: "var(--bad)", fontSize: 12.5 }}>{errors.form}</p>}
    </Modal>
  );
}
