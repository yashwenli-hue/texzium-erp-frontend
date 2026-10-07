"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "../../components/ui/PageHeader";
import { Panel } from "../../components/ui/Card";
import { Button, EmptyState, Pagination, paginate } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { Who } from "../../components/ui/Who";
import { Chip, ChipGroup, CustomerStatusTag, Tag } from "../../components/ui/Tag";
import { ResponsiveList, ResponsiveColumn } from "../../components/ui/ResponsiveList";
import { CustomerForm } from "../../components/forms/CustomerForm";
import { useCustomers } from "../../lib/hooks/useCustomers";
import { useAuth } from "../../lib/auth/AuthContext";
import { Customer } from "../../lib/types/domain";
import { CUSTOMER_PERMISSIONS, normalizeCustomerName, quotingBlockers } from "../../lib/repository/shared/customerLifecycle";
import { formatDate } from "../../lib/format";

const PAGE_SIZE = 10;
type Filter = "all" | "active" | "inactive" | "needsGst";

const activeRegistrations = (c: Customer) => c.gstRegistrations.filter((g) => g.isActive);
const needsGst = (c: Customer) => quotingBlockers(c).includes("NO_ACTIVE_GST") && c.isActive;

function matches(c: Customer, term: string): boolean {
  const q = normalizeCustomerName(term);
  if (!q) return true;
  const fields = [c.customerName, c.customerCode, c.panNumber ?? "", c.email ?? "", c.phone ?? "", ...c.gstRegistrations.map((g) => g.gstin)];
  return fields.some((f) => f.toLowerCase().includes(q));
}

function gstSummary(c: Customer): string {
  const active = activeRegistrations(c);
  if (active.length === 0) return c.gstRegistrations.length ? "None active" : "None";
  const def = active.find((g) => g.isDefault) ?? active[0];
  return `${active.length} active · ${def.stateName}`;
}

