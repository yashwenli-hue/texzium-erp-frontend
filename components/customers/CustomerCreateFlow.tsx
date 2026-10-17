"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { routingAdvice } from "../../lib/repository/shared/leadDuplicates";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { useToast } from "../ui/Toast";
import { CustomerFieldValues, CustomerFields, MatchList } from "../forms/CustomerForm";
import { GstFieldValues, GstFields } from "../forms/GstRegistrationForm";
import { useCustomerDuplicateCheck } from "../../lib/hooks/useCustomers";
import type { CreateCustomerInput } from "../../lib/repository/interfaces";
import { CustomerConflictError, normalizeGstin, normalizePan, validateCustomerFields, validateGstFields } from "../../lib/repository/shared/customerLifecycle";
import { RegistrationInput, createCustomerThenRegistration, retryRegistration } from "../../lib/repository/shared/customerCreate";
import type { Customer, CustomerGstRegistration } from "../../lib/types/domain";

type Step = "details" | "registration" | "partial";

const NO_GST: GstFieldValues = { gstin: "", legalName: "", tradeName: "", branchName: "", addressLine1: "", addressLine2: "", city: "", pincode: "" };

function toRegistration(v: GstFieldValues): RegistrationInput {
  return {
    gstin: normalizeGstin(v.gstin),
    legalName: v.legalName.trim(),
    tradeName: v.tradeName.trim() || undefined,
    branchName: v.branchName.trim() || undefined,
    addressLine1: v.addressLine1.trim(),
    addressLine2: v.addressLine2.trim() || undefined,
    city: v.city.trim(),
    pincode: v.pincode.trim(),
  };
}

function Steps({ step }: { step: Step }) {
  const items = [
    { key: "details", label: "Details" },
    { key: "registration", label: "GST registration", optional: true },
  ];
  const at = step === "details" ? 0 : 1;
  return (
    <ol className="create-steps" aria-label="Steps" data-testid="create-steps">
      {items.map((it, i) => (
        <li key={it.key} aria-current={i === at ? "step" : undefined} className={i < at ? "done" : i === at ? "on" : ""}>
          <span className="n" aria-hidden="true">
            {i + 1}
          </span>
          <span>
            {it.label}
            {it.optional && <small> · optional</small>}
          </span>
        </li>
      ))}
    </ol>
  );
}

/**
 * What is said when the customer was created but its registration was not saved. The two
 * facts are kept apart on purpose: the customer exists and is safe (a status), and the
 * registration failed with this reason (an alert), with the way on: correct and retry,
 * or skip and add it later. It never suggests that creating the customer failed.
 */
export function PartialNotice({ created, error }: { created: Pick<Customer, "customerName" | "customerCode">; error: string }) {
  return (
    <>
      <div className="create-ok" role="status" data-testid="partial-created">
        <b>{created.customerName} was created</b> <small>{created.customerCode}</small>
        <p>The customer is saved and is not affected by what follows.</p>
      </div>
      <div className="create-warn" role="alert" data-testid="partial-failed">
        <b>The GST registration wasn&apos;t saved.</b>
        <p>{error}</p>
        <p>Correct it below and retry, or skip it and add the registration later from the customer&apos;s page. Retrying will not create the customer again.</p>
      </div>
    </>
  );
}

/**
 * Creating a customer in two steps: its details, then, if the person wants, its first GST
 * registration (a customer cannot be quoted without one). Nothing is saved until the end,
 * so stepping back and forth, or cancelling, leaves nothing behind.
 *
 * The two saves are separate backend calls, and the screen is honest about it. If the
 * customer cannot be created (a duplicate, an invalid value) nothing exists and the details
 * step shows why. If the customer IS created but its registration is not saved, the
 * customer is kept and said to exist ("created"), the reason the registration failed is
 * shown, and only the registration can be retried (or skipped): the customer is never
 * created a second time, and closing the dialog takes you to the customer.
 */
