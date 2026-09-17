"use client";

import { useState } from "react";
import { PageHeader, DesignNote } from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
import { ChipGroup, Chip } from "../../components/ui/Tag";
import { Icon } from "../../components/ui/Icon";
import { NoteForm } from "../../components/forms/NoteForm";
import { useNotes } from "../../lib/hooks/useNotes";
import { formatDateTime } from "../../lib/format";

export default function NotesPage() {
  const { notes, createNote } = useNotes();
  const [filter, setFilter] = useState<"All" | "Pinned" | "Lead" | "Customer">("All");
  const [showForm, setShowForm] = useState(false);

  const filtered = notes.filter((n) => {
    if (filter === "All") return true;
    if (filter === "Pinned") return n.pinned;
    return n.linkedType === filter;
  });

  return (
    <div className="page">
      <PageHeader
        eyebrow="RevenueOS · Notes"
        title="Notes"
        subtitle="Context and institutional memory attached to leads and accounts."
        cta={
          <Button variant="primary" icon="plus" onClick={() => setShowForm(true)}>
            New Note
          </Button>
        }
      />

      <ChipGroup>
        <Chip label="All" active={filter === "All"} onClick={() => setFilter("All")} />
        <Chip label="Pinned" active={filter === "Pinned"} onClick={() => setFilter("Pinned")} />
        <Chip label="Leads" active={filter === "Lead"} onClick={() => setFilter("Lead")} />
        <Chip label="Customers" active={filter === "Customer"} onClick={() => setFilter("Customer")} />
      </ChipGroup>

      {filtered.length === 0 ? (
        <div className="card panel" style={{ marginTop: 16 }}>
          <div className="empty-state">
            <div className="ic"><Icon name="notepad" size={20} /></div>
            <b>No notes match this filter</b>
          </div>
        </div>
      ) : (
        <div className="notes-grid" style={{ marginTop: 14 }}>
          {filtered.map((n) => (
            <div className={`note ${n.pinned ? "pinned" : ""}`} key={n.id}>
              {n.pinned && (
                <div style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--m)", fontSize: 11, fontWeight: 700 }}>
                  <Icon name="pin" size={14} /> PINNED
                </div>
              )}
              <div className="txt">{n.text}</div>
              <div className="foot">
                <div className="who">
                  <div className="av" style={{ width: 26, height: 26, fontSize: 10.5 }}>
                    {n.authorName.split(" ").map((w) => w[0]).join("")}
                  </div>
                  <small>{n.authorName} · {formatDateTime(n.createdAt)}</small>
                </div>
              </div>
              <div>
                <span className="tag n"><Icon name="building" size={14} /> {n.linkedName}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <DesignNote>
        <b>Design note.</b> Notes are short and scannable by design — a card, not a document. Pinned
        notes get a colored border so they surface before routine notes.
      </DesignNote>

      {showForm && <NoteForm onClose={() => setShowForm(false)} onSubmit={createNote} />}
    </div>
  );
}
