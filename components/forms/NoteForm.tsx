"use client";

import { useState } from "react";
import { Modal } from "../ui/Modal";
import { TextAreaField, SelectField, TextField, FieldRow } from "../ui/FormField";
import { Button } from "../ui/Button";
import { useToast } from "../ui/Toast";
import { CreateNoteInput } from "../../lib/repository/interfaces";
import { RelatedRecordType } from "../../lib/types/domain";

const LINK_TYPES: RelatedRecordType[] = ["Lead", "Customer"];

export function NoteForm({
  onClose,
  onSubmit,
  defaultLinkedType,
  defaultLinkedName,
  defaultLinkedId,
}: {
  onClose: () => void;
  onSubmit: (input: CreateNoteInput) => Promise<unknown>;
  defaultLinkedType?: RelatedRecordType;
  defaultLinkedName?: string;
  defaultLinkedId?: string;
}) {
  const toast = useToast();
  const [text, setText] = useState("");
  const [linkedType, setLinkedType] = useState<RelatedRecordType>(defaultLinkedType ?? "Lead");
  const [linkedName, setLinkedName] = useState(defaultLinkedName ?? "");
  const [pinned, setPinned] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!text.trim()) e.text = "Note text is required";
    if (!linkedName.trim()) e.linkedName = `Link this note to a ${linkedType.toLowerCase()}`;
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        text: text.trim(),
        linkedType,
        linkedId: defaultLinkedId ?? `manual_${Date.now()}`,
        linkedName: linkedName.trim(),
        authorName: "You",
        pinned,
      });
      toast.show("Note added", "check");
      onClose();
    } catch {
      setErrors({ form: "Something went wrong saving the note. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title="New Note"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Saving…" : "Save Note"}
          </Button>
        </>
      }
    >
      <TextAreaField label="Note" required rows={4} value={text} onChange={(e) => setText(e.target.value)} error={errors.text} placeholder="Add context that will help the next person who talks to this account…" />
      {!defaultLinkedName && (
        <FieldRow>
          <SelectField label="Linked To" value={linkedType} onChange={(e) => setLinkedType(e.target.value as RelatedRecordType)} options={LINK_TYPES.map((t) => ({ value: t, label: t }))} />
          <TextField label={`${linkedType} Name`} required value={linkedName} onChange={(e) => setLinkedName(e.target.value)} error={errors.linkedName} placeholder="e.g. Sterling Pumps" />
        </FieldRow>
      )}
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginTop: 4 }}>
        <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} style={{ width: "auto" }} />
        Pin this note
      </label>
      {errors.form && <p style={{ color: "var(--bad)", fontSize: 12.5 }}>{errors.form}</p>}
    </Modal>
  );
}
