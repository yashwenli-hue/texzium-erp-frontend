"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "../../components/ui/PageHeader";
import { Panel } from "../../components/ui/Card";
import { Button, EmptyState, Pagination, paginate } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { Who } from "../../components/ui/Who";
import { FilterChips } from "../../components/ui/FilterChips";
import { Tag } from "../../components/ui/Tag";
import { LoadingRegion } from "../../components/ui/LoadingRegion";
import { ResponsiveList, ResponsiveColumn } from "../../components/ui/ResponsiveList";
import { CustomerCreateFlow } from "../../components/customers/CustomerCreateFlow";
import { GstStateChips, ReadinessPill } from "../../components/customers/CustomerListParts";
import { useCustomers } from "../../lib/hooks/useCustomers";
import { useAuth } from "../../lib/auth/AuthContext";
import { Customer } from "../../lib/types/domain";
import { CUSTOMER_PERMISSIONS } from "../../lib/repository/shared/customerLifecycle";
import {
  CUSTOMER_FILTER_LABEL,
  CUSTOMER_SORT_LABEL,
  CustomerFilter,
  CustomerSortKey,
  DEFAULT_SORT_DIRECTION,
  SortDirection,
  customerFilterCounts,
  matchesFilter,
  searchCustomers,
  sortCustomers,
} from "../../lib/repository/shared/customerList";
import { formatDate } from "../../lib/format";

const PAGE_SIZE = 10;
const SORT_OPTIONS = (Object.keys(CUSTOMER_SORT_LABEL) as CustomerSortKey[]).map((key) => ({ key, label: CUSTOMER_SORT_LABEL[key] }));

export default function CustomersPage() {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const canCreate = hasPermission(CUSTOMER_PERMISSIONS.create);
  const { customers, loading, error, createCustomer, addRegistrationTo, refetch } = useCustomers();
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<CustomerFilter>("all");
  const [term, setTerm] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ key: CustomerSortKey; direction: SortDirection }>({ key: "name", direction: "asc" });

  const counts = useMemo(() => customerFilterCounts(customers), [customers]);

  const rows = useMemo(() => {
    const filtered = searchCustomers(customers, term).filter((c) => matchesFilter(c, filter));
    return sortCustomers(filtered, sort.key, sort.direction);
  }, [customers, term, filter, sort]);
  const pageRows = paginate(rows, page, PAGE_SIZE);

  const choose = (f: CustomerFilter) => {
    setFilter(f);
    setPage(1);
  };

  const onSort = (key: string, direction?: SortDirection) => {
    const k = key as CustomerSortKey;
    setSort((cur) => (direction ? { key: k, direction } : k === cur.key ? { key: k, direction: cur.direction === "asc" ? "desc" : "asc" } : { key: k, direction: DEFAULT_SORT_DIRECTION[k] }));
    setPage(1);
  };

  const columns: ResponsiveColumn<Customer>[] = [
    {
      key: "account",
      header: "Account",
      primary: true,
      sortKey: "name",
      render: (c) => (
        <Who name={c.customerName} sub={`${c.customerCode}${c.customerType ? ` · ${c.customerType}` : ""}${c.linkedVendorId ? " · also a vendor" : ""}`} />
      ),
    },
    { key: "contact", header: "Contact", render: (c) => (c.email || c.phone ? [c.email, c.phone].filter(Boolean).join(" · ") : "—") },
    { key: "gst", header: "GST states", render: (c) => <GstStateChips customer={c} /> },
    { key: "status", header: "Readiness", sortKey: "status", render: (c) => <ReadinessPill customer={c} /> },
    { key: "updated", header: "Updated", sortKey: "updated", render: (c) => formatDate(c.updatedAt) },
  ];

  const card = (c: Customer) => (
    <>
      <div className="rl-top">
        <div style={{ minWidth: 0 }}>
          <div className="rl-title">{c.customerName}</div>
          <div className="rl-sub">
            {c.customerCode}
            {c.customerType ? ` · ${c.customerType}` : ""}
          </div>
        </div>
        <ReadinessPill customer={c} />
      </div>
      <div className="rl-meta">
        <GstStateChips customer={c} />
        {c.linkedVendorId && <Tag color="i">Also a vendor</Tag>}
      </div>
      <div className="rl-meta">
        {c.phone && <span>{c.phone}</span>}
        {c.email && <span>{c.email}</span>}
        <span>Updated {formatDate(c.updatedAt)}</span>
      </div>
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
        <LoadingRegion label="Loading customers">
          <div className="skeleton" style={{ height: 44, marginBottom: 14 }} />
          <div className="skeleton" style={{ height: 320 }} />
        </LoadingRegion>
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
        <FilterChips label="Filter customers" value={filter} onChange={choose} options={counts.map(({ filter: f, count }) => ({ value: f, label: CUSTOMER_FILTER_LABEL[f], count }))} />
      </div>

      <Panel title="Customer accounts" flush>
        <ResponsiveList
          rows={pageRows}
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
          sort={{ key: sort.key, direction: sort.direction, options: SORT_OPTIONS, onChange: onSort }}
        />
        <Pagination page={page} pageSize={PAGE_SIZE} total={rows.length} onPageChange={setPage} />
      </Panel>

      {showForm && (
        <CustomerCreateFlow
          api={{ createCustomer, addRegistration: addRegistrationTo }}
          onClose={() => setShowForm(false)}
          onOpenCustomer={(c) => router.push(`/customers/${c.id}`)}
        />
      )}
    </div>
  );
}