export default function CustomersPage() {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const canCreate = hasPermission(CUSTOMER_PERMISSIONS.create);
  const { customers, loading, error, createCustomer, refetch } = useCustomers();
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [term, setTerm] = useState("");
  const [page, setPage] = useState(1);

  const counts = useMemo(
    () => ({
      all: customers.length,
      active: customers.filter((c) => c.isActive).length,
      inactive: customers.filter((c) => !c.isActive).length,
      needsGst: customers.filter(needsGst).length,
    }),
    [customers]
  );

  const filtered = useMemo(
    () =>
      customers.filter((c) => {
        if (!matches(c, term)) return false;
        if (filter === "active") return c.isActive;
        if (filter === "inactive") return !c.isActive;
        if (filter === "needsGst") return needsGst(c);
        return true;
      }),
    [customers, filter, term]
  );
  const rows = paginate(filtered, page, PAGE_SIZE);

  const choose = (f: Filter) => {
    setFilter(f);
    setPage(1);
  };

  const columns: ResponsiveColumn<Customer>[] = [
    { key: "account", header: "Account", primary: true, render: (c) => <Who name={c.customerName} sub={c.customerCode + (c.customerType ? ` · ${c.customerType}` : "")} /> },
    { key: "contact", header: "Contact", render: (c) => (c.email || c.phone ? [c.email, c.phone].filter(Boolean).join(" · ") : "—") },
    { key: "gst", header: "GST registrations", render: (c) => gstSummary(c) },
    {
      key: "status",
      header: "Status",
      render: (c) => (
        <span style={{ display: "inline-flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <CustomerStatusTag isActive={c.isActive} />
          {needsGst(c) && <Tag color="w">Can&apos;t be quoted yet</Tag>}
        </span>
      ),
    },
    { key: "created", header: "Created", render: (c) => formatDate(c.createdAt) },
  ];

  const card = (c: Customer) => (
    <>
      <div className="rl-top">
        <div style={{ minWidth: 0 }}>
          <div className="rl-title">{c.customerName}</div>
          <div className="rl-sub">{c.customerCode}{c.customerType ? ` · ${c.customerType}` : ""}</div>
        </div>
        <CustomerStatusTag isActive={c.isActive} />
      </div>
      <div className="rl-meta">
        <span>GST: {gstSummary(c)}</span>
        {c.phone && <span>{c.phone}</span>}
        {c.email && <span>{c.email}</span>}
      </div>
      {needsGst(c) && <div className="rl-hint">Can&apos;t be quoted yet: no active GST registration</div>}
    </>
  );

  const header = (
    <PageHeader
      eyebrow="RevenueOS · Customers"
      title="Customers"
      subtitle="Who you sell to: their identity, GST registrations and everything quoted, ordered and billed."
      cta={
        <Button variant="primary" icon="plus" onClick={() => setShowForm(true)} disabled={!canCreate} title={canCreate ? undefined : "You don't have permission to create customers."}>
          New Customer
        </Button>
      }
    />
  );

  if (loading && customers.length === 0) {
    return (
      <div className="page">
        {header}
        <div className="skeleton" style={{ height: 44, marginBottom: 14 }} />
        <div className="skeleton" style={{ height: 320 }} />
      </div>
    );
  }

  // A failed fetch must not read as "zero customers".
  if (error && customers.length === 0) {
    const forbidden = (error as { status?: number }).status === 403;
    return (
      <div className="page">
        {header}
        <Panel title="Customers">
          <EmptyState
            icon="alert"
            title={forbidden ? "You don't have access to customers" : "Couldn't load customers"}
            body={forbidden ? "Viewing customers needs the customers.view permission. Ask an administrator to grant it, then sign in again." : error.message || "Something went wrong reaching the RevenueOS backend. Please try again."}
            action={
              !forbidden ? (
                <Button variant="ghost" onClick={refetch}>
                  Retry
                </Button>
              ) : undefined
            }
          />
        </Panel>
      </div>
    );
  }

  return (
    <div className="page">
      {header}

      <div className="cust-toolbar">
        <label className="cust-search">
          <Icon name="search" size={16} />
          <span className="sr-only">Search customers</span>
          <input
            type="search"
            value={term}
            onChange={(e) => {
              setTerm(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name, code, PAN, GSTIN, phone or email"
          />
        </label>
        <ChipGroup>
          <Chip label={`All ${counts.all}`} active={filter === "all"} onClick={() => choose("all")} />
          <Chip label={`Active ${counts.active}`} active={filter === "active"} onClick={() => choose("active")} />
          {counts.inactive > 0 && <Chip label={`Inactive ${counts.inactive}`} active={filter === "inactive"} onClick={() => choose("inactive")} />}
          {counts.needsGst > 0 && <Chip label={`Can't be quoted yet ${counts.needsGst}`} active={filter === "needsGst"} onClick={() => choose("needsGst")} />}
        </ChipGroup>
      </div>

      <Panel title="Customer accounts" flush>
        <ResponsiveList
          rows={rows}
          columns={columns}
          getHref={(c) => `/customers/${c.id}`}
          getLabel={(c) => `Open ${c.customerName}`}
          card={card}
          caption="Customers"
          testId="customer-list"
          emptyIcon="building"
          emptyTitle={customers.length === 0 ? "No customers yet" : "No customers match"}
          emptyBody={customers.length === 0 ? "Create the first customer to start quoting. A customer needs a GST registration before it can be quoted." : "Try a different search or filter."}
          emptyAction={
            customers.length === 0 && canCreate ? (
              <Button variant="primary" icon="plus" onClick={() => setShowForm(true)}>
                New Customer
              </Button>
            ) : undefined
          }
        />
        <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
      </Panel>

      {showForm && (
        <CustomerForm
          onClose={() => setShowForm(false)}
          onSubmit={async (input) => {
            const created = await createCustomer(input);
            router.push(`/customers/${created.id}`);
            return created;
          }}
        />
      )}
    </div>
  );
}
