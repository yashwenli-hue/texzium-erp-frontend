"use client";

import { useState } from "react";
import { Modal } from "../ui/Modal";
import { SelectField } from "../ui/FormField";
import { Button } from "../ui/Button";
import { useToast } from "../ui/Toast";
import { useAssignableUsers } from "../../lib/hooks/useAssignableUsers";

/**
 * VERIFIED: PATCH /lead-assignments/:id/qualify requires a salesUserId body
 * field — qualifying is also an assignment to a sales owner, not a plain
 * confirmation. See docs/backend-ui-contract.md §5, Stage 2A brief §10.
 */
export function QualifyLeadDialog({
  customerName,
  onClose,
  onSubmit,
}: {
  customerName: string;
  onClose: () => void;
  onSubmit: (salesUserId: string) => Promise<unknown>;
}) {
  const toast = useToast();
  const { users, loading: usersLoading } = useAssignableUsers();
  const [salesUserId, setSalesUserId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only active users are offered (the backend refuses inactive and suspended ones).
  const offered = users.filter((u) => u.active);
  const effectiveUserId = offered.some((u) => u.id === salesUserId) ? salesUserId : offered[0]?.id || "";
  const noneOffered = !usersLoading && offered.length === 0;

  async function handleSubmit() {
    if (!effectiveUserId) {
      setError("Select a sales owner for this lead.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(effectiveUserId);
      toast.success(`${customerName} qualified`);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not qualify this lead. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title="Qualify Lead"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting || usersLoading || noneOffered}>
            {submitting ? "Qualifying…" : "Qualify"}
          </Button>
        </>
      }
    >
      <p style={{ fontSize: 13.5, color: "var(--text)", marginBottom: 14 }}>
        Mark {customerName} as Qualified and hand it to a sales owner. This makes it eligible to become an Opportunity.
      </p>
      <SelectField
        label="Sales Owner"
        required
        value={effectiveUserId}
        onChange={(e) => setSalesUserId(e.target.value)}
        disabled={usersLoading}
        options={offered.map((u) => ({ value: u.id, label: u.name }))}
      />
      {noneOffered && <p style={{ color: "var(--muted)", fontSize: 12.5 }}>No active user is available to take this lead.</p>}
      {error && <p style={{ color: "var(--bad)", fontSize: 12.5 }}>{error}</p>}
    </Modal>
  );
}
