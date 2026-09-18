"use client";

import { useState } from "react";
import { Modal } from "../ui/Modal";
import { TextField, SelectField, FieldRow } from "../ui/FormField";
import { Button } from "../ui/Button";
import { useToast } from "../ui/Toast";
import { CreateQuotationInput } from "../../lib/repository/interfaces";
import { useOpportunities } from "../../lib/hooks/useOpportunities";

/**
 * Simplified mock creation flow — see CreateQuotationInput for why (the
 * real CreateQuotationDto needs inventory/GST masters this frontend
 * doesn't have yet). Customer, opportunity name and owner are always
 * derived from the selected Opportunity; status always starts Draft,
 * matching the verified backend rule.
 */
export function QuotationForm({
  onClose,
  onSubmit,
  defaultOpportunityId,
}: {
  onClose: () => void;
  onSubmit: (input: CreateQuotationInput) => Promise<unknown>;
  defaultOpportunityId?: string;
}) {
  const toast = useToast();
  const { opportunities, loading: opportunitiesLoading } = useOpportunities();
  const [opportunityId, setOpportunityId] = useState(defaultOpportunityId ?? "");
  const [amount, setAmount] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const effectiveOpportunityId = opportunityId || defaultOpportunityId || opportunities[0]?.id || "";
  const selectedOpportunity = opportunities.find((o) => o.id === effectiveOpportunityId);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!effectiveOpportunityId) e.opportunityId = "Select an opportunity";
    if (!amount.trim() || isNaN(Number(amount)) || Number(amount) <= 0)
      e.amount = "Enter a valid amount greater than 0";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        opportunityId: effectiveOpportunityId,
        amount: Number(amount),
        validUntil: validUntil ? new Date(validUntil).toISOString() : null,
      });
      toast.show("Quotation created as Draft", "check");
      onClose();
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : "Something went wrong creating the quotation. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title="New Quotation"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Creating…" : "Create Quotation"}
          </Button>
        </>
      }
    >
      {!opportunitiesLoading && opportunities.length === 0 ? (
        <p style={{ fontSize: 13.5, color: "var(--muted)" }}>
          No opportunities yet. Create one from a qualified lead first.
        </p>
      ) : (
        <>
          <SelectField
            label="Opportunity"
            required
            value={effectiveOpportunityId}
            onChange={(e) => setOpportunityId(e.target.value)}
            error={errors.opportunityId}
            disabled={!!defaultOpportunityId || opportunitiesLoading}
            options={opportunities.map((o) => ({ value: o.id, label: `${o.title} — ${o.customerName}` }))}
          />
          {selectedOpportunity && (
            <p style={{ fontSize: 12, color: "var(--muted)", marginTop: -8, marginBottom: 14 }}>
              Customer <b style={{ color: "var(--text)" }}>{selectedOpportunity.customerName}</b> · Owner {selectedOpportunity.ownerName}
            </p>
          )}
          <FieldRow>
            <TextField label="Amount (₹)" required type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} error={errors.amount} placeholder={selectedOpportunity ? String(selectedOpportunity.expectedValue) : "e.g. 1840000"} />
            <TextField label="Valid Until" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
          </FieldRow>
          <p style={{ fontSize: 11.5, color: "var(--faint)" }}>
            Every new quotation starts as <b>Draft</b>. Tax and totals shown here are presentation
            estimates — the backend is authoritative once connected.
          </p>
        </>
      )}
      {errors.form && <p style={{ color: "var(--bad)", fontSize: 12.5 }}>{errors.form}</p>}
    </Modal>
  );
}
