"use client";

import { useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "../../components/ui/PageHeader";
import { Icon } from "../../components/ui/Icon";
import { QuotationStatusTag, ProformaInvoiceStatusTag, SalesOrderStatusTag, SalesInvoiceStatusTag } from "../../components/ui/Tag";
import { useSearch } from "../../lib/hooks/useSearch";
import { useRepository } from "../../lib/repository/RepositoryProvider";
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
  const params = useSearchParams();
  const repo = useRepository();
  const { term, setTerm, results, loading, error, totalCount } = useSearch();

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
        subtitle="Find any lead, opportunity, quotation, proforma invoice, sales order, sales invoice or customer in RevenueOS."
      />

      <div className="search-hero">
        <Icon name="search" size={18} />
        <input
          autoFocus
          type="search"
          aria-label="Search RevenueOS"
          placeholder="Search RevenueOS…"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
        {loading && <span style={{ fontSize: 12, color: "var(--muted)" }}>Searching…</span>}
      </div>

      {!term.trim() && (
        <p style={{ color: "var(--muted)", fontSize: 13.5 }}>
          Start typing to search across leads, opportunities, quotations, proforma invoices, sales
          orders, sales invoices and customers{repo.kind === "real" ? "" : ", contacts and notes"}. Only records you
          may open are searched.
        </p>
      )}

      {term.trim() && error && (
        <div className="empty-state">
          <div className="ic"><Icon name="alert" size={20} /></div>
          <b>Search failed</b>
          <p>{error}</p>
        </div>
      )}

      {term.trim() && !loading && !error && totalCount === 0 && (
        <div className="empty-state">
          <div className="ic"><Icon name="search" size={20} /></div>
          <b>No results for &quot;{term}&quot;</b>
          <p>Try a different name, city, or quote number.</p>
        </div>
      )}

      <p className="sr-only" role="status">
        {term.trim() && !loading ? (error ? "Search failed" : `${totalCount} result${totalCount === 1 ? "" : "s"}`) : ""}
      </p>

      {term.trim() && !error && totalCount > 0 && (
        <div style={{ marginTop: 12 }}>
          {results.leads.length > 0 && (
            <div className="search-group">
              <h4><Icon name="funnel" size={14} /> Leads <span className="cnt">({results.leads.length})</span></h4>
              {results.leads.map((l) => (
                <Link className="result result-link" key={l.id} href={`/leads/${l.id}`}>
                  <div className="ic"><Icon name="funnel" size={16} /></div>
                  <div className="body">
                    <b>{highlight(l.customerName, term)}</b>
                    <small>{l.companyName ?? l.sourceName} · {formatLeadStatus(l.status)} · {l.assignedToName ?? "Unassigned"}</small>
                  </div>
                </Link>
              ))}
            </div>
          )}
          {results.opportunities.length > 0 && (
            <div className="search-group">
              <h4><Icon name="target" size={14} /> Opportunities <span className="cnt">({results.opportunities.length})</span></h4>
              {results.opportunities.map((o) => (
                <Link className="result result-link" key={o.id} href={`/opportunities/${o.id}`}>
                  <div className="ic"><Icon name="target" size={16} /></div>
                  <div className="body">
                    <b>{highlight(o.title, term)}</b>
                    <small>{highlight(o.customerName, term)} · {formatInr(o.expectedValue)}</small>
                  </div>
                </Link>
              ))}
            </div>
          )}
          {results.customers.length > 0 && (
            <div className="search-group">
              <h4><Icon name="building" size={14} /> Customers <span className="cnt">({results.customers.length})</span></h4>
              {results.customers.map((c) => (
                <Link className="result result-link" key={c.id} href={`/customers/${c.id}`}>
                  <div className="ic"><Icon name="building" size={16} /></div>
                  <div className="body">
                    <b>{highlight(c.customerName, term)}</b>
                    <small>
                      {`${c.customerCode} · ${c.isActive ? "Active" : "Inactive"}${c.email ? ` · ${c.email}` : ""}`}
                    </small>
                  </div>
                </Link>
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
                <Link className="result result-link" key={q.id} href={`/quotations/${q.id}`}>
                  <div className="ic"><Icon name="file" size={16} /></div>
                  <div className="body">
                    <b>{highlight(q.quoteNo, term)}</b>
                    <small>{highlight(q.customerName, term)} · {formatInr(q.amount)} · <QuotationStatusTag status={q.status} /></small>
                  </div>
                </Link>
              ))}
            </div>
          )}
          {results.proformaInvoices.length > 0 && (
            <div className="search-group">
              <h4><Icon name="brief" size={14} /> Proforma Invoices <span className="cnt">({results.proformaInvoices.length})</span></h4>
              {results.proformaInvoices.map((p) => (
                <Link className="result result-link" key={p.id} href={`/proforma-invoices/${p.id}`}>
                  <div className="ic"><Icon name="brief" size={16} /></div>
                  <div className="body">
                    <b>{highlight(p.proformaNumber, term)}</b>
                    <small>{highlight(p.customerName, term)} · {formatInr(p.totalAmount)} · <ProformaInvoiceStatusTag status={p.status} /></small>
                  </div>
                </Link>
              ))}
            </div>
          )}
          {results.salesOrders.length > 0 && (
            <div className="search-group">
              <h4><Icon name="cart" size={14} /> Sales Orders <span className="cnt">({results.salesOrders.length})</span></h4>
              {results.salesOrders.map((so) => (
                <Link className="result result-link" key={so.id} href={`/sales-orders/${so.id}`}>
                  <div className="ic"><Icon name="cart" size={16} /></div>
                  <div className="body">
                    <b>{highlight(so.salesOrderCode, term)}</b>
                    <small>{highlight(so.customerName, term)} · {formatInr(so.totalAmount)} · <SalesOrderStatusTag status={so.status} /></small>
                  </div>
                </Link>
              ))}
            </div>
          )}
          {results.salesInvoices.length > 0 && (
            <div className="search-group">
              <h4><Icon name="receipt" size={14} /> Sales Invoices <span className="cnt">({results.salesInvoices.length})</span></h4>
              {results.salesInvoices.map((si) => (
                <Link className="result result-link" key={si.id} href={`/sales-invoices/${si.id}`}>
                  <div className="ic"><Icon name="receipt" size={16} /></div>
                  <div className="body">
                    <b>{highlight(si.invoiceNumber, term)}</b>
                    <small>{highlight(si.customerName, term)} · {formatInr(si.totalAmount)} · <SalesInvoiceStatusTag status={si.status} /></small>
                  </div>
                </Link>
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
