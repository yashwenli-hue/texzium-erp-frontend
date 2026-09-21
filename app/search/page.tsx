"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader, DesignNote } from "../../components/ui/PageHeader";
import { Icon } from "../../components/ui/Icon";
import { useSearch } from "../../lib/hooks/useSearch";
import { formatInr } from "../../lib/format";
import { formatLeadStatus } from "../../lib/types/domain";

function highlight(text: string, term: string) {
  if (!term.trim()) return text;
  const idx = text.toLowerCase().indexOf(term.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark>{text.slice(idx, idx + term.length)}</mark>
      {text.slice(idx + term.length)}
    </>
  );
}

function SearchInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { term, setTerm, results, loading, totalCount } = useSearch();

  useEffect(() => {
    const q = params?.get("q");
    if (q) setTerm(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="page">
      <PageHeader
        eyebrow="RevenueOS · Search"
        title="Search"
        subtitle="Find any lead, customer, contact, quotation or note in RevenueOS."
      />

      <div className="search-hero">
        <Icon name="search" size={18} />
        <input
          autoFocus
          placeholder="Search RevenueOS…"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
        {loading && <span style={{ fontSize: 12, color: "var(--muted)" }}>Searching…</span>}
      </div>

      {!term.trim() && (
        <p style={{ color: "var(--muted)", fontSize: 13.5 }}>
          Start typing to search across leads, customers, contacts, quotations and notes.
        </p>
      )}

      {term.trim() && !loading && totalCount === 0 && (
        <div className="empty-state">
          <div className="ic"><Icon name="search" size={20} /></div>
          <b>No results for &quot;{term}&quot;</b>
          <p>Try a different name, city, or quote number.</p>
        </div>
      )}

      {term.trim() && totalCount > 0 && (
        <div style={{ marginTop: 12 }}>
          {results.leads.length > 0 && (
            <div className="search-group">
              <h4><Icon name="funnel" size={14} /> Leads <span className="cnt">({results.leads.length})</span></h4>
              {results.leads.map((l) => (
                <div className="result" key={l.id} onClick={() => router.push(`/leads/${l.id}`)} style={{ cursor: "pointer" }}>
                  <div className="ic"><Icon name="funnel" size={16} /></div>
                  <div className="body">
                    <b>{highlight(l.customerName, term)}</b>
                    <small>{l.companyName ?? l.sourceName} · {formatLeadStatus(l.status)} · {l.assignedToName ?? "Unassigned"}</small>
                  </div>
                </div>
              ))}
            </div>
          )}
          {results.customers.length > 0 && (
            <div className="search-group">
              <h4><Icon name="building" size={14} /> Customers <span className="cnt">({results.customers.length})</span></h4>
              {results.customers.map((c) => (
                <div className="result" key={c.id} onClick={() => router.push(`/customers/${c.id}`)} style={{ cursor: "pointer" }}>
                  <div className="ic"><Icon name="building" size={16} /></div>
                  <div className="body">
                    <b>{highlight(c.customerName, term)}</b>
                    <small>{c.industry} · {c.city} · {c.status} · LTV {formatInr(c.lifetimeValue)}</small>
                  </div>
                </div>
              ))}
            </div>
          )}
          {results.contacts.length > 0 && (
            <div className="search-group">
              <h4><Icon name="users" size={14} /> Contacts <span className="cnt">({results.contacts.length})</span></h4>
              {results.contacts.map((c) => (
                <div className="result" key={c.id}>
                  <div className="ic"><Icon name="user" size={16} /></div>
                  <div className="body">
                    <b>{highlight(c.name, term)}</b>
                    <small>{c.title} · {highlight(c.companyName, term)}</small>
                  </div>
                </div>
              ))}
            </div>
          )}
          {results.quotations.length > 0 && (
            <div className="search-group">
              <h4><Icon name="file" size={14} /> Quotations <span className="cnt">({results.quotations.length})</span></h4>
              {results.quotations.map((q) => (
                <div className="result" key={q.id}>
                  <div className="ic"><Icon name="file" size={16} /></div>
                  <div className="body">
                    <b>{highlight(q.quoteNo, term)}</b>
                    <small>{highlight(q.customerName, term)} · {formatInr(q.amount)} · {q.status}</small>
                  </div>
                </div>
              ))}
            </div>
          )}
          {results.notes.length > 0 && (
            <div className="search-group">
              <h4><Icon name="notepad" size={14} /> Notes <span className="cnt">({results.notes.length})</span></h4>
              {results.notes.map((n) => (
                <div className="result" key={n.id}>
                  <div className="ic"><Icon name="notepad" size={16} /></div>
                  <div className="body">
                    <b>Note on {n.linkedName}</b>
                    <small>{highlight(n.text.slice(0, 90), term)}{n.text.length > 90 ? "…" : ""}</small>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <DesignNote>
        <b>Design note.</b> Results are grouped by record type with the matching term highlighted and
        update as you type — this queries the current in-memory dataset directly, with the same
        debounce behavior a real API call would need.
      </DesignNote>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="page" />}>
      <SearchInner />
    </Suspense>
  );
}
