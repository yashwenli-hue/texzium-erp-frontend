"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatCard, StatRow, Panel } from "../../components/ui/Card";
import { Button, EmptyState } from "../../components/ui/Button";
import { Pagination, paginate } from "../../components/ui/Button";
import { ProformaInvoiceStatusTag, ChipGroup, Chip } from "../../components/ui/Tag";
import { ResponsiveList, ResponsiveColumn, ListCard } from "../../components/ui/ResponsiveList";
import { ListSearch } from "../../components/ui/ListSearch";
import { LoadingRegion } from "../../components/ui/LoadingRegion";
import { matchesText } from "../../lib/ui/listSearch";
import { NextStepCell } from "../../components/ui/NextStepCell";
import { useProformaPipeline } from "../../lib/hooks/useProformaInvoices";
import { proformaNextStep } from "../../lib/repository/shared/commercialChain";
import { validityLabel } from "../../lib/repository/shared/proformaLifecycle";
import { isLiveSalesOrder } from "../../lib/repository/shared/salesOrderLifecycle";
import { ProformaInvoice, PROFORMA_INVOICE_STATUSES, formatProformaInvoiceStatus } from "../../lib/types/domain";
import { formatDate, formatInr, formatInrExact } from "../../lib/format";

const PAGE_SIZE = 8;
const EXPIRED_CHIP = "Expired";

