"use client";

import { useMemo, useState } from "react";
import { Modal } from "../ui/Modal";
import { TextField, TextAreaField, SelectField, FieldRow } from "../ui/FormField";
import { Button } from "../ui/Button";
import { useToast } from "../ui/Toast";
import { UpdateLeadInput } from "../../lib/repository/interfaces";
import { useLeadSources } from "../../lib/hooks/useLeads";
import { useRepository } from "../../lib/repository/RepositoryProvider";
import { Lead } from "../../lib/types/domain";
import { LeadProductField } from "./LeadProductField";
import { LeadLocationFields } from "./LeadLocationFields";
import { DraftErrors, draftFromLead, planLocationEdit, sameDraft } from "../../lib/geo/leadLocation";

/**
 * Mirrors the VERIFIED UpdateLeadDto for the "real" fields; product
 * interest/remarks stay in the separate uiContext block (MOCK/UI-ONLY
 * — see LeadUIContext in lib/types/domain.ts).
 *
 * The location is a real field. A lead that has none is saved without one for as
 * long as the Location section is left alone: nothing is required and nothing is
 * filled in (see planLocationEdit). Once the section is touched the whole location
 * is checked like a new lead's.
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
  const repo = useRepository();
  // Remarks are not part of the connected lead record. Employee remarks are
  // logged under Activity & History, so the field is only offered in mock mode.
  const showRemarks = repo.kind !== "real";
  const { sources } = useLeadSources();
  const [customerName, setCustomerName] = useState(lead.customerName);
  const [companyName, setCompanyName] = useState(lead.companyName ?? "");
  const [sourceId, setSourceId] = useState(lead.sourceId);
  const [phone, setPhone] = useState(lead.phone);
  const [alternatePhone, setAlternatePhone] = useState(lead.alternatePhone ?? "");
  const [email, setEmail] = useState(lead.email ?? "");
  const [inventoryItemId, setInventoryItemId] = useState(lead.product?.id ?? "");
  const initialLocation = useMemo(() => draftFromLead(lead), [lead]);
  const [location, setLocation] = useState(initialLocation);
  const [locationErrors, setLocationErrors] = useState<DraftErrors>({});
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

  const hasStoredLocation = !!lead.country;

  async function handleSubmit() {
    const fieldsOk = validate();
    const edit = planLocationEdit(initialLocation, location);
    setLocationErrors(edit.kind === "invalid" ? edit.errors : {});
    if (!fieldsOk || edit.kind === "invalid") return;
    setSubmitting(true);
    try {
      await onSubmit({
        customerName: customerName.trim(),
        companyName: companyName.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim(),
        alternatePhone: alternatePhone.trim() || undefined,
        sourceId,
        ...(edit.kind === "change" ? edit.fields : {}),
        // Sent only when changed: "" clears it (null), another item replaces it.
        ...(inventoryItemId !== (lead.product?.id ?? "") ? { inventoryItemId: inventoryItemId || null } : {}),
        uiContext: {
          remarks: showRemarks ? remarks.trim() || undefined : undefined,
        },
      });
      toast.success("Lead updated");
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

      <LeadLocationFields
        draft={location}
        onChange={(next) => {
          setLocation(next);
          if (Object.keys(locationErrors).length > 0) setLocationErrors({});
        }}
        errors={locationErrors}
        // Optional only while there is nothing recorded and nothing started: once touched, the whole location is required.
        required={hasStoredLocation || !sameDraft(initialLocation, location)}
        note={hasStoredLocation ? undefined : "No location is recorded for this lead. Leave this as it is to keep it that way, or choose one to record it."}
      />

      <LeadProductField value={inventoryItemId} onChange={setInventoryItemId} />

      {showRemarks && (
        <>
          <div className="field-divider">
            <span>Additional context</span>
            <small>Stored locally for this demo — not yet part of the connected backend</small>
          </div>
          <TextAreaField label="Remarks" rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Context for the next person who talks to this account…" />
        </>
      )}

      {errors.form && <p style={{ color: "var(--bad)", fontSize: 12.5 }}>{errors.form}</p>}
    </Modal>
  );
}
