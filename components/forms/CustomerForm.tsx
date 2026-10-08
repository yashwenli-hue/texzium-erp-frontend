"use client";

import { useState } from "react";
import Link from "next/link";
import { Modal } from "../ui/Modal";
import { TextField, FieldRow } from "../ui/FormField";
import { Button } from "../ui/Button";
import { useToast } from "../ui/Toast";
import { CreateCustomerInput, UpdateCustomerInput } from "../../lib/repository/interfaces";
import { Customer, CustomerDuplicateMatch } from "../../lib/types/domain";
import { useCustomerDuplicateCheck } from "../../lib/hooks/useCustomers";
import {
  CUSTOMER_TYPE_SUGGESTIONS,
  CustomerConflictError,
  MATCH_REASON_LABEL,
  normalizeEmail,
  normalizePan,
  validateCustomerFields,
} from "../../lib/repository/shared/customerLifecycle";

type Prefill = { customerName?: string; email?: string; phone?: string };

const same = (a: string | undefined, b: string | undefined) => (a ?? "").trim() === (b ?? "").trim();

function MatchList({ matches }: { matches: CustomerDuplicateMatch[] }) {
  return (
    <ul>
      {matches.map((m) => (
        <li key={m.id}>
          <Link href={`/customers/${m.id}`}>
            {m.customerName} ({m.customerCode})
          </Link>
          {!m.isActive && " · inactive"} — {m.reasons.map((r) => MATCH_REASON_LABEL[r]).join(", ")}
        </li>
      ))}
    </ul>
  );
}


export interface CustomerFieldValues {
  customerName: string;
  customerType: string;
  panNumber: string;
  email: string;
  phone: string;
}

/**
 * The fields of a customer's own details, with the duplicate notices above them: the
 * part of the form that the edit dialog and the first step of creating a customer share.
 * Presentational: the owner holds the values, validates, and asks the backend whether the
 * customer already exists (`dup`).
 */
export function CustomerFields({
  values,
  onChange,
  errors,
  dup,
  customer,
}: {
  values: CustomerFieldValues;
  onChange: (field: keyof CustomerFieldValues, value: string) => void;
  errors: Record<string, string>;
  dup: { blocking: CustomerDuplicateMatch[]; warnings: CustomerDuplicateMatch[] };
  /** Present when editing: the code is shown as assigned and fixed. */
  customer?: Customer;
}) {
  const editing = !!customer;
  const blocked = dup.blocking.length > 0;
  const { customerName, customerType, panNumber, email, phone } = values;
  return (
    <>
      <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "0 0 16px" }} data-testid="code-note">
        {editing ? (
          <>
            Customer code <b style={{ color: "var(--text)" }}>{customer!.customerCode}</b> · assigned by the system and never changes.
          </>
        ) : (
          "The customer code is assigned automatically when you save."
        )}
      </p>

      {blocked && (
        <div className="dup block" role="alert" data-testid="dup-block">
          <b>This customer already exists.</b> The system keeps one customer per PAN and per name. Use the existing one — another site of the same business is added as a GST registration of that customer.
          <MatchList matches={dup.blocking} />
        </div>
      )}
      {!blocked && dup.warnings.length > 0 && (
        <div className="dup warn" role="status" data-testid="dup-warn">
          <b>Check this isn&apos;t the same business.</b> It shares a phone number or email with:
          <MatchList matches={dup.warnings} />
        </div>
      )}

      <TextField label="Customer name" required value={customerName} onChange={(e) => onChange("customerName", e.target.value)} error={errors.customerName} placeholder="e.g. GreenVolt Energy Pvt Ltd" autoComplete="organization" />
      <FieldRow>
        <TextField
          label="PAN"
          value={panNumber}
          onChange={(e) => onChange("panNumber", e.target.value.toUpperCase())}
          error={errors.panNumber}
          hint="Optional. For example ABCDE1234F. GST registrations must carry this PAN."
          maxLength={10}
          autoCapitalize="characters"
          spellCheck={false}
        />
        <TextField label="Type" value={customerType} onChange={(e) => onChange("customerType", e.target.value)} error={errors.customerType} list="customer-type-options" hint="Optional. B2B, B2C, Government…" />
      </FieldRow>
      <datalist id="customer-type-options">
        {CUSTOMER_TYPE_SUGGESTIONS.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>
      <FieldRow>
        <TextField label="Email" type="email" value={email} onChange={(e) => onChange("email", e.target.value)} error={errors.email} placeholder="Optional" autoComplete="email" />
        <TextField label="Phone" type="tel" value={phone} onChange={(e) => onChange("phone", e.target.value)} error={errors.phone} placeholder="Optional" autoComplete="tel" />
      </FieldRow>
    </>
  );
}

