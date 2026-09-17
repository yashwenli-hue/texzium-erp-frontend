"use client";

import { useState } from "react";
import { Modal } from "../ui/Modal";
import { TextField, SelectField, FieldRow } from "../ui/FormField";
import { Button } from "../ui/Button";
import { useToast } from "../ui/Toast";
import { CreateTaskInput } from "../../lib/repository/interfaces";
import { TaskPriority, RelatedRecordType } from "../../lib/types/domain";

const PRIORITIES: TaskPriority[] = ["High", "Medium", "Low"];
const LINK_TYPES: RelatedRecordType[] = ["Lead", "Customer"];

export function TaskForm({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (input: CreateTaskInput) => Promise<unknown>;
}) {
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("Medium");
  const [linkedType, setLinkedType] = useState<RelatedRecordType>("Lead");
  const [linkedName, setLinkedName] = useState("");
  const [assigneeName, setAssigneeName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = "Task title is required";
    if (!linkedName.trim()) e.linkedName = `Link this task to a ${linkedType.toLowerCase()}`;
    if (!assigneeName.trim()) e.assigneeName = "Assign this task to someone";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        dueAt: dueAt ? new Date(dueAt).toISOString() : null,
        priority,
        linkedType,
        linkedId: `manual_${Date.now()}`,
        linkedName: linkedName.trim(),
        assigneeName: assigneeName.trim(),
      });
      toast.show("Task created", "check");
      onClose();
    } catch {
      setErrors({ form: "Something went wrong creating the task. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title="New Task"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Creating…" : "Create Task"}
          </Button>
        </>
      }
    >
      <TextField label="Task Title" required value={title} onChange={(e) => setTitle(e.target.value)} error={errors.title} placeholder="e.g. Send revised quotation" />
      <FieldRow>
        <TextField label="Due Date" type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
        <SelectField label="Priority" value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} options={PRIORITIES.map((p) => ({ value: p, label: p }))} />
      </FieldRow>
      <FieldRow>
        <SelectField label="Linked To" value={linkedType} onChange={(e) => setLinkedType(e.target.value as RelatedRecordType)} options={LINK_TYPES.map((t) => ({ value: t, label: t }))} />
        <TextField label={`${linkedType} Name`} required value={linkedName} onChange={(e) => setLinkedName(e.target.value)} error={errors.linkedName} placeholder="e.g. Sterling Pumps" />
      </FieldRow>
      <TextField label="Assignee" required value={assigneeName} onChange={(e) => setAssigneeName(e.target.value)} error={errors.assigneeName} placeholder="e.g. Rohit M." />
      {errors.form && <p style={{ color: "var(--bad)", fontSize: 12.5 }}>{errors.form}</p>}
    </Modal>
  );
}
