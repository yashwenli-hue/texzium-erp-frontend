"use client";

import { useState } from "react";
import { Modal } from "../ui/Modal";
import { TextField, SelectField, TextAreaField, FieldRow } from "../ui/FormField";
import { Button } from "../ui/Button";
import { useToast } from "../ui/Toast";
import { CreateActivityInput } from "../../lib/repository/interfaces";
import { ActivityType, RelatedRecordType } from "../../lib/types/domain";
import { FormError } from "../ui/FormError";

const TYPES: ActivityType[] = ["Call", "Email", "Meeting", "WhatsApp", "Quotation", "Note"];
const LINK_TYPES: RelatedRecordType[] = ["Lead", "Customer"];

export function ActivityForm({
  onClose,
  onSubmit,
  defaultRelatedType,
  defaultRelatedName,
  defaultRelatedId,
}: {
  onClose: () => void;
  onSubmit: (input: CreateActivityInput) => Promise<unknown>;
  defaultRelatedType?: RelatedRecordType;
  defaultRelatedName?: string;
  defaultRelatedId?: string;
}) {
  const toast = useToast();
  const [type, setType] = useState<ActivityType>("Call");
  const [relatedType, setRelatedType] = useState<RelatedRecordType>(defaultRelatedType ?? "Lead");
  const [relatedName, setRelatedName] = useState(defaultRelatedName ?? "");
  const [ownerName, setOwnerName] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!relatedName.trim()) e.relatedName = `Link this activity to a ${relatedType.toLowerCase()}`;
    if (!ownerName.trim()) e.ownerName = "Who logged this activity?";
    if (!note.trim()) e.note = "Add a short note about what happened";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        type,
        relatedType,
        relatedId: defaultRelatedId ?? `manual_${Date.now()}`,
        relatedName: relatedName.trim(),
        ownerName: ownerName.trim(),
        note: note.trim(),
      });
      toast.success(`${type} logged`);
      onClose();
    } catch {
      setErrors({ form: "Something went wrong logging the activity. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title="Log Activity"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Logging…" : "Log Activity"}
          </Button>
        </>
      }
    >
      <FieldRow>
        <SelectField label="Activity Type" value={type} onChange={(e) => setType(e.target.value as ActivityType)} options={TYPES.map((t) => ({ value: t, label: t }))} />
        <SelectField label="Related To" value={relatedType} onChange={(e) => setRelatedType(e.target.value as RelatedRecordType)} options={LINK_TYPES.map((t) => ({ value: t, label: t }))} disabled={!!defaultRelatedType} />
      </FieldRow>
      {!defaultRelatedName && (
        <TextField label={`${relatedType} Name`} required value={relatedName} onChange={(e) => setRelatedName(e.target.value)} error={errors.relatedName} placeholder="e.g. Sterling Pumps" />
      )}
      <TextField label="Logged By" required value={ownerName} onChange={(e) => setOwnerName(e.target.value)} error={errors.ownerName} placeholder="e.g. Rohit M." />
      <TextAreaField label="Note" required rows={3} value={note} onChange={(e) => setNote(e.target.value)} error={errors.note} placeholder="What happened on this call/email/meeting?" />
      <FormError message={errors.form} />
    </Modal>
  );
}
