"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, DesignNote } from "../../components/ui/PageHeader";
import { StatCard, StatRow, Panel } from "../../components/ui/Card";
import { Button, EmptyState } from "../../components/ui/Button";
import { Pagination, paginate } from "../../components/ui/Button";
import { SalesInvoiceStatusTag } from "../../components/ui/Tag";
import { DataTable, Column } from "../../components/ui/DataTable";
import { useSalesInvoices } from "../../lib/hooks/useSalesInvoices";
import { SalesInvoice } from "../../lib/types/domain";
import { formatInr, formatDate } from "../../lib/format";

const PAGE_SIZE = 8;

export default function SalesInvoicesPage() {
  const router = useRouter();
  const { salesInvoices, loading, error, refetch } = useSalesInvoices();
  const [page, setPage] = useState(1);

  const totalValue = salesInvoices.reduce((s, i) => s + i.totalAmount, 0);
  const postedCount = salesInvoices.filter((i) => i.status === "POSTED").length;
  const rows = paginate(salesInvoices, page, PAGE_SIZE);

  const columns: Column<SalesInvoice>[] = [
    { key: "invoiceNumber", header: "Invoice No.", render: (i) => i.invoiceNumber },
    { key: "customerName", header: "Customer", render: (i) => i.customerName },
    { key: "source", header: "From", render: (i) => i.salesOrderCode ?? "—" },
    { key: "dispatchOrderNo", header: "Dispatch", render: (i) => i.dispatchOrderNo ?? "—" },
    { key: "totalAmount", header: "Amount", render: (i) => formatInr(i.totalAmount) },
    { key: "status", header: "Status", render: (i) => <SalesInvoiceStatusTag status={i.status} /> },
    { key: "invoiceDate", header: "Invoice Date", render: (i) => formatDate(i.invoiceDate) },
  ];

  if (loading && salesInvoices.length === 0) {
    return (
      <div className="page">
        <div className="skeleton" style={{ height: 220, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 300 }} />
      </div>
    );
  }

  // A failed fetch must not read as "zero sales invoices" — that's the
  // DataTable's own empty state below, reserved for a genuine zero-result response.
  if (error && salesInvoices.length === 0) {
    return (
      <div className="page">
        <PageHeader
          eyebrow="RevenueOS · Quote to Cash · Sales Invoices"
          title="Sales Invoices"
          subtitle="Raised once a sales order's dispatch is confirmed."
        />
        <Panel title="Sales Invoices">
          <EmptyState
            icon="alert"
            title="Couldn't load sales invoices"
            body={error.message || "Something went wrong reaching the RevenueOS backend. Please try again."}
            action={
              <Button variant="ghost" onClick={refetch}>
                Retry
              </Button>
            }
          />
        </Panel>
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="RevenueOS · Quote to Cash · Sales Invoices"
        title="Sales Invoices"
        subtitle="Raised once a sales order's dispatch is confirmed."
      />

      <StatRow>
        <StatCard label="Sales Invoices" value={String(salesInvoices.length)} note={`${formatInr(totalValue)} total value`} />
        <StatCard label="Posted" value={String(postedCount)} note="accounting effects applied by the backend" />
      </StatRow>

      <div style={{ marginTop: 14 }}>
        <Panel title="All Sales Invoices" flush>
          <DataTable
            columns={columns}
            rows={rows}
            onRowClick={(i) => router.push(`/sales-invoices/${i.id}`)}
            emptyTitle="No sales invoices yet"
            emptyBody="Create one from a Sales Order that's ready to invoice, on its detail page."
          />
          <Pagination page={page} pageSize={PAGE_SIZE} total={salesInvoices.length} onPageChange={setPage} />
        </Panel>
      </div>

      <DesignNote>
        <b>Design note.</b> A Sales Invoice can only be created once the sales order it belongs to has a
        DISPATCHED Dispatch Order (<code>POST /sales-invoices</code>, verified server-side in
        sales-invoices.service.ts) — Quotation/Proforma cannot invoice directly, and this app has no Dispatch
        Order management screens, so the action lives on the Sales Order&apos;s own detail page once a
        dispatched order exists for it. Taxable amount, GST and total are entirely backend-computed (a flat
        18% assumption on the sales order&apos;s total). Invoice No. falls back to a short reference when the
        backend hasn&apos;t assigned a real number (no verified code path in this controller sets one — a
        separate, unrelated FinanceOS module that does isn&apos;t wired into the running backend).
      </DesignNote>
    </div>
  );
}
