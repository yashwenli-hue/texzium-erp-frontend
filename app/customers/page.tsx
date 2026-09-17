"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, DesignNote } from "../../components/ui/PageHeader";
import { Panel } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Who } from "../../components/ui/Who";
import { StatusTag, ChipGroup, Chip } from "../../components/ui/Tag";
import { DataTable, Column } from "../../components/ui/DataTable";
import { Pagination, paginate } from "../../components/ui/Button";
import { CustomerForm } from "../../components/forms/CustomerForm";
import { useCustomers } from "../../lib/hooks/useCustomers";
import { Customer, CustomerStatus } from "../../lib/types/domain";
import { formatInr, formatDate } from "../../lib/format";

const PAGE_SIZE = 6;
const STATUSES: CustomerStatus[] = ["Active", "At Risk", "New", "Churned"];

export default function CustomersPage() {
  const router = useRouter();
  const { customers: allCustomers, createCustomer } = useCustomers();
  const [showForm, setShowForm] = useState(false);
  const [statusChip, setStatusChip] = useState("All");
  const [page, setPage] = useState(1);

  const statusCounts = useMemo(() => {
    const map: Record<string, number> = {};
    allCustomers.forEach((c) => (map[c.status] = (map[c.status] ?? 0) + 1));
    return map;
  }, [allCustomers]);

  const filtered = statusChip === "All" ? allCustomers : allCustomers.filter((c) => c.status === statusChip);
  const pageRows = paginate(filtered, page, PAGE_SIZE);

  const columns: Column<Customer>[] = [
    { key: "name", header: "Account", render: (c) => <Who name={c.name} sub={`${c.industry} · ${c.city}`} /> },
    { key: "ownerName", header: "Owner", render: (c) => c.ownerName },
    { key: "openOrders", header: "Open Orders", render: (c) => String(c.openOrders) },
    { key: "lifetimeValue", header: "Lifetime Value", render: (c) => formatInr(c.lifetimeValue) },
    { key: "status", header: "Status", render: (c) => <StatusTag status={c.status} /> },
    { key: "customerSince", header: "Customer Since", render: (c) => formatDate(c.customerSince) },
  ];

  return (
    <div className="page">
      <PageHeader
        eyebrow="RevenueOS · Customers"
        title="Customers"
        subtitle="Converted accounts — lifetime value, order history and account health."
        cta={
          <Button variant="primary" icon="plus" onClick={() => setShowForm(true)}>
            New Customer
          </Button>
        }
      />

      <ChipGroup>
        <Chip label={`All ${allCustomers.length}`} active={statusChip === "All"} onClick={() => { setStatusChip("All"); setPage(1); }} />
        {STATUSES.filter((s) => statusCounts[s]).map((s) => (
          <Chip key={s} label={`${s} ${statusCounts[s]}`} active={statusChip === s} onClick={() => { setStatusChip(s); setPage(1); }} />
        ))}
      </ChipGroup>

      <div style={{ marginTop: 14 }}>
        <Panel title="Customer Accounts" flush>
          <DataTable
            columns={columns}
            rows={pageRows}
            onRowClick={(c) => router.push(`/customers/${c.id}`)}
            emptyTitle="No customers match this filter"
          />
          <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
        </Panel>
      </div>

      <DesignNote>
        <b>Design note.</b> Customers is where a lead lands after Won. Status uses the same muted tag
        system as everywhere else in RevenueOS — green/amber/red always means the same thing.
      </DesignNote>

      {showForm && <CustomerForm onClose={() => setShowForm(false)} onSubmit={createCustomer} />}
    </div>
  );
}
