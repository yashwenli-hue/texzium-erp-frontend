"use client";

import { useMemo, useState } from "react";
import { Modal } from "../ui/Modal";
import { TextField, SelectField, FieldRow } from "../ui/FormField";
import { Button } from "../ui/Button";
import { useToast } from "../ui/Toast";
import { CreateOpportunityInput } from "../../lib/repository/interfaces";
import { useLeads } from "../../lib/hooks/useLeads";
import { isQualifiedLeadStatus } from "../../lib/types/domain";

/**
 * Field-for-field mirror of the VERIFIED CreateOpportunityDto: leadId,
 * title, expectedValue, probability, expectedCloseDate. No free-text
 * customer name and no stage input — customer is derived from the selected
 * lead, and every new opportunity starts at "Qualified" (a lead must
 * already be qualified before it can become one). See contract §7.
 */
export function OpportunityForm({
  onClose,
  onSubmit,
  defaultLeadId,
}: {
  onClose: () => void;
  onSubmit: (input: CreateOpportunityInput) => Promise<unknown>;
  defaultLeadId?: string;
}) {
  const toast = useToast();
  const { leads, loading: leadsLoading } = useLeads();
  const qualifiedLeads = useMemo(() => leads.filter((l) => isQualifiedLeadStatus(l.status)), [leads]);

  const [leadId, setLeadId] = useState(defaultLeadId ?? "");
  const [title, setTitle] = useState("");
  const [expectedValue, setExpectedValue] = useState("");
  const [probability, setProbability] = useState("35");
  const [expectedCloseDate, setExpectedCloseDate] = useState("");
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
      });
      toast.show(`Opportunity "${title.trim()}" created`, "check");
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
        <p style={{ fontSize: 13.5, color: "var(--muted)" }}>
          No qualified leads yet. Qualify a lead first — an opportunity can only be created from one.
        </p>
      ) : (
        <>
          <SelectField
            label="Qualified Lead"
            required
            value={effectiveLeadId}
            onChange={(e) => setLeadId(e.target.value)}
            error={errors.leadId}
            disabled={!!defaultLeadId || leadsLoading}
            options={qualifiedLeads.map((l) => ({ value: l.id, label: l.companyName ? `${l.customerName} (${l.companyName})` : l.customerName }))}
          />
          <TextField label="Opportunity Title" required value={title} onChange={(e) => setTitle(e.target.value)} error={errors.title} placeholder="e.g. Hydraulic Systems Upgrade" />
          <FieldRow>
            <TextField label="Expected Value (₹)" required type="number" min={0} value={expectedValue} onChange={(e) => setExpectedValue(e.target.value)} error={errors.expectedValue} placeholder="e.g. 1840000" />
            <TextField label="Probability (%)" required type="number" min={0} max={100} value={probability} onChange={(e) => setProbability(e.target.value)} error={errors.probability} />
          </FieldRow>
          <TextField label="Expected Close Date" required type="date" value={expectedCloseDate} onChange={(e) => setExpectedCloseDate(e.target.value)} error={errors.expectedCloseDate} />
        </>
      )}
      {errors.form && <p style={{ color: "var(--bad)", fontSize: 12.5 }}>{errors.form}</p>}
    </Modal>
  );
}
