"use client";

import { useState } from "react";
import { Modal } from "../ui/Modal";
import { SelectField } from "../ui/FormField";
import { Button } from "../ui/Button";
import { useToast } from "../ui/Toast";
import { useAssignableUsers } from "../../lib/hooks/useAssignableUsers";

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
  const { users, loading: usersLoading } = useAssignableUsers();
  const [userId, setUserId] = useState(currentAssigneeId ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveUserId = userId || users[0]?.id || "";

  async function handleSubmit() {
    const user = users.find((u) => u.id === effectiveUserId);
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
          <Button variant="primary" onClick={handleSubmit} disabled={submitting || usersLoading}>
            {submitting ? "Assigning…" : "Assign"}
          </Button>
        </>
      }
    >
      <SelectField
        label="Assign to"
        value={effectiveUserId}
        onChange={(e) => setUserId(e.target.value)}
        disabled={usersLoading}
        options={users.map((u) => ({ value: u.id, label: u.name }))}
      />
      {error && <p style={{ color: "var(--bad)", fontSize: 12.5 }}>{error}</p>}
    </Modal>
  );
}
