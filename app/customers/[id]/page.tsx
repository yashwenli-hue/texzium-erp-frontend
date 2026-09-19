"use client";

import { useParams, useRouter } from "next/navigation";
import { Icon } from "../../../components/ui/Icon";
import { Panel } from "../../../components/ui/Card";
import { StatusTag, Tag } from "../../../components/ui/Tag";
import { DataTable, Column } from "../../../components/ui/DataTable";
import { DesignNote } from "../../../components/ui/PageHeader";
import { ContactRowActions } from "../../../components/ui/ContactRowActions";
import { useCustomerDetail } from "../../../lib/hooks/useCustomers";
import { initials } from "../../../components/ui/Who";
import { formatInr, formatDate, formatDateTime } from "../../../lib/format";
import { Quotation, Contact } from "../../../lib/types/domain";

function goBackOrTo(router: ReturnType<typeof useRouter>, fallback: string) {
  if (typeof window !== "undefined" && window.history.length > 1) {
    router.back();
  } else {
    router.push(fallback);
  }
}

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;
  const { customer, contacts, quotations, loading } = useCustomerDetail(id);

  if (loading && !customer) {
    return (
      <div className="page">
        <div className="skeleton" style={{ height: 220, marginBottom: 16 }} />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="page">
        <a className="back-link" onClick={() => goBackOrTo(router, "/customers")}>
          <Icon name="back" size={14} /> Back to Customers
        </a>
        <Panel title="Customer not found">
          <p style={{ color: "var(--muted)", fontSize: 13.5 }}>
            This account may have been removed, or the link is out of date.
          </p>
        </Panel>
      </div>
    );
  }

  const quoteColumns: Column<Quotation>[] = [
    { key: "quoteNo", header: "No.", render: (q) => q.quoteNo },
    { key: "opportunityName", header: "Opportunity", render: (q) => q.opportunityName },
    { key: "amount", header: "Amount", render: (q) => formatInr(q.amount) },
    { key: "status", header: "Status", render: (q) => <StatusTag status={q.status} /> },
    { key: "validUntil", header: "Valid Until", render: (q) => formatDate(q.validUntil) },
  ];

  const contactColumns: Column<Contact>[] = [
    { key: "name", header: "Contact", render: (c) => <span><b>{c.name}</b><br /><small style={{ color: "var(--muted)" }}>{c.email}</small></span> },
    { key: "title", header: "Title", render: (c) => c.title },
    { key: "type", header: "Type", render: (c) => <StatusTag status={c.type} /> },
    { key: "lastContactedAt", header: "Last Contacted", render: (c) => (c.lastContactedAt ? formatDate(c.lastContactedAt) : "—") },
    { key: "actions", header: "Actions", render: (c) => <ContactRowActions phone={c.phone} email={c.email} name={c.name} /> },
  ];

  // Real account timeline, not fabricated — derived from this customer's
  // own quotations plus the verified customerSince date. No new field
  // invented; account status has no verified backend field at all
  // (see CustomerStatus in lib/types/domain.ts) so it isn't shown as an event.
  const timelineEvents = [
    ...quotations
      .slice()
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .map((q) => ({
        id: q.id,
        icon: "file",
        title: `Quotation ${q.quoteNo} — ${q.status}`,
        detail: `${formatInr(q.amount)} · V${q.version}`,
        at: q.createdAt,
      })),
    { id: "created", icon: "user", title: "Account created", detail: `Converted from a won lead by ${customer.ownerName}`, at: customer.customerSince },
  ].sort((a, b) => (a.at < b.at ? 1 : -1));

  return (
    <div className="page">
      <a className="back-link" onClick={() => goBackOrTo(router, "/customers")}>
        <Icon name="back" size={14} /> Back to Customers
      </a>
      <div className="crm-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card panel">
            <div className="profile-head">
              <div className="top">
                <div className="av-lg">{initials(customer.name)}</div>
                <div>
                  <h3>{customer.name}</h3>
                  <div className="co">{customer.industry} · {customer.city} · Customer since {formatDate(customer.customerSince)}</div>
                </div>
              </div>
              <div className="tagrow">
                <StatusTag status={customer.status} />
                <Tag color="n">Owner: {customer.ownerName}</Tag>
                <Tag color="i">{contacts.length} contacts</Tag>
              </div>
            </div>
            <div className="info-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
              <div className="f"><label>Lifetime Value</label><div>{formatInr(customer.lifetimeValue)}</div></div>
              <div className="f"><label>Open Orders</label><div>{customer.openOrders}</div></div>
              <div className="f"><label>Account Owner</label><div>{customer.ownerName}</div></div>
              <div className="f"><label>Status</label><div>{customer.status}</div></div>
            </div>
          </div>
          <Panel title="Quotation History" flush>
            <DataTable columns={quoteColumns} rows={quotations} emptyTitle="No quotations yet" />
          </Panel>
          <Panel title="Key Contacts" flush>
            <DataTable columns={contactColumns} rows={contacts} emptyTitle="No contacts logged" />
          </Panel>
        </div>
        <div>
          <Panel title="Account Timeline">
            <div className="tl">
              {timelineEvents.map((ev) => (
                <div className="tl-item" key={ev.id}>
                  <div className="dot"><Icon name={ev.icon} size={14} /></div>
                  <div className="body">
                    <div className="r1"><b>{ev.title}</b><span className="when">{formatDateTime(ev.at)}</span></div>
                    <p>{ev.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      <DesignNote>
        <b>Design note.</b> Customer Details mirrors Lead Details on purpose — same profile header,
        same info-grid, same timeline pattern. Account Timeline is built from this account&apos;s real
        quotations, not placeholder text. Status (Active/At Risk/New/Churned) is frontend-only — the
        verified Customer master contract has no status field yet (see CustomerStatus in
        lib/types/domain.ts).
      </DesignNote>
    </div>
  );
}