export function CustomerCreateFlow({
  prefill,
  api,
  onClose,
  onOpenCustomer,
}: {
  prefill?: { customerName?: string; email?: string; phone?: string };
  api: {
    createCustomer: (input: CreateCustomerInput) => Promise<Customer>;
    addRegistration: (customerId: string, input: RegistrationInput) => Promise<CustomerGstRegistration>;
  };
  onClose: () => void;
  /** Called once the customer exists, to go to it. */
  onOpenCustomer: (customer: Customer) => void;
}) {
  const toast = useToast();
  const [step, setStep] = useState<Step>("details");
  const [details, setDetails] = useState<CustomerFieldValues>({ customerName: prefill?.customerName ?? "", customerType: "", panNumber: "", email: prefill?.email ?? "", phone: prefill?.phone ?? "" });
  const [gst, setGst] = useState<GstFieldValues>(NO_GST);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [gstErrors, setGstErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [conflict, setConflict] = useState<CustomerConflictError | null>(null);
  const [created, setCreated] = useState<Customer | null>(null);
  const [partialError, setPartialError] = useState<string>("");
  const body = useRef<HTMLDivElement>(null);

  const dup = useCustomerDuplicateCheck({ customerName: details.customerName, panNumber: details.panNumber, phone: details.phone, email: details.email });
  // The GSTIN typed in the registration step, checked against every customer's registrations
  // (and the PAN it carries) before anything is created; the server checks again on save.
  const gstDup = useCustomerDuplicateCheck({ gstin: gst.gstin }, step === "registration");
  const gstBlocked = gstDup.blocking.length > 0;
  const blocked = dup.blocking.length > 0;
  // A phone or email match is weak (numbers and mailboxes are shared): creating anyway
  // needs an explicit "this is a different business", asked again when the matches change.
  const [warningsConfirmed, setWarningsConfirmed] = useState(false);
  const warningKey = dup.warnings.map((w) => w.id || w.reasons.join("+")).join(",");
  useEffect(() => setWarningsConfirmed(false), [warningKey]);
  const unconfirmed = !blocked && dup.warnings.length > 0 && !warningsConfirmed;
  const pan = normalizePan(details.panNumber);
  const gstCustomer = { panNumber: created?.panNumber ?? (pan || undefined), gstRegistrations: [] as CustomerGstRegistration[] };

  // Each step starts at its first field.
  useEffect(() => {
    body.current?.querySelector<HTMLInputElement>("input:not([disabled])")?.focus();
  }, [step]);

  const detailsInput = (): CreateCustomerInput => ({
    customerName: details.customerName.trim(),
    customerType: details.customerType.trim() || undefined,
    panNumber: details.panNumber.trim() ? pan : undefined,
    email: details.email.trim() || undefined,
    phone: details.phone.trim() || undefined,
  });

  function toRegistrationStep() {
    setConflict(null);
    const e = validateCustomerFields(details);
    if (unconfirmed) e.form = "Confirm that this is a different business from the customers it shares a phone number or email with.";
    setErrors(e);
    if (Object.keys(e).length > 0 || blocked) return;
    if (!gst.legalName) setGst((g) => ({ ...g, legalName: details.customerName.trim() }));
    setStep("registration");
  }

  async function save(withRegistration: boolean) {
    setConflict(null);
    const de = validateCustomerFields(details);
    if (unconfirmed) de.form = "Confirm that this is a different business from the customers it shares a phone number or email with.";
    if (Object.keys(de).length > 0 || blocked) {
      setErrors(de);
      setStep("details");
      return;
    }
    if (withRegistration) {
      const ge = validateGstFields(gst, { forEdit: false, customerPan: pan || null });
      setGstErrors(ge);
      if (Object.keys(ge).length > 0) return;
    }
    setSubmitting(true);
    const outcome = await createCustomerThenRegistration(api, detailsInput(), withRegistration ? toRegistration(gst) : null);
    setSubmitting(false);
    if (outcome.kind === "failed") {
      // Nothing was created: back to the details, with the reason.
      setErrors({ form: outcome.error.message });
      if (outcome.error instanceof CustomerConflictError) setConflict(outcome.error);
      setStep("details");
    } else if (outcome.kind === "partial") {
      setCreated(outcome.customer);
      setPartialError(outcome.registrationError.message);
      setGstErrors({});
      setStep("partial");
    } else {
      toast.success(outcome.registration ? `Customer "${outcome.customer.customerName}" created with its GST registration` : `Customer "${outcome.customer.customerName}" created`);
      onOpenCustomer(outcome.customer);
    }
  }

  async function retry() {
    if (!created) return;
    const ge = validateGstFields(gst, { forEdit: false, customerPan: created.panNumber ?? null });
    setGstErrors(ge);
    if (Object.keys(ge).length > 0) return;
    setSubmitting(true);
    const outcome = await retryRegistration(api, created.id, toRegistration(gst));
    setSubmitting(false);
    if (outcome.kind === "done") {
      toast.success("GST registration added");
      onOpenCustomer(created);
    } else {
      setPartialError(outcome.error.message);
    }
  }

  const title = step === "partial" ? "Customer created" : "New Customer";

  return (
    <Modal
      title={title}
      onClose={step === "partial" && created ? () => onOpenCustomer(created) : onClose}
      footer={
        step === "details" ? (
          <>
            <Button variant="ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="ghost" onClick={() => save(false)} disabled={submitting || blocked}>
              {submitting ? "Saving…" : "Create without GST"}
            </Button>
            <Button variant="primary" onClick={toRegistrationStep} disabled={submitting || blocked}>
              Continue
            </Button>
          </>
        ) : step === "registration" ? (
          <>
            <Button variant="ghost" onClick={() => setStep("details")} disabled={submitting}>
              Back
            </Button>
            <Button variant="ghost" onClick={() => save(false)} disabled={submitting}>
              {submitting ? "Saving…" : "Skip, create customer"}
            </Button>
            <Button variant="primary" onClick={() => save(true)} disabled={submitting || gstBlocked}>
              {submitting ? "Saving…" : "Create customer and add registration"}
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={() => created && onOpenCustomer(created)} disabled={submitting}>
              Skip and open customer
            </Button>
            <Button variant="primary" onClick={retry} disabled={submitting}>
              {submitting ? "Saving…" : "Retry registration"}
            </Button>
          </>
        )
      }
    >
      <div ref={body} data-testid="create-flow" data-step={step}>
        {step !== "partial" && <Steps step={step} />}

        {step === "details" && (
          <>
            <CustomerFields
              values={details}
              onChange={(f, v) => {
                setDetails((d) => ({ ...d, [f]: v }));
                setErrors((e) => ({ ...e, [f]: "", form: "" }));
              }}
              errors={errors}
              dup={dup}
              confirmWarnings={{ checked: warningsConfirmed, onChange: setWarningsConfirmed }}
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
                {conflict?.mappedTo && <> {routingAdvice(conflict.mappedTo)}</>}
              </p>
            )}
          </>
        )}

        {step === "registration" && (
          <>
            <p className="create-lede">
              Add the customer&apos;s first GST registration now, so it can be quoted straight away. It becomes the default. You can skip this and add it later from the customer&apos;s page.
            </p>
            {gstBlocked && (
              <div className="dup block" role="alert" data-testid="gst-dup-block">
                <b>This GSTIN or its PAN is already registered.</b> A business has one customer; another site is a GST registration of that customer. Use the existing customer.
                <MatchList matches={gstDup.blocking} />
              </div>
            )}
            <GstFields values={gst} onChange={(f, v) => {
                setGst((g) => ({ ...g, [f]: v }));
                setGstErrors((e) => ({ ...e, [f]: "" }));
              }}
              errors={gstErrors}
              customer={gstCustomer}
            />
          </>
        )}

        {step === "partial" && created && (
          <>
            <PartialNotice created={created} error={partialError} />
            <GstFields values={gst} onChange={(f, v) => {
                setGst((g) => ({ ...g, [f]: v }));
                setGstErrors((e) => ({ ...e, [f]: "" }));
              }}
              errors={gstErrors}
              customer={gstCustomer}
            />
          </>
        )}
      </div>
    </Modal>
  );
}
