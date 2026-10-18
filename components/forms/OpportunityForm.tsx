"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Modal } from "../ui/Modal";
import { TextField, SelectField, FieldRow } from "../ui/FormField";
import { Button } from "../ui/Button";
import { useToast } from "../ui/Toast";
import { CreateOpportunityInput } from "../../lib/repository/interfaces";
import { useLeads } from "../../lib/hooks/useLeads";
import { useCustomers } from "../../lib/hooks/useCustomers";
import { isQualifiedLeadStatus } from "../../lib/types/domain";
import { normalizeCustomerName } from "../../lib/repository/shared/customerLifecycle";
import { FormError } from "../ui/FormError";

/**
 * Field-for-field mirror of the VERIFIED CreateOpportunityDto: leadId,
 * title, expectedValue, probability, expectedCloseDate. No free-text
 * customer name and no stage input — the displayed name comes from the
 * selected lead, and every new opportunity starts at "Qualified" (a lead must
 * already be qualified before it can become one). See contract §7.
 *
 * The customer the deal is for (customerId, optional) is chosen from the
 * existing customers, and can also be linked later from the opportunity. A
 * quotation needs it.
 *
 * Opened from a customer (`forCustomer`) the customer is fixed and shown, not
 * chosen, and the leads whose name or company is the customer's come first and say
 * so: the deal is almost always for one of them. An opportunity still needs a
 * qualified lead (the backend's rule), so with none the form says so.
 */
export function OpportunityForm({
  onClose,
  onSubmit,
  defaultLeadId,
  forCustomer,
}: {
  onClose: () => void;
  onSubmit: (input: CreateOpportunityInput) => Promise<unknown>;
  defaultLeadId?: string;
  forCustomer?: { id: string; customerName: string; customerCode: string };
}) {
  const toast = useToast();
  const { leads, loading: leadsLoading } = useLeads();
  const sameName = useMemo(() => {
    const key = forCustomer ? normalizeCustomerName(forCustomer.customerName) : "";
    return (l: { customerName: string; companyName?: string }) => !!key && [l.customerName, l.companyName].some((n) => !!n && normalizeCustomerName(n) === key);
  }, [forCustomer]);
  // Qualified leads only; for a customer, the ones named like it first.
  const qualifiedLeads = useMemo(
    () => leads.filter((l) => isQualifiedLeadStatus(l.status)).sort((a, b) => Number(sameName(b)) - Number(sameName(a))),
    [leads, sameName]
  );

  const [leadId, setLeadId] = useState(defaultLeadId ?? "");
  const [title, setTitle] = useState("");
  const [expectedValue, setExpectedValue] = useState("");
  const [probability, setProbability] = useState("35");
  const [expectedCloseDate, setExpectedCloseDate] = useState("");
  const [customerId, setCustomerId] = useState(forCustomer?.id ?? "");
  const { customers } = useCustomers();
  const activeCustomers = useMemo(() => customers.filter((c) => c.isActive).sort((a, b) => a.customerName.localeCompare(b.customerName)), [customers]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const effectiveLeadId = leadId || defaultLeadId || qualifiedLeads[0]?.id || "";

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!effectiveLeadId) e.leadId = "Select a qualified lead";
    if (!title.trim()) e.title = "Opportunity title is required";
    if (!expectedValue.trim() || isNaN(Number(expectedValue)) || Number(expectedValue) <= 0)
      e.expectedValue = "Enter a valid amount greater than 0";
    if (isNaN(Number(probability)) || Number(probability) < 0 || Number(probability) > 100)
      e.probability = "Probability must be between 0 and 100";
    if (!expectedCloseDate) e.expectedCloseDate = "Expected close date is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        leadId: effectiveLeadId,
        title: title.trim(),
        expectedValue: Number(expectedValue),
        probability: Number(probability),
        expectedCloseDate: new Date(expectedCloseDate).toISOString(),
        ...(forCustomer ? { customerId: forCustomer.id } : customerId ? { customerId } : {}),
      });
      toast.success(`Opportunity "${title.trim()}" created`);
      onClose();
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : "Something went wrong creating the opportunity. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title="New Opportunity"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Creating…" : "Create Opportunity"}
          </Button>
        </>
      }
    >
      {!leadsLoading && qualifiedLeads.length === 0 ? (
        <div data-testid="no-qualified-lead">
          <p style={{ fontSize: 13.5, color: "var(--muted)", margin: "0 0 10px" }}>
            <b style={{ color: "var(--text)" }}>No qualified lead yet.</b> An opportunity is created from a qualified lead, and qualifying a lead is done in Lead Management.
            {forCustomer && " Qualify the lead this deal came from (or create one), then come back: the deal will be for this customer."}
          </p>
          <Link href="/leads" className="btn ghost" onClick={onClose}>
            Go to Leads
          </Link>
        </div>
      ) : (
        <>
          {forCustomer && (
            <p className="of-for" data-testid="deal-for">
              <span className="k">For</span> <b>{forCustomer.customerName}</b> <small>{forCustomer.customerCode}</small>
            </p>
          )}
          <SelectField
            label="Qualified Lead"
            required
            value={effectiveLeadId}
            onChange={(e) => setLeadId(e.target.value)}
            error={errors.leadId}
            disabled={!!defaultLeadId || leadsLoading}
            hint={forCustomer && qualifiedLeads.some(sameName) ? "Leads with this customer's name are listed first." : undefined}
            options={qualifiedLeads.map((l) => ({ value: l.id, label: `${l.companyName ? `${l.customerName} (${l.companyName})` : l.customerName}${sameName(l) ? " · same name" : ""}` }))}
          />
          <TextField label="Opportunity Title" required value={title} onChange={(e) => setTitle(e.target.value)} error={errors.title} placeholder="e.g. Hydraulic Systems Upgrade" />
          <FieldRow>
            <TextField label="Expected Value (₹)" required type="number" min={0} value={expectedValue} onChange={(e) => setExpectedValue(e.target.value)} error={errors.expectedValue} placeholder="e.g. 1840000" />
            <TextField label="Probability (%)" required type="number" min={0} max={100} value={probability} onChange={(e) => setProbability(e.target.value)} error={errors.probability} />
          </FieldRow>
          <TextField label="Expected Close Date" required type="date" value={expectedCloseDate} onChange={(e) => setExpectedCloseDate(e.target.value)} error={errors.expectedCloseDate} />
          {!forCustomer && (
          <SelectField
            label="Customer"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            hint="Optional. Who the deal is for. You can link it later, but a quotation needs a customer."
            options={[{ value: "", label: "Link a customer later" }, ...activeCustomers.map((c) => ({ value: c.id, label: `${c.customerName} (${c.customerCode})` }))]}
          />
          )}
        </>
      )}
      <FormError message={errors.form} />
    </Modal>
  );
}