export default function ProformaInvoicesPage() {
  const { proformaInvoices, orders, ordersKnown, loading, error, refetch } = useProformaPipeline();
  const [statusChip, setStatusChip] = useState<string>("All");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const liveOrdersOf = (p: ProformaInvoice) => orders.filter((o) => o.proformaInvoiceId === p.id && isLiveSalesOrder(o.status));
  const isExpiredNow = (p: ProformaInvoice) => p.status !== "CANCELLED" && p.isExpired;
  const active = proformaInvoices.filter((p) => p.status !== "CANCELLED");
  const activeValue = active.reduce((s, p) => s + p.totalAmount, 0);
  const awaiting = proformaInvoices.filter((p) => p.status === "PENDING" && !p.isExpired).length;
  const ready = proformaInvoices.filter((p) => p.status === "APPROVED" && !p.isExpired && liveOrdersOf(p).length === 0).length;
  const expired = proformaInvoices.filter(isExpiredNow).length;

  const statusCounts = useMemo(() => {
    const map: Record<string, number> = {};
    proformaInvoices.forEach((p) => (map[p.status] = (map[p.status] ?? 0) + 1));
    return map;
  }, [proformaInvoices]);

  const byStatus = statusChip === "All" ? proformaInvoices : statusChip === EXPIRED_CHIP ? proformaInvoices.filter(isExpiredNow) : proformaInvoices.filter((p) => p.status === statusChip);
  const filtered = search.trim() ? byStatus.filter((p) => matchesText([p.proformaNumber, p.customerName, p.quoteNo], search)) : byStatus;
  const rows = paginate(filtered, page, PAGE_SIZE);

  const columns: ResponsiveColumn<ProformaInvoice>[] = [
    { key: "proformaNumber", header: "Proforma No.", render: (p) => p.proformaNumber },
    { key: "customerName", header: "Customer", render: (p) => p.customerName },
    { key: "quoteNo", header: "Quotation", render: (p) => p.quoteNo },
    { key: "totalAmount", header: "Amount", render: (p) => formatInrExact(p.totalAmount) },
    { key: "status", header: "Status", render: (p) => <ProformaInvoiceStatusTag status={p.status} expired={p.isExpired} /> },
    { key: "validityDate", header: "Valid through", render: (p) => (p.validityDate ? <span>{formatDate(p.validityDate)}{p.status !== "CANCELLED" && <small style={{ display: "block", color: "var(--muted)", fontSize: 11.5 }}>{validityLabel(p.validityDate).text}</small>}</span> : "No expiry") },
    { key: "next", header: "Next step", render: (p) => <NextStepCell step={proformaNextStep(p, liveOrdersOf(p))} /> },
  ];

  if (loading && proformaInvoices.length === 0) {
    return (
      <div className="page">
        <LoadingRegion label="Loading proforma invoices">
          <div className="skeleton" style={{ height: 220, marginBottom: 16 }} />
          <div className="skeleton" style={{ height: 300 }} />
        </LoadingRegion>
      </div>
    );
  }

  // A failed fetch must not read as "zero proforma invoices" — that's the
  // DataTable's own empty state below, reserved for a genuine zero-result response.
  if (error && proformaInvoices.length === 0) {
    const forbidden = (error as { status?: number }).status === 403;
    return (
      <div className="page">
        <PageHeader
          eyebrow="RevenueOS · Quote to Cash · Proforma Invoices"
          title="Proforma Invoices"
          subtitle="Created from approved quotations, ahead of a Sales Order."
        />
        <Panel title="Proforma Invoices">
          <EmptyState
            icon="alert"
            title={forbidden ? "You don't have access to Proforma Invoices" : "Couldn't load proforma invoices"}
            body={forbidden ? "Viewing Proforma Invoices needs the proformas.view permission. Ask an administrator to grant it, then sign in again." : error.message || "Something went wrong reaching the RevenueOS backend. Please try again."}
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
        subtitle="Created from approved quotations, ahead of a Sales Order."
      />

      <StatRow>
        <StatCard label="Active Proformas" value={String(active.length)} note={`${formatInr(activeValue)} total value, cancelled excluded`} />
        <StatCard label="Awaiting approval" value={String(awaiting)} note="pending and still valid" />
        <StatCard label="Ready for Sales Order" value={ordersKnown ? String(ready) : "—"} note={ordersKnown ? "approved, valid, no order yet" : "needs Sales Order access"} />
        <StatCard label="Expired" value={String(expired)} note="can't be approved or ordered" />
      </StatRow>

      <div className="list-toolbar">
        <ListSearch value={search} onChange={(t) => { setSearch(t); setPage(1); }} label="Search proforma invoices" placeholder="Search proforma no., customer, quotation…" />
        <p className="list-status" role="status">{search.trim() ? `${filtered.length} of ${byStatus.length}` : ""}</p>
      </div>
      <ChipGroup>
        <Chip label={`All ${proformaInvoices.length}`} active={statusChip === "All"} onClick={() => { setStatusChip("All"); setPage(1); }} />
        {PROFORMA_INVOICE_STATUSES.filter((s) => statusCounts[s]).map((s) => (
          <Chip key={s} label={`${formatProformaInvoiceStatus(s)} ${statusCounts[s]}`} active={statusChip === s} onClick={() => { setStatusChip(s); setPage(1); }} />
        ))}
        {expired > 0 && <Chip label={`${EXPIRED_CHIP} ${expired}`} active={statusChip === EXPIRED_CHIP} onClick={() => { setStatusChip(EXPIRED_CHIP); setPage(1); }} />}
      </ChipGroup>

      <div style={{ marginTop: 14 }}>
        <Panel title="All Proforma Invoices" flush>
          <ResponsiveList
            rows={rows}
            columns={columns}
            getHref={(p) => `/proforma-invoices/${p.id}`}
            getLabel={(p) => `Open proforma invoice ${p.proformaNumber}, ${p.customerName}`}
            card={(p) => <ListCard title={p.proformaNumber} sub={`${p.customerName} · ${p.quoteNo}`} status={<ProformaInvoiceStatusTag status={p.status} expired={p.isExpired} />} amount={formatInrExact(p.totalAmount)} meta={[p.validityDate ? `Valid through ${formatDate(p.validityDate)}` : "No expiry", <NextStepCell key="n" step={proformaNextStep(p, liveOrdersOf(p))} />]} />}
            caption="Proforma invoices"
            emptyTitle={search.trim() ? "Nothing matches this search" : proformaInvoices.length === 0 ? "No proforma invoices yet" : "No proforma invoices match this filter"}
            emptyBody={search.trim() ? "Try another name or number, or clear the search." : "A Proforma Invoice is created from an approved quotation's detail page."}
          />
          <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
        </Panel>
      </div>
    </div>
  );
}
