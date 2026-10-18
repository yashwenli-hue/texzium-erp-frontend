"use client";

import { useEffect, useState } from "react";
import { Modal } from "../ui/Modal";
import { TextField, TextAreaField, SelectField, FieldRow } from "../ui/FormField";
import { Button } from "../ui/Button";
import { useToast } from "../ui/Toast";
import { CreateLeadInput } from "../../lib/repository/interfaces";
import { useLeadSources } from "../../lib/hooks/useLeads";
import { LeadLocationFields } from "./LeadLocationFields";
import { LeadProductField } from "./LeadProductField";
import { LeadDuplicatesPanel } from "../ui/LeadDuplicatesPanel";
import { useRepository } from "../../lib/repository/RepositoryProvider";
import { LeadDuplicateResult, NO_DUPLICATES, probeIsWorthChecking } from "../../lib/repository/shared/leadDuplicates";
import { DraftErrors, EMPTY_LOCATION_DRAFT, LocationDraft, createFieldsFromDraft, draftErrors } from "../../lib/geo/leadLocation";
import { FormError } from "../ui/FormError";

/**
 * Field-for-field mirror of the VERIFIED CreateLeadDto — no industry/deal-value/
 * owner inputs here. Deal value lives on the Opportunity (created later, once the
 * lead is qualified); owner is set via the separate Assign action. See
 * docs/backend-ui-contract.md §3. The location (India or International, a state or
 * a country, and a city) is a real Lead field and is required for a lead entered
 * here: nothing is inferred from the phone number, and there is no default.
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
  const [inventoryItemId, setInventoryItemId] = useState("");
  // Only for the check for an existing customer: a lead has no GSTIN of its own.
  const [gstin, setGstin] = useState("");
  const [remarks, setRemarks] = useState("");
  const [location, setLocation] = useState<LocationDraft>(EMPTY_LOCATION_DRAFT);
  const [locationErrors, setLocationErrors] = useState<DraftErrors>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const effectiveSourceId = sourceId || sources[0]?.id || "";

  // Returning enquiries, asked once typing pauses: the same person (number, email, name),
  // an existing customer (also by GSTIN), compared by product. Context only: nothing is
  // blocked or merged, and a lookup that fails just shows nothing.
  const repo = useRepository();
  const [duplicates, setDuplicates] = useState<LeadDuplicateResult>(NO_DUPLICATES);
  const city = location.city;
  useEffect(() => {
    const probe = { phone, alternatePhone, email, customerName, companyName, city, gstin, inventoryItemId: inventoryItemId || undefined };
    if (!probeIsWorthChecking(probe)) {
      setDuplicates(NO_DUPLICATES);
      return;
    }
    let cancelled = false;
    const t = setTimeout(() => {
      repo.leads
        .duplicateCheck(probe)
        .then((r) => !cancelled && setDuplicates(r))
        .catch(() => !cancelled && setDuplicates(NO_DUPLICATES));
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [repo, phone, alternatePhone, email, customerName, companyName, city, gstin, inventoryItemId]);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!customerName.trim()) e.customerName = "Lead / customer name is required";
    if (!phone.trim()) e.phone = "Phone number is required";
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email)) e.email = "Enter a valid email address";
    if (!effectiveSourceId) e.sourceId = "Select a lead source";
    const le = draftErrors(location);
    setErrors(e);
    setLocationErrors(le);
    return Object.keys(e).length === 0 && Object.keys(le).length === 0;
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
        ...(inventoryItemId ? { inventoryItemId } : {}),
        ...createFieldsFromDraft(location),
        uiContext: {
          remarks: remarks.trim() || undefined,
        },
      });
      toast.success(`Lead "${customerName.trim()}" created`);
      onClose();
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : "Something went wrong creating the lead. Please try again." });
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
      <FieldRow>
        <LeadProductField value={inventoryItemId} onChange={setInventoryItemId} />
        <TextField
          label="Customer GSTIN"
          value={gstin}
          onChange={(e) => setGstin(e.target.value)}
          placeholder="If the enquiry gave one (optional)"
          hint="Only used to find an existing customer; it is not saved on the lead."
        />
      </FieldRow>
      <LeadDuplicatesPanel result={duplicates} compact />

      <LeadLocationFields
        draft={location}
        onChange={(next) => {
          setLocation(next);
          if (Object.keys(locationErrors).length > 0) setLocationErrors({});
        }}
        errors={locationErrors}
      />

      <div className="field-divider">
        <span>Additional context</span>
        <small>Stored locally for this demo — not yet part of the connected backend</small>
      </div>
      <TextAreaField label="Remarks" rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Any context worth capturing now (optional)" />

      <FormError message={errors.form} />
    </Modal>
  );
}
