"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, DesignNote } from "../../components/ui/PageHeader";
import { StatCard, StatRow, Panel } from "../../components/ui/Card";
import { Button, EmptyState } from "../../components/ui/Button";
import { Pagination, paginate } from "../../components/ui/Button";
import { SalesOrderStatusTag, ChipGroup, Chip } from "../../components/ui/Tag";
import { DataTable, Column } from "../../components/ui/DataTable";
import { useSalesOrders } from "../../lib/hooks/useSalesOrders";
import { SalesOrder, formatSalesOrderStatus } from "../../lib/types/domain";
import { formatInr, formatDate } from "../../lib/format";
import { isLiveSalesOrder } from "../../lib/repository/shared/salesOrderLifecycle";

const PAGE_SIZE = 8;

export default function SalesOrdersPage() {
  const router = useRouter();
  const { salesOrders, loading, error, refetch } = useSalesOrders();
  const [statusChip, setStatusChip] = useState<string>("All");
  const [page, setPage] = useState(1);

  // A cancelled order is no longer part of the pipeline: it is left out of the count and the value, and
  // shown on its own (it still has its own chip and row below, with its history).
  const liveOrders = salesOrders.filter((o) => isLiveSalesOrder(o.status));
  const cancelledCount = salesOrders.length - liveOrders.length;
  const totalValue = liveOrders.reduce((s, o) => s + o.totalAmount, 0);
  const openCount = salesOrders.filter((o) => o.status === "OPEN").length;
  const pendingStoreCount = salesOrders.filter((o) => o.status === "PENDING_STORE_APPROVAL").length;

  // SalesOrder.status is a plain open-ended backend string, not a closed
  // enum (see formatSalesOrderStatus in lib/types/domain.ts) — other values
  // besides OPEN/PENDING_STORE_APPROVAL are written by unrelated
  // OperationsOS/AdminOS modules, so chip options are derived from whatever
  // statuses are actually present rather than a fixed, possibly-incomplete list.
  const statusCounts = useMemo(() => {
    const map: Record<string, number> = {};
    salesOrders.forEach((o) => (map[o.status] = (map[o.status] ?? 0) + 1));
    return map;
  }, [salesOrders]);
  const statusOptions = useMemo(() => Object.keys(statusCounts).sort(), [statusCounts]);

  const filtered = statusChip === "All" ? salesOrders : salesOrders.filter((o) => o.status === statusChip);
  const rows = paginate(filtered, page, PAGE_SIZE);

  const columns: Column<SalesOrder>[] = [
    { key: "salesOrderCode", header: "Order No.", render: (o) => o.salesOrderCode },
    { key: "customerName", header: "Customer", render: (o) => o.customerName },
    { key: "source", header: "From", render: (o) => o.proformaNumber ?? o.quoteNo ?? "—" },
    { key: "totalAmount", header: "Amount", render: (o) => formatInr(o.totalAmount) },
    { key: "status", header: "Status", render: (o) => <SalesOrderStatusTag status={o.status} /> },
    { key: "orderDate", header: "Order Date", render: (o) => formatDate(o.orderDate) },
    { key: "ownerName", header: "Owner", render: (o) => o.ownerName },
  ];

  if (loading && salesOrders.length === 0) {
    return (
      <div className="page">
        <div className="skeleton" style={{ height: 220, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 300 }} />
      </div>
    );
  }

  // A failed fetch must not read as "zero sales orders" — that's the
  // DataTable's own empty state below, reserved for a genuine zero-result response.
  if (error && salesOrders.length === 0) {
    return (
      <div className="page">
        <PageHeader
          eyebrow="RevenueOS · Quote to Cash · Sales Orders"
          title="Sales Orders"
          subtitle="Created from an approved Quotation or Proforma Invoice."
        />
        <Panel title="Sales Orders">
          <EmptyState
            icon="alert"
            title="Couldn't load sales orders"
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
        eyebrow="RevenueOS · Quote to Cash · Sales Orders"
        title="Sales Orders"
        subtitle="Created from an approved Quotation or Proforma Invoice."
      />

      <StatRow>
        <StatCard
          label="Sales Orders"
          value={String(liveOrders.length)}
          note={`${formatInr(totalValue)} total value${cancelledCount > 0 ? ` · ${cancelledCount} cancelled not counted` : ""}`}
        />
        <StatCard label="Open" value={String(openCount)} note="from Quotation conversion" />
        <StatCard label="Pending Store Approval" value={String(pendingStoreCount)} note="from a Proforma Invoice" />
      </StatRow>

      <ChipGroup>
        <Chip label={`All ${salesOrders.length}`} active={statusChip === "All"} onClick={() => { setStatusChip("All"); setPage(1); }} />
        {statusOptions.map((s) => (
          <Chip key={s} label={`${formatSalesOrderStatus(s)} ${statusCounts[s]}`} active={statusChip === s} onClick={() => { setStatusChip(s); setPage(1); }} />
        ))}
      </ChipGroup>

      <div style={{ marginTop: 14 }}>
        <Panel title="All Sales Orders" flush>
          <DataTable
            columns={columns}
            rows={rows}
            onRowClick={(o) => router.push(`/sales-orders/${o.id}`)}
            emptyTitle="No sales orders match this filter"
            emptyBody="Convert an approved Quotation, or create one from an approved Proforma Invoice."
          />
          <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
        </Panel>
      </div>

      <DesignNote>
        <b>Design note.</b> A Sales Order is created one of two independent, verified ways: converting an
        approved Quotation (<code>POST /quotations/:id/convert</code>), or directly from an approved Proforma
        Invoice (<code>POST /sales-orders</code>) — the backend never links these two paths together. Orders
        created from a Proforma enter the commercial workflow on their detail page: verifying an advance receipt
        moves them to Pending Accounts Approval, and Accounts approval makes them Ready For Dispatch Order, with
        who did each step recorded in the order&apos;s lifecycle history. Orders created by converting a Quotation
        (status Open) do not enter that workflow. Order No.
        falls back to a short reference when the backend hasn&apos;t assigned a real code (no verified code path
        in this controller sets one).
      </DesignNote>
    </div>
  );
}
