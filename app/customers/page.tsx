"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, DesignNote } from "../../components/ui/PageHeader";
import { Panel } from "../../components/ui/Card";
import { Button, EmptyState } from "../../components/ui/Button";
import { Who } from "../../components/ui/Who";
import { StatusTag, ChipGroup, Chip, Tag } from "../../components/ui/Tag";
import { DataTable, Column } from "../../components/ui/DataTable";
import { Pagination, paginate } from "../../components/ui/Button";
import { CustomerForm } from "../../components/forms/CustomerForm";
import { useCustomers } from "../../lib/hooks/useCustomers";
import { useRepository } from "../../lib/repository/RepositoryProvider";
import { Customer, CustomerStatus } from "../../lib/types/domain";
import { formatInr, formatDate } from "../../lib/format";

const PAGE_SIZE = 6;
const STATUSES: CustomerStatus[] = ["Active", "At Risk", "New", "Churned"];

export default function CustomersPage() {
  const router = useRouter();
  const repo = useRepository();
  const isReal = repo.kind === "real";
  const { customers: allCustomers, loading, error, createCustomer, refetch } = useCustomers();
  const [showForm, setShowForm] = useState(false);
  const [statusChip, setStatusChip] = useState("All");
  const [page, setPage] = useState(1);

  // Mock-only presentation status (see CustomerStatus in lib/types/domain.ts)
  // — never populated for a real customer, so this filter only applies in
  // mock mode. Real mode filters by the real isActive field instead.
  const statusCounts = useMemo(() => {
    const map: Record<string, number> = {};
    allCustomers.forEach((c) => { if (c.status) map[c.status] = (map[c.status] ?? 0) + 1; });
    return map;
  }, [allCustomers]);
  const activeCount = allCustomers.filter((c) => c.isActive).length;
  const inactiveCount = allCustomers.length - activeCount;

  const filtered = isReal
    ? statusChip === "All"
      ? allCustomers
      : allCustomers.filter((c) => (statusChip === "Active" ? c.isActive : !c.isActive))
    : statusChip === "All"
    ? allCustomers
    : allCustomers.filter((c) => c.status === statusChip);
  const pageRows = paginate(filtered, page, PAGE_SIZE);

  const realColumns: Column<Customer>[] = [
    { key: "customerName", header: "Account", render: (c) => <Who name={c.customerName} sub={c.customerCode} /> },
    { key: "customerType", header: "Type", render: (c) => c.customerType ?? "—" },
    { key: "contact", header: "Contact", render: (c) => `${c.email ?? "—"} · ${c.phone ?? "—"}` },
    { key: "gstRegistrations", header: "GST Registrations", render: (c) => String(c.gstRegistrations.length) },
    { key: "isActive", header: "Status", render: (c) => <Tag color={c.isActive ? "g" : "b"}>{c.isActive ? "Active" : "Inactive"}</Tag> },
    { key: "createdAt", header: "Created", render: (c) => formatDate(c.createdAt) },
  ];

  const mockColumns: Column<Customer>[] = [
    { key: "customerName", header: "Account", render: (c) => <Who name={c.customerName} sub={`${c.industry ?? "—"} · ${c.city ?? "—"}`} /> },
    { key: "ownerName", header: "Owner", render: (c) => c.ownerName ?? "—" },
    { key: "openOrders", header: "Open Orders", render: (c) => String(c.openOrders ?? 0) },
    { key: "lifetimeValue", header: "Lifetime Value", render: (c) => formatInr(c.lifetimeValue ?? 0) },
    { key: "status", header: "Status", render: (c) => (c.status ? <StatusTag status={c.status} /> : "—") },
    { key: "customerSince", header: "Customer Since", render: (c) => (c.customerSince ? formatDate(c.customerSince) : "—") },
  ];

  if (loading && allCustomers.length === 0) {
    return (
      <div className="page">
        <div className="skeleton" style={{ height: 220, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 300 }} />
      </div>
    );
  }

  // A failed fetch must not read as "zero customers" — that's the
  // DataTable's own empty state below, reserved for a genuine zero-result response.
  if (error && allCustomers.length === 0) {
    return (
      <div className="page">
        <PageHeader eyebrow="RevenueOS · Customers" title="Customers" subtitle="Real customer accounts and their GST registrations." />
        <Panel title="Customers">
          <EmptyState
            icon="alert"
            title="Couldn't load customers"
            body={error.message || "Something went wrong reaching the RevenueOS backend. Please try again."}
            action={<Button variant="ghost" onClick={refetch}>Retry</Button>}
          />
        </Panel>
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="RevenueOS · Customers"
        title="Customers"
        subtitle={isReal ? "Real customer accounts and their GST registrations." : "Converted accounts — lifetime value, order history and account health."}
        cta={
          <Button variant="primary" icon="plus" onClick={() => setShowForm(true)} disabled={isReal}>
            New Customer
          </Button>
        }
      />

      {isReal && (
        <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "-8px 0 14px" }}>
          Customer creation is unavailable in connected mode because the current backend endpoint is
          rejecting valid customer payloads. Existing customers can still be viewed and searched.
        </p>
      )}

      <ChipGroup>
        {isReal ? (
          <>
            <Chip label={`All ${allCustomers.length}`} active={statusChip === "All"} onClick={() => { setStatusChip("All"); setPage(1); }} />
            {activeCount > 0 && <Chip label={`Active ${activeCount}`} active={statusChip === "Active"} onClick={() => { setStatusChip("Active"); setPage(1); }} />}
            {inactiveCount > 0 && <Chip label={`Inactive ${inactiveCount}`} active={statusChip === "Inactive"} onClick={() => { setStatusChip("Inactive"); setPage(1); }} />}
          </>
        ) : (
          <>
            <Chip label={`All ${allCustomers.length}`} active={statusChip === "All"} onClick={() => { setStatusChip("All"); setPage(1); }} />
            {STATUSES.filter((s) => statusCounts[s]).map((s) => (
              <Chip key={s} label={`${s} ${statusCounts[s]}`} active={statusChip === s} onClick={() => { setStatusChip(s); setPage(1); }} />
            ))}
          </>
        )}
      </ChipGroup>

      <div style={{ marginTop: 14 }}>
        <Panel title="Customer Accounts" flush>
          <DataTable
            columns={isReal ? realColumns : mockColumns}
            rows={pageRows}
            onRowClick={(c) => router.push(`/customers/${c.id}`)}
            emptyTitle="No customers match this filter"
          />
          <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
        </Panel>
      </div>

      <DesignNote>
        {isReal ? (
          <>
            <b>Design note.</b> Customer, GST registration count and status all come from the VERIFIED{" "}
            <code>GET /customers</code> route (which nests <code>gstRegistrations</code>). There is no
            search/filter/sort query parameter on this endpoint — filtering above happens entirely against
            the already-fetched list, not on the server. The backend has no query for filtering by GST
            registration count, so that column is display-only.
          </>
        ) : (
          <>
            <b>Design note.</b> Customers is where a lead lands after Won. Status uses the same muted tag
            system as everywhere else in RevenueOS — each color always means the same thing (green =
            healthy, amber = at risk, red = churned, blue = new). These four statuses are frontend-only
            presentation labels — the verified Customer master contract has no status field yet (see
            CustomerStatus in lib/types/domain.ts).
          </>
        )}
      </DesignNote>

      {showForm && <CustomerForm onClose={() => setShowForm(false)} onSubmit={createCustomer} />}
    </div>
  );
}
