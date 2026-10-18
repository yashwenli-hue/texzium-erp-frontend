"use client";

import { useState } from "react";
import { Modal } from "../ui/Modal";
import { SelectField } from "../ui/FormField";
import { Button } from "../ui/Button";
import { useToast } from "../ui/Toast";
import { peopleListProblem, useAssignableUsers } from "../../lib/hooks/useAssignableUsers";

// Only active users are offered (the backend refuses inactive and suspended ones).
// `excludeUserId` is the current pre-sales assignee: reassigning to them is refused.
export function AssignLeadDialog({
  currentAssigneeId,
  excludeUserId,
  onClose,
  onSubmit,
}: {
  currentAssigneeId?: string;
  excludeUserId?: string;
  onClose: () => void;
  onSubmit: (assignedToId: string, assignedToName: string) => Promise<unknown>;
}) {
  const toast = useToast();
  const { users, loading: usersLoading, error: usersError } = useAssignableUsers();
  const listProblem = peopleListProblem(usersError);
  const [userId, setUserId] = useState(currentAssigneeId ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const offered = users.filter((u) => u.active && u.id !== excludeUserId);
  const effectiveUserId = offered.some((u) => u.id === userId) ? userId : offered[0]?.id || "";
  const noneOffered = !usersLoading && offered.length === 0;
  // A list that could not be read is not an empty one: say which it is.

  async function handleSubmit() {
    const user = offered.find((u) => u.id === effectiveUserId);
    if (!user) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(user.id, user.name);
      toast.success(`Lead assigned to ${user.name}`);
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
          <Button variant="primary" onClick={handleSubmit} disabled={submitting || usersLoading || noneOffered}>
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
        options={offered.map((u) => ({ value: u.id, label: u.name }))}
      />
      {listProblem ? (
        <p role="alert" style={{ color: "var(--bad)", fontSize: 12.5 }}>{listProblem}</p>
      ) : (
        noneOffered && <p style={{ color: "var(--muted)", fontSize: 12.5 }}>No other active user is available to take this lead.</p>
      )}
      {error && <p style={{ color: "var(--bad)", fontSize: 12.5 }}>{error}</p>}
    </Modal>
  );
}
