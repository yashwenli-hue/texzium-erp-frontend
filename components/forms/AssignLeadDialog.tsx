"use client";

import { useState } from "react";
import { Modal } from "../ui/Modal";
import { SelectField } from "../ui/FormField";
import { Button } from "../ui/Button";
import { useToast } from "../ui/Toast";

// UI ASSUMPTION: no Users/assignable-staff endpoint is confirmed yet
// (docs/backend-ui-contract.md §21). This mock roster stands in for it so
// the Assign workflow (AssignLeadDto { leadId, assignedToId }) can be
// exercised now; replace with a real user lookup once confirmed.
export const MOCK_ASSIGNABLE_USERS = [
  { id: "U1", name: "Anita S." },
  { id: "U2", name: "Rohit M." },
  { id: "U3", name: "Vikram J." },
  { id: "U4", name: "Priya N." },
];

export function AssignLeadDialog({
  currentAssigneeId,
  onClose,
  onSubmit,
}: {
  currentAssigneeId?: string;
  onClose: () => void;
  onSubmit: (assignedToId: string, assignedToName: string) => Promise<unknown>;
}) {
  const toast = useToast();
  const [userId, setUserId] = useState(currentAssigneeId ?? MOCK_ASSIGNABLE_USERS[0].id);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    const user = MOCK_ASSIGNABLE_USERS.find((u) => u.id === userId);
    if (!user) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(user.id, user.name);
      toast.show(`Lead assigned to ${user.name}`, "check");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not assign the lead. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title="Assign Lead"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Assigning…" : "Assign"}
          </Button>
        </>
      }
    >
      <SelectField
        label="Assign to"
        value={userId}
        onChange={(e) => setUserId(e.target.value)}
        options={MOCK_ASSIGNABLE_USERS.map((u) => ({ value: u.id, label: u.name }))}
      />
      {error && <p style={{ color: "var(--bad)", fontSize: 12.5 }}>{error}</p>}
    </Modal>
  );
}
