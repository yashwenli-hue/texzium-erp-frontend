"use client";

import { useParams, useRouter } from "next/navigation";
import { Icon } from "../../../components/ui/Icon";
import { Panel } from "../../../components/ui/Card";
import { StatusTag, QuotationStatusTag, Tag } from "../../../components/ui/Tag";
import { DataTable, Column } from "../../../components/ui/DataTable";
import { Button, EmptyState } from "../../../components/ui/Button";
import { DesignNote } from "../../../components/ui/PageHeader";
import { ContactRowActions } from "../../../components/ui/ContactRowActions";
import { useCustomerDetail } from "../../../lib/hooks/useCustomers";
import { useRepository } from "../../../lib/repository/RepositoryProvider";
import { initials } from "../../../components/ui/Who";
import { formatInr, formatDate, formatDateTime } from "../../../lib/format";
import { Quotation, Contact, CustomerGstRegistration } from "../../../lib/types/domain";

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
  const repo = useRepository();
  const isReal = repo.kind === "real";
  const id = params?.id;
  const { customer, contacts, quotations, loading, error, refetch } = useCustomerDetail(id);

  if (loading && !customer) {
    return (
      <div className="page">
        <div className="skeleton" style={{ height: 220, marginBottom: 16 }} />
      </div>
    );
  }

  // A fetch failure (network/5xx) is not the same as a genuine not-found —
  // only getById() resolving to null means the customer truly doesn't
  // exist. Same pattern as every other detail page in this app.
  if (error) {
    return (
      <div className="page">
        <a className="back-link" onClick={() => goBackOrTo(router, "/customers")}>
          <Icon name="back" size={14} /> Back to Customers
        </a>
        <Panel title="Couldn't load this customer">
          <EmptyState
            icon="alert"
            title="Something went wrong"
            body={error.message || "Something went wrong reaching the RevenueOS backend. Please try again."}
            action={<Button variant="ghost" onClick={refetch}>Retry</Button>}
          />
        </Panel>
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
    { key: "status", header: "Status", render: (q) => <QuotationStatusTag status={q.status} /> },
    { key: "quoteDate", header: "Quote Date", render: (q) => formatDate(q.quoteDate ?? q.createdAt) },
  ];

  const contactColumns: Column<Contact>[] = [
    { key: "name", header: "Contact", render: (c) => <span><b>{c.name}</b><br /><small style={{ color: "var(--muted)" }}>{c.email}</small></span> },
    { key: "title", header: "Title", render: (c) => c.title },
    { key: "type", header: "Type", render: (c) => <StatusTag status={c.type} /> },
    { key: "lastContactedAt", header: "Last Contacted", render: (c) => (c.lastContactedAt ? formatDate(c.lastContactedAt) : "—") },
    { key: "actions", header: "Actions", render: (c) => <ContactRowActions phone={c.phone} email={c.email} name={c.name} /> },
  ];

  const gstColumns: Column<CustomerGstRegistration>[] = [
    { key: "gstin", header: "GSTIN", render: (g) => g.gstin },
    { key: "legalName", header: "Legal Name", render: (g) => <span>{g.legalName}{g.tradeName && <><br /><small style={{ color: "var(--muted)" }}>{g.tradeName}</small></>}</span> },
    { key: "branchName", header: "Branch", render: (g) => g.branchName ?? "—" },
    { key: "state", header: "State", render: (g) => g.stateName },
    { key: "address", header: "Address", render: (g) => `${g.addressLine1}, ${g.city} ${g.pincode}` },
    { key: "isDefault", header: "Default", render: (g) => (g.isDefault ? <Tag color="g">Default</Tag> : "—") },
    { key: "isActive", header: "Status", render: (g) => <Tag color={g.isActive ? "g" : "b"}>{g.isActive ? "Active" : "Inactive"}</Tag> },
  ];

  // Real account timeline entries are only ever the real Quotation history
  // (name-matched — see the design note below) plus one synthetic "created"
  // event; account status/owner have no real backend basis (see
  // CustomerStatus in lib/types/domain.ts) so neither is shown as an event
  // in real mode.
  const timelineEvents = [
    ...quotations
      .slice()
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .map((q) => ({
        id: q.id,
        icon: "file",
        title: `Quotation ${q.quoteNo} — ${q.status}`,
        detail: formatInr(q.amount),
        at: q.createdAt,
      })),
    isReal
      ? { id: "created", icon: "user", title: "Customer created", detail: customer.customerCode, at: customer.createdAt }
      : { id: "created", icon: "user", title: "Account created", detail: `Converted from a won lead by ${customer.ownerName ?? "Unassigned"}`, at: customer.customerSince ?? customer.createdAt },
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
                <div className="av-lg">{initials(customer.customerName)}</div>
                <div>
                  <h3>{customer.customerName}</h3>
                  {isReal ? (
                    <div className="co">{customer.customerCode}{customer.customerType ? ` · ${customer.customerType}` : ""}</div>
                  ) : (
                    <div className="co">{customer.industry} · {customer.city} · Customer since {formatDate(customer.customerSince!)}</div>
                  )}
                </div>
              </div>
              <div className="tagrow">
                {isReal ? (
                  <>
                    <Tag color={customer.isActive ? "g" : "b"}>{customer.isActive ? "Active" : "Inactive"}</Tag>
                    {customer.isVendor && <Tag color="i">Vendor-linked</Tag>}
                    <Tag color="n">{contacts.length} contacts</Tag>
                  </>
                ) : (
                  <>
                    {customer.status && <StatusTag status={customer.status} />}
                    <Tag color="n">Owner: {customer.ownerName}</Tag>
                    <Tag color="i">{contacts.length} contacts</Tag>
                  </>
                )}
              </div>
            </div>
            {isReal ? (
              <div className="info-grid">
                <div className="f"><label>PAN</label><div>{customer.panNumber ?? "—"}</div></div>
                <div className="f"><label>Email</label><div>{customer.email ?? "—"}</div></div>
                <div className="f"><label>Phone</label><div>{customer.phone ?? "—"}</div></div>
                <div className="f"><label>Created</label><div>{formatDate(customer.createdAt)}</div></div>
                <div className="f"><label>Updated</label><div>{formatDate(customer.updatedAt)}</div></div>
              </div>
            ) : (
              <div className="info-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
                <div className="f"><label>Lifetime Value</label><div>{formatInr(customer.lifetimeValue ?? 0)}</div></div>
                <div className="f"><label>Open Orders</label><div>{customer.openOrders ?? 0}</div></div>
                <div className="f"><label>Account Owner</label><div>{customer.ownerName}</div></div>
                <div className="f"><label>Status</label><div>{customer.status}</div></div>
              </div>
            )}
          </div>

          {isReal && (
            <Panel title="GST Registrations" flush>
              <DataTable
                columns={gstColumns}
                rows={customer.gstRegistrations}
                emptyTitle="No GST registrations"
                emptyBody="This customer has no GST registration on file."
              />
            </Panel>
          )}

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
        {isReal ? (
          <>
            <b>Design note.</b> Customer profile, PAN/email/phone, active state, vendor linkage and GST
            registrations above all come from the VERIFIED <code>GET /customers</code> route. The backend
            does not enforce exactly one default GST registration per customer — if more than one shows
            &quot;Default&quot;, that is real data, not a display bug. Quotation History and Key Contacts are
            matched by customer name text, not a backend foreign key — the real Customer model has no
            relationship to Quotations, Contacts, or any other Quote-to-Cash document (confirmed by reading
            the Prisma schema directly: the only real relation to Customer anywhere in the schema is its own
            GST registrations). There is no GST creation/edit action here because{" "}
            <code>POST /customer-gst</code> is currently broken for every payload, the same issue affecting
            Customer creation above.
          </>
        ) : (
          <>
            <b>Design note.</b> Customer Details mirrors Lead Details on purpose — same profile header,
            same info-grid, same timeline pattern. Account Timeline is built from this account&apos;s real
            quotations, not placeholder text. Status (Active/At Risk/New/Churned) is frontend-only — the
            verified Customer master contract has no status field yet (see CustomerStatus in
            lib/types/domain.ts).
          </>
        )}
      </DesignNote>
    </div>
  );
}
