"use client";

import { useState } from "react";
import { Modal } from "../ui/Modal";
import { TextField, SelectField, FieldRow } from "../ui/FormField";
import { Button } from "../ui/Button";
import { useToast } from "../ui/Toast";
import { CreateOpportunityInput } from "../../lib/repository/interfaces";
import { OpportunityStage } from "../../lib/types/domain";

const STAGES: OpportunityStage[] = ["Qualified", "Proposal", "Negotiation", "Won", "Lost"];

export function OpportunityForm({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (input: CreateOpportunityInput) => Promise<unknown>;
}) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [stage, setStage] = useState<OpportunityStage>("Qualified");
  const [amount, setAmount] = useState("");
  const [probability, setProbability] = useState("35");
  const [expectedCloseAt, setExpectedCloseAt] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Opportunity name is required";
    if (!customerName.trim()) e.customerName = "Customer name is required";
    if (!amount.trim() || isNaN(Number(amount)) || Number(amount) <= 0)
      e.amount = "Enter a valid amount greater than 0";
    if (isNaN(Number(probability)) || Number(probability) < 0 || Number(probability) > 100)
      e.probability = "Probability must be between 0 and 100";
    if (!expectedCloseAt) e.expectedCloseAt = "Expected close date is required";
    if (!ownerName.trim()) e.ownerName = "Assign an owner";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        customerName: customerName.trim(),
        stage,
        amount: Number(amount),
        probability: Number(probability),
        expectedCloseAt: new Date(expectedCloseAt).toISOString(),
        ownerName: ownerName.trim(),
      });
      toast.show(`Opportunity "${name.trim()}" created`, "check");
      onClose();
    } catch {
      setErrors({ form: "Something went wrong creating the opportunity. Please try again." });
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
      <TextField label="Opportunity Name" required value={name} onChange={(e) => setName(e.target.value)} error={errors.name} placeholder="e.g. Hydraulic Systems Upgrade" />
      <FieldRow>
        <TextField label="Customer" required value={customerName} onChange={(e) => setCustomerName(e.target.value)} error={errors.customerName} placeholder="e.g. Sterling Pumps" />
        <SelectField label="Stage" value={stage} onChange={(e) => setStage(e.target.value as OpportunityStage)} options={STAGES.map((s) => ({ value: s, label: s }))} />
      </FieldRow>
      <FieldRow>
        <TextField label="Amount (₹)" required type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} error={errors.amount} placeholder="e.g. 1840000" />
        <TextField label="Probability (%)" required type="number" min={0} max={100} value={probability} onChange={(e) => setProbability(e.target.value)} error={errors.probability} />
      </FieldRow>
      <FieldRow>
        <TextField label="Expected Close Date" required type="date" value={expectedCloseAt} onChange={(e) => setExpectedCloseAt(e.target.value)} error={errors.expectedCloseAt} />
        <TextField label="Owner" required value={ownerName} onChange={(e) => setOwnerName(e.target.value)} error={errors.ownerName} placeholder="e.g. Rohit M." />
      </FieldRow>
      {errors.form && <p style={{ color: "var(--bad)", fontSize: 12.5 }}>{errors.form}</p>}
    </Modal>
  );
}
