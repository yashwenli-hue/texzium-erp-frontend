"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, DesignNote } from "../../components/ui/PageHeader";
import { StatCard, StatRow, Panel } from "../../components/ui/Card";
import { Button, EmptyState } from "../../components/ui/Button";
import { Pagination, paginate } from "../../components/ui/Button";
import { ProformaInvoiceStatusTag, ChipGroup, Chip } from "../../components/ui/Tag";
import { DataTable, Column } from "../../components/ui/DataTable";
import { useProformaInvoices } from "../../lib/hooks/useProformaInvoices";
import { ProformaInvoice, PROFORMA_INVOICE_STATUSES, formatProformaInvoiceStatus } from "../../lib/types/domain";
import { formatInr, formatDate } from "../../lib/format";

const PAGE_SIZE = 8;

export default function ProformaInvoicesPage() {
  const router = useRouter();
  const { proformaInvoices, loading, error, refetch } = useProformaInvoices();
  const [statusChip, setStatusChip] = useState<string>("All");
  const [page, setPage] = useState(1);

  const totalValue = proformaInvoices.reduce((s, p) => s + p.totalAmount, 0);
  const approvedCount = proformaInvoices.filter((p) => p.status === "APPROVED").length;
  const pendingCount = proformaInvoices.filter((p) => p.status === "PENDING").length;

  const statusCounts = useMemo(() => {
    const map: Record<string, number> = {};
    proformaInvoices.forEach((p) => (map[p.status] = (map[p.status] ?? 0) + 1));
    return map;
  }, [proformaInvoices]);

  const filtered = statusChip === "All" ? proformaInvoices : proformaInvoices.filter((p) => p.status === statusChip);
  const rows = paginate(filtered, page, PAGE_SIZE);

  const columns: Column<ProformaInvoice>[] = [
    { key: "proformaNumber", header: "Proforma No.", render: (p) => p.proformaNumber },
    { key: "customerName", header: "Customer", render: (p) => p.customerName },
    { key: "quoteNo", header: "Quotation", render: (p) => p.quoteNo },
    { key: "totalAmount", header: "Amount", render: (p) => formatInr(p.totalAmount) },
    { key: "status", header: "Status", render: (p) => <ProformaInvoiceStatusTag status={p.status} /> },
    { key: "issueDate", header: "Issue Date", render: (p) => formatDate(p.issueDate) },
    { key: "ownerName", header: "Owner", render: (p) => p.ownerName },
  ];

  if (loading && proformaInvoices.length === 0) {
    return (
      <div className="page">
        <div className="skeleton" style={{ height: 220, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 300 }} />
      </div>
    );
  }

  // A failed fetch must not read as "zero proforma invoices" — that's the
  // DataTable's own empty state below, reserved for a genuine zero-result response.
  if (error && proformaInvoices.length === 0) {
    return (
      <div className="page">
        <PageHeader
          eyebrow="RevenueOS · Quote to Cash · Proforma Invoices"
          title="Proforma Invoices"
          subtitle="Generated from approved quotations, ahead of a sales order."
        />
        <Panel title="Proforma Invoices">
          <EmptyState
            icon="alert"
            title="Couldn't load proforma invoices"
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
        eyebrow="RevenueOS · Quote to Cash · Proforma Invoices"
        title="Proforma Invoices"
        subtitle="Generated from approved quotations, ahead of a sales order."
      />

      <StatRow>
        <StatCard label="Proforma Invoices" value={String(proformaInvoices.length)} note={`${formatInr(totalValue)} total value`} />
        <StatCard label="Approved" value={String(approvedCount)} note="ready for the next stage" />
        <StatCard label="Pending" value={String(pendingCount)} note="awaiting approval" />
      </StatRow>

      <ChipGroup>
        <Chip label={`All ${proformaInvoices.length}`} active={statusChip === "All"} onClick={() => { setStatusChip("All"); setPage(1); }} />
        {PROFORMA_INVOICE_STATUSES.filter((s) => statusCounts[s]).map((s) => (
          <Chip key={s} label={`${formatProformaInvoiceStatus(s)} ${statusCounts[s]}`} active={statusChip === s} onClick={() => { setStatusChip(s); setPage(1); }} />
        ))}
      </ChipGroup>

      <div style={{ marginTop: 14 }}>
        <Panel title="All Proforma Invoices" flush>
          <DataTable
            columns={columns}
            rows={rows}
            onRowClick={(p) => router.push(`/proforma-invoices/${p.id}`)}
            emptyTitle="No proforma invoices match this filter"
            emptyBody="Create one from an approved Quotation's detail page."
          />
          <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
        </Panel>
      </div>

      <DesignNote>
        <b>Design note.</b> Status uses only the verified backend lifecycle — Pending (created) and
        Approved (via the Approve action). No other status exists. Proforma No. falls back to a short
        reference when the backend hasn&apos;t assigned a real number (no verified code path sets one yet).
        Create a Proforma Invoice from an approved Quotation&apos;s detail page.
      </DesignNote>
    </div>
  );
}
