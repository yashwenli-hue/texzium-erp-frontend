"use client";

import { useState } from "react";
import { Modal } from "../ui/Modal";
import { TextField, FieldRow } from "../ui/FormField";
import { Button } from "../ui/Button";
import { useToast } from "../ui/Toast";
import { CreateGstRegistrationInput, UpdateGstRegistrationInput } from "../../lib/repository/interfaces";
import { Customer, CustomerGstRegistration } from "../../lib/types/domain";
import {
  GSTIN_PATTERN,
  gstinMatchesPan,
  gstinPan,
  gstinState,
  normalizeGstin,
  validateGstFields,
} from "../../lib/repository/shared/customerLifecycle";

const same = (a: string | undefined, b: string | undefined) => (a ?? "").trim() === (b ?? "").trim();


export interface GstFieldValues {
  gstin: string;
  legalName: string;
  tradeName: string;
  branchName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  pincode: string;
}

/**
 * The fields of a GST registration, with the state read from the GSTIN as soon as it is
 * complete: shared by the dialog that adds or edits a registration and by the optional
 * second step of creating a customer. The GSTIN is only ever format-checked here (and by
 * the backend), never verified with the tax authority, and the screen never says it is.
 * Presentational: the owner holds the values and validates.
 */
export function GstFields({
  values,
  onChange,
  errors,
  customer,
  registration,
  makeDefault = false,
  onMakeDefault,
}: {
  values: GstFieldValues;
  onChange: (field: keyof GstFieldValues, value: string) => void;
  errors: Record<string, string>;
  customer: Pick<Customer, "panNumber" | "gstRegistrations">;
  /** Present when editing. */
  registration?: CustomerGstRegistration;
  makeDefault?: boolean;
  onMakeDefault?: (v: boolean) => void;
}) {
  const editing = !!registration;
  const hasActive = customer.gstRegistrations.some((g) => g.isActive);
  const { gstin, legalName, tradeName, branchName, addressLine1, addressLine2, city, pincode } = values;
  const normalized = normalizeGstin(gstin);
  const complete = !editing && normalized.length === 15 && GSTIN_PATTERN.test(normalized);
  const state = complete ? gstinState(normalized) : null;
  const panOk = complete ? gstinMatchesPan(normalized, customer.panNumber) : true;
  const gstinHint = editing
    ? "The GSTIN and its state can't be changed. To use a different GSTIN, add another registration."
    : complete && state && panOk
    ? `${state.stateName} (${state.stateCode}) · PAN ${gstinPan(normalized)}`
    : customer.panNumber
    ? `15 characters. It must carry this customer's PAN (${customer.panNumber}).`
    : "15 characters, for example 27ABCDE1234F1Z5.";
  return (
    <>
      <TextField
        label="GSTIN"
        required={!editing}
        value={editing ? registration!.gstin : gstin}
        onChange={(e) => onChange("gstin", e.target.value.toUpperCase())}
        error={errors.gstin}
        hint={gstinHint}
        maxLength={15}
        disabled={editing}
        autoCapitalize="characters"
        spellCheck={false}
      />
      <FieldRow>
        <TextField label="Legal name" required value={legalName} onChange={(e) => onChange("legalName", e.target.value)} error={errors.legalName} />
        <TextField label="Trade name" value={tradeName} onChange={(e) => onChange("tradeName", e.target.value)} error={errors.tradeName} placeholder="Optional" />
      </FieldRow>
      <TextField label="Branch / site name" value={branchName} onChange={(e) => onChange("branchName", e.target.value)} error={errors.branchName} placeholder="Optional, e.g. Mumbai Office" />
      <TextField label="Address" required value={addressLine1} onChange={(e) => onChange("addressLine1", e.target.value)} error={errors.addressLine1} autoComplete="address-line1" />
      <TextField label="Address line 2" value={addressLine2} onChange={(e) => onChange("addressLine2", e.target.value)} error={errors.addressLine2} placeholder="Optional" autoComplete="address-line2" />
      <FieldRow>
        <TextField label="City" required value={city} onChange={(e) => onChange("city", e.target.value)} error={errors.city} autoComplete="address-level2" />
        <TextField label="PIN code" required value={pincode} onChange={(e) => onChange("pincode", e.target.value)} error={errors.pincode} inputMode="numeric" maxLength={6} autoComplete="postal-code" />
      </FieldRow>
      {!editing && (
        <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "0 0 4px" }}>
          {hasActive ? (
            <label style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 28 }}>
              <input type="checkbox" checked={makeDefault} onChange={(e) => onMakeDefault?.(e.target.checked)} style={{ width: "auto", accentColor: "var(--control-accent)" }} />
              Make this the default registration
            </label>
          ) : (
            "This will be the customer's default registration: quotations use it unless another is chosen."
          )}
        </p>
      )}
    </>
  );
}