/**
 * Create or edit a customer. The code is not typed: the server assigns it when
 * the customer is saved and it never changes. While you type, the form asks the
 * backend whether a customer with the same PAN or name already exists (the
 * backend refuses a second one, so Save is held back and the existing customer is
 * offered instead: another site of the same business is a GST registration of
 * that customer) and warns about the same phone or email. The backend checks
 * again on save. Editing only sends what changed.
 */
export type CustomerFormProps = {
  /** Starting values for a new customer, e.g. from a lead. */
  prefill?: Prefill;
  onClose: () => void;
} & (
  | { mode?: "create"; customer?: undefined; onSubmit: (input: CreateCustomerInput) => Promise<unknown> }
  | { mode: "edit"; customer: Customer; onSubmit: (input: UpdateCustomerInput) => Promise<unknown> }
);

export function CustomerForm(props: CustomerFormProps) {
  const { customer, prefill, onClose } = props;
  const toast = useToast();
  const editing = props.mode === "edit" && !!customer;

  const [customerName, setCustomerName] = useState(customer?.customerName ?? prefill?.customerName ?? "");
  const [customerType, setCustomerType] = useState(customer?.customerType ?? "");
  const [panNumber, setPanNumber] = useState(customer?.panNumber ?? "");
  const [email, setEmail] = useState(customer?.email ?? prefill?.email ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? prefill?.phone ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [conflict, setConflict] = useState<CustomerConflictError | null>(null);

  // When editing, only a field that was changed is checked: a lookalike that was
  // already there must not hold the form back, because the backend only checks what changes.
  const nameChanged = !editing || !same(customerName, customer?.customerName);
  const panChanged = !editing || normalizePan(panNumber) !== (customer?.panNumber ?? "");
  const phoneChanged = !editing || !same(phone, customer?.phone);
  const emailChanged = !editing || normalizeEmail(email) !== (customer?.email ?? "");
  const dup = useCustomerDuplicateCheck({
    customerName: nameChanged ? customerName : undefined,
    panNumber: panChanged ? panNumber : undefined,
    phone: phoneChanged ? phone : undefined,
    email: emailChanged ? email : undefined,
    excludeCustomerId: customer?.id,
  });
  const blocked = dup.blocking.length > 0;

  function validate(): boolean {
    const e = validateCustomerFields({ customerName, customerType, panNumber, email, phone });
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    setConflict(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      if (editing && customer) {
        // Only what changed; an optional field that was emptied is cleared with null.
        const input: UpdateCustomerInput = {};
        if (!same(customerName, customer.customerName)) input.customerName = customerName.trim();
        if (!same(customerType, customer.customerType)) input.customerType = customerType.trim() || null;
        if (normalizePan(panNumber) !== (customer.panNumber ?? "")) input.panNumber = panNumber.trim() ? normalizePan(panNumber) : null;
        if (!same(email, customer.email)) input.email = email.trim() || null;
        if (!same(phone, customer.phone)) input.phone = phone.trim() || null;
        await (props as Extract<CustomerFormProps, { mode: "edit" }>).onSubmit(input);
        if (Object.keys(input).length) toast.success("Customer updated");
        else toast.info("Nothing changed");
      } else {
        await (props as Extract<CustomerFormProps, { mode?: "create" }>).onSubmit({
          customerName: customerName.trim(),
          customerType: customerType.trim() || undefined,
          panNumber: panNumber.trim() ? normalizePan(panNumber) : undefined,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
        });
        toast.show(`Customer "${customerName.trim()}" created`, "check");
      }
      onClose();
    } catch (err) {
      if (err instanceof CustomerConflictError) setConflict(err);
      setErrors({ form: err instanceof Error ? err.message : "Something went wrong saving the customer. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title={editing ? `Edit ${customer!.customerName}` : "New Customer"}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting || blocked}>
            {submitting ? "Saving…" : editing ? "Save changes" : "Create Customer"}
          </Button>
        </>
      }
    >
      <CustomerFields
        values={{ customerName, customerType, panNumber, email, phone }}
        onChange={(f, v) => ({ customerName: setCustomerName, customerType: setCustomerType, panNumber: setPanNumber, email: setEmail, phone: setPhone }[f](v))}
        errors={errors}
        dup={dup}
        customer={editing ? customer : undefined}
      />
      {errors.form && (
        <p style={{ color: "var(--bad)", fontSize: 12.5 }} role="alert">
          {errors.form}
          {conflict?.existing?.id && conflict.code?.startsWith("DUPLICATE") && (
            <>
              {" "}
              <Link href={`/customers/${conflict.existing.id}`}>Open it</Link>
            </>
          )}
        </p>
      )}
    </Modal>
  );
}
