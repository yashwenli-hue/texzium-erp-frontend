"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "../ui/Modal";
import { TextAreaField } from "../ui/FormField";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { useToast } from "../ui/Toast";
import { UpdateNoteInput } from "../../lib/repository/interfaces";
import { Note } from "../../lib/types/domain";
import { formatDateTime } from "../../lib/format";

const RECORD_ROUTE: Record<Note["linkedType"], string> = {
  Lead: "/leads",
  Customer: "/customers",
  Opportunity: "/opportunities",
};

export function NoteDetailModal({
  note,
  onClose,
  onUpdate,
}: {
  note: Note;
  onClose: () => void;
  onUpdate: (id: string, input: UpdateNoteInput) => Promise<unknown>;
}) {
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(note.text);
  const [pinned, setPinned] = useState(note.pinned);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!text.trim()) return;
    setSaving(true);
    try {
      await onUpdate(note.id, { text: text.trim(), pinned });
      toast.show("Note updated", "check");
      setEditing(false);
    } catch {
      toast.show("Could not save this note — please try again", "alert");
    } finally {
      setSaving(false);
    }
  }

  function goToRecord() {
    router.push(`${RECORD_ROUTE[note.linkedType]}/${note.linkedId}`);
    onClose();
  }

  return (
    <Modal
      title={editing ? "Edit Note" : "Note"}
      onClose={onClose}
      footer={
        editing ? (
          <>
            <Button variant="ghost" onClick={() => { setEditing(false); setText(note.text); setPinned(note.pinned); }} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" icon="edit" onClick={() => setEditing(true)}>
              Edit
            </Button>
            <Button variant="primary" onClick={onClose}>
              Close
            </Button>
          </>
        )
      }
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <button className="tag i" style={{ border: "none", cursor: "pointer" }} onClick={goToRecord}>
          <Icon name={note.linkedType === "Lead" ? "funnel" : note.linkedType === "Customer" ? "building" : "brief"} size={13} />
          {note.linkedName}
          <Icon name="arrow" size={12} />
        </button>
        {!editing && note.pinned && (
          <span style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--m)", fontSize: 11, fontWeight: 700 }}>
            <Icon name="pin" size={13} /> PINNED
          </span>
        )}
      </div>

      {editing ? (
        <>
          <TextAreaField label="Note" rows={6} value={text} onChange={(e) => setText(e.target.value)} />
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginTop: 4 }}>
            <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} style={{ width: "auto" }} />
            Pin this note
          </label>
        </>
      ) : (
        <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--text)", whiteSpace: "pre-wrap" }}>{note.text}</p>
      )}

      <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--line-2)", fontSize: 12, color: "var(--muted)" }}>
        {note.authorName} · {formatDateTime(note.createdAt)}
      </div>
    </Modal>
  );
}