/**
 * Add or edit a customer's GST registration. The state is not typed: it is read
 * from the GSTIN (and shown as soon as the GSTIN is complete), and the GSTIN has
 * to carry the customer's PAN. A registration's GSTIN and state never change:
 * to use a different GSTIN, add another registration. The customer's first
 * registration is its default; for later ones the default can be taken over.
 */
export function GstRegistrationForm({
  customer,
  registration,
  onClose,
  onSubmit,
}: {
  customer: Pick<Customer, "customerName" | "panNumber" | "gstRegistrations">;
  /** Present when editing. */
  registration?: CustomerGstRegistration;
  onClose: () => void;
  onSubmit: (input: Omit<CreateGstRegistrationInput, "customerId"> | UpdateGstRegistrationInput) => Promise<unknown>;
}) {
  const toast = useToast();
  const editing = !!registration;
  const hasActive = customer.gstRegistrations.some((g) => g.isActive);

  const [gstin, setGstin] = useState(registration?.gstin ?? "");
  const [legalName, setLegalName] = useState(registration?.legalName ?? customer.customerName);
  const [tradeName, setTradeName] = useState(registration?.tradeName ?? "");
  const [branchName, setBranchName] = useState(registration?.branchName ?? "");
  const [addressLine1, setAddressLine1] = useState(registration?.addressLine1 ?? "");
  const [addressLine2, setAddressLine2] = useState(registration?.addressLine2 ?? "");
  const [city, setCity] = useState(registration?.city ?? "");
  const [pincode, setPincode] = useState(registration?.pincode ?? "");
  const [makeDefault, setMakeDefault] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const normalized = normalizeGstin(gstin);

  function validate(): boolean {
    const e = validateGstFields(
      { gstin, legalName, tradeName, branchName, addressLine1, addressLine2, city, pincode },
      { forEdit: editing, customerPan: customer.panNumber }
    );
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSubmitting(true);
    try {
      if (editing && registration) {
        const input: UpdateGstRegistrationInput = {};
        if (!same(legalName, registration.legalName)) input.legalName = legalName.trim();
        if (!same(tradeName, registration.tradeName)) input.tradeName = tradeName.trim() || null;
        if (!same(branchName, registration.branchName)) input.branchName = branchName.trim() || null;
        if (!same(addressLine1, registration.addressLine1)) input.addressLine1 = addressLine1.trim();
        if (!same(addressLine2, registration.addressLine2)) input.addressLine2 = addressLine2.trim() || null;
        if (!same(city, registration.city)) input.city = city.trim();
        if (!same(pincode, registration.pincode)) input.pincode = pincode.trim();
        await onSubmit(input);
        if (Object.keys(input).length) toast.success("GST registration updated");
        else toast.info("Nothing changed");
      } else {
        await onSubmit({
          gstin: normalized,
          legalName: legalName.trim(),
          tradeName: tradeName.trim() || undefined,
          branchName: branchName.trim() || undefined,
          addressLine1: addressLine1.trim(),
          addressLine2: addressLine2.trim() || undefined,
          city: city.trim(),
          pincode: pincode.trim(),
          ...(hasActive && makeDefault ? { isDefault: true } : {}),
        });
        toast.show("GST registration added", "check");
      }
      onClose();
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : "Something went wrong saving the registration. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title={editing ? "Edit GST registration" : "Add GST registration"}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Saving…" : editing ? "Save changes" : "Add registration"}
          </Button>
        </>
      }
    >
      <GstFields
        values={{ gstin, legalName, tradeName, branchName, addressLine1, addressLine2, city, pincode }}
        onChange={(f, v) => ({ gstin: setGstin, legalName: setLegalName, tradeName: setTradeName, branchName: setBranchName, addressLine1: setAddressLine1, addressLine2: setAddressLine2, city: setCity, pincode: setPincode }[f](v))}
        errors={errors}
        customer={customer}
        registration={registration}
        makeDefault={makeDefault}
        onMakeDefault={setMakeDefault}
      />
      {errors.form && (
        <p style={{ color: "var(--bad)", fontSize: 12.5 }} role="alert">
          {errors.form}
        </p>
      )}
    </Modal>
  );
}
