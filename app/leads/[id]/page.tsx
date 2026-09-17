"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Icon } from "../../../components/ui/Icon";
import { Panel } from "../../../components/ui/Card";
import { StatusTag, Tag } from "../../../components/ui/Tag";
import { QuickActions } from "../../../components/ui/QuickActions";
import { DataTable, Column } from "../../../components/ui/DataTable";
import { Button } from "../../../components/ui/Button";
import { DesignNote } from "../../../components/ui/PageHeader";
import { NoteForm } from "../../../components/forms/NoteForm";
import { ActivityForm } from "../../../components/forms/ActivityForm";
import { useLeadDetail } from "../../../lib/hooks/useLeads";
import { useNotesByRelated } from "../../../lib/hooks/useNotes";
import { useQuotations } from "../../../lib/hooks/useQuotations";
import { useRepository } from "../../../lib/repository/RepositoryProvider";
import { initials } from "../../../components/ui/Who";
import { formatInr, formatDateTime } from "../../../lib/format";
import { Quotation } from "../../../lib/types/domain";

function goBackOrTo(router: ReturnType<typeof useRouter>, fallback: string) {
  if (typeof window !== "undefined" && window.history.length > 1) {
    router.back();
  } else {
    router.push(fallback);
  }
}

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;
  const { lead, timeline, loading, appendActivity } = useLeadDetail(id);
  const { notes, refetch: refetchNotes } = useNotesByRelated(id);
  const { quotations } = useQuotations();
  const repo = useRepository();
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [showActivityForm, setShowActivityForm] = useState(false);

  if (loading && !lead) {
    return (
      <div className="page">
        <div className="skeleton" style={{ height: 220, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 300 }} />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="page">
        <a className="back-link" onClick={() => goBackOrTo(router, "/leads")}>
          <Icon name="back" size={14} /> Back to Leads
        </a>
        <Panel title="Lead not found">
          <p style={{ color: "var(--muted)", fontSize: 13.5 }}>
            This lead may have been removed, or the link is out of date.
          </p>
        </Panel>
      </div>
    );
  }

  const relatedQuotes = quotations.filter((q) => q.customerName === lead.name);

  const quoteColumns: Column<Quotation>[] = [
    { key: "quoteNo", header: "No.", render: (q) => q.quoteNo },
    { key: "amount", header: "Amount", render: (q) => formatInr(q.amount) },
    { key: "status", header: "Status", render: (q) => <StatusTag status={q.status} /> },
  ];

  return (
    <div className="page">
      <a className="back-link" onClick={() => goBackOrTo(router, "/leads")}>
        <Icon name="back" size={14} /> Back to Leads
      </a>
      <div className="crm-grid">
        <div className="card panel">
          <div className="profile-head">
            <div className="top">
              <div className="av-lg">{initials(lead.name)}</div>
              <div>
                <h3>{lead.name}</h3>
                <div className="co">{lead.industry} · {lead.city}</div>
              </div>
            </div>
            <div className="tagrow">
              <StatusTag status={lead.stage} />
              <Tag color="i">{lead.source}</Tag>
              <Tag color="n">Owner: {lead.ownerName}</Tag>
              <StatusTag status={lead.score} />
            </div>
            <QuickActions phone={lead.phone} email={lead.email} contactName={lead.name} />
          </div>
          <div className="info-grid">
            <div className="f"><label>Phone</label><div>{lead.phone}</div></div>
            <div className="f"><label>Email</label><div style={{ wordBreak: "break-all" }}>{lead.email}</div></div>
            <div className="f"><label>Assigned To</label><div>{lead.ownerName}</div></div>
            <div className="f"><label>Deal Value</label><div>{formatInr(lead.value)}</div></div>
          </div>
          <div className="panel-head" style={{ borderTop: "none" }}>
            <h3 style={{ fontSize: 13.5 }}>Lead Timeline</h3>
            <a className="more" href="#" onClick={(e) => { e.preventDefault(); setShowActivityForm(true); }}>
              <Icon name="plus" size={14} /> Log Activity
            </a>
          </div>
          <div className="tl">
            {timeline.length === 0 && (
              <p style={{ color: "var(--muted)", fontSize: 13, padding: "4px 0 12px" }}>No activity logged yet.</p>
            )}
            {timeline.map((t) => (
              <div className="tl-item" key={t.id}>
                <div className="dot"><Icon name={t.icon} size={14} /></div>
                <div className="body">
                  <div className="r1">
                    <b>{t.title}</b>
                    <span className="when">{formatDateTime(t.occurredAt)}</span>
                  </div>
                  <p>{t.actorName}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Panel title="Related Quotations" flush>
            <DataTable
              columns={quoteColumns}
              rows={relatedQuotes}
              emptyTitle="No quotations yet"
              emptyBody="Create one from the Quotations screen once this deal is ready."
            />
          </Panel>
          <Panel
            title="Notes"
            extraHead={
              <a className="more" href="#" onClick={(e) => { e.preventDefault(); setShowNoteForm(true); }}>
                <Icon name="plus" size={14} /> Add
              </a>
            }
          >
            {notes.length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: 13 }}>No notes yet for this lead.</p>
            ) : (
              <div className="notes-grid" style={{ gridTemplateColumns: "1fr" }}>
                {notes.map((n) => (
                  <div className={`note ${n.pinned ? "pinned" : ""}`} key={n.id}>
                    {n.pinned && (
                      <div style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--m)", fontSize: 11, fontWeight: 700 }}>
                        <Icon name="pin" size={14} /> PINNED
                      </div>
                    )}
                    <div className="txt">{n.text}</div>
                    <div className="foot">
                      <small>{n.authorName} · {formatDateTime(n.createdAt)}</small>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>

      <DesignNote>
        <b>Design note.</b> One profile header, one timeline, one place for quick actions. Related
        quotations and notes surface right here so nobody has to go hunting across screens.
      </DesignNote>

      {showNoteForm && (
        <NoteForm
          onClose={() => { setShowNoteForm(false); refetchNotes(); }}
          onSubmit={(input) => repo.notes.create(input)}
          defaultLinkedType="Lead"
          defaultLinkedName={lead.name}
          defaultLinkedId={lead.id}
        />
      )}
      {showActivityForm && (
        <ActivityForm
          onClose={() => setShowActivityForm(false)}
          onSubmit={async (input) => {
            await appendActivity(
              input.type === "Call" ? "phone" : input.type === "Email" ? "mail" : input.type === "WhatsApp" ? "wa" : input.type === "Meeting" ? "cal" : "pulse",
              `${input.type}: ${input.note}`,
              input.ownerName
            );
          }}
          defaultRelatedType="Lead"
          defaultRelatedName={lead.name}
          defaultRelatedId={lead.id}
        />
      )}
    </div>
  );
}
