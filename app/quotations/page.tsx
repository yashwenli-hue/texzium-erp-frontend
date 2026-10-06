"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatCard, StatRow, Panel } from "../../components/ui/Card";
import { Button, EmptyState } from "../../components/ui/Button";
import { QuotationStatusTag, ChipGroup, Chip, Tag } from "../../components/ui/Tag";
import { DataTable, Column } from "../../components/ui/DataTable";
import { Pagination, paginate } from "../../components/ui/Button";
import { NextStepCell } from "../../components/ui/NextStepCell";
import { QuotationForm } from "../../components/forms/QuotationForm";
import { useQuotationPipeline } from "../../lib/hooks/useQuotations";
import { useAuth } from "../../lib/auth/AuthContext";
import { buildCommercialChain, quotationNextStep } from "../../lib/repository/shared/commercialChain";
import { QUOTATION_PERMISSIONS, isLegacyTaxBreakdown } from "../../lib/repository/shared/quotationLifecycle";
import { Quotation, QUOTATION_STATUSES, formatQuotationStatus } from "../../lib/types/domain";
import { formatInr, formatInrExact } from "../../lib/format";

const PAGE_SIZE = 8;

export default function QuotationsPage() {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const { quotations, proformas, orders, downstreamKnown, loading, error, createQuotation, refetch } = useQuotationPipeline();
  const [showForm, setShowForm] = useState(false);
  const [statusChip, setStatusChip] = useState<string>("All");
  const [page, setPage] = useState(1);
  const mayCreate = hasPermission(QUOTATION_PERMISSIONS.create);

  const chains = useMemo(() => new Map(quotations.map((q) => [q.id, buildCommercialChain(q.id, proformas, orders)])), [quotations, proformas, orders]);
  const open = quotations.filter((q) => q.status !== "REJECTED");
  const openValue = open.reduce((s, q) => s + q.amount, 0);
  const needsApproval = quotations.filter((q) => q.status === "DRAFT" || q.status === "REVISED").length;
  const approved = quotations.filter((q) => q.status === "APPROVED");
  const awaitingProforma = approved.filter((q) => { const c = chains.get(q.id); return c && !c.activeProforma && c.liveOrders.length === 0; }).length;
  const inProgress = approved.filter((q) => { const c = chains.get(q.id); return c && (c.activeProforma || c.liveOrders.length > 0); }).length;

  const statusCounts = useMemo(() => {
    const map: Record<string, number> = {};
    quotations.forEach((q) => (map[q.status] = (map[q.status] ?? 0) + 1));
    return map;
  }, [quotations]);

  const filtered = statusChip === "All" ? quotations : quotations.filter((q) => q.status === statusChip);
  const rows = paginate(filtered, page, PAGE_SIZE);

  const columns: Column<Quotation>[] = [
    { key: "quoteNo", header: "Quote No.", render: (q) => (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
        {q.quoteNo}
        {isLegacyTaxBreakdown(q) && <span title="Its taxable amount and GST were never recorded"><Tag color="w">Legacy</Tag></span>}
      </span>
    ) },
    { key: "customerName", header: "Customer", render: (q) => q.customerName },
    { key: "opportunityName", header: "Opportunity", render: (q) => q.opportunityName },
    { key: "amount", header: "Total", render: (q) => formatInrExact(q.amount) },
    { key: "status", header: "Status", render: (q) => <QuotationStatusTag status={q.status} /> },
    { key: "next", header: "Next step", render: (q) => <NextStepCell step={quotationNextStep(q, chains.get(q.id) ?? buildCommercialChain(q.id, [], []))} /> },
    { key: "ownerName", header: "Owner", render: (q) => q.ownerName },
  ];

  if (loading && quotations.length === 0) {
    return (
      <div className="page">
        <div className="skeleton" style={{ height: 220, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 300 }} />
      </div>
    );
  }

  // A failed fetch must not read as "zero quotations" — that's the
  // DataTable's own empty state below, reserved for a genuine zero-result response.
  if (error && quotations.length === 0) {
    const forbidden = (error as { status?: number }).status === 403;
    return (
      <div className="page">
        <PageHeader
          eyebrow="RevenueOS · Quote to Cash · Quotations"
          title="Quotations"
          subtitle="Every quote raised, where it stands, and what happens next."
        />
        <Panel title="All Quotations">
          <EmptyState
            icon="alert"
            title={forbidden ? "You don't have access to quotations" : "Couldn't load quotations"}
            body={forbidden ? "Viewing quotations needs the quotations.view permission. Ask an administrator to grant it, then sign in again." : error.message || "Something went wrong reaching the RevenueOS backend. Please try again."}
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
        eyebrow="RevenueOS · Quote to Cash · Quotations"
        title="Quotations"
        subtitle="Every quote raised, where it stands, and what happens next."
        cta={
          <Button
            variant="primary"
            icon="plus"
            onClick={() => setShowForm(true)}
            disabled={!mayCreate}
            title={mayCreate ? undefined : "You don't have permission to create quotations."}
          >
            New Quotation
          </Button>
        }
      />

      <StatRow>
        <StatCard label="Open pipeline" value={formatInr(openValue)} note={`${open.length} quotation${open.length === 1 ? "" : "s"}, rejected excluded`} />
        <StatCard label="Needs approval" value={String(needsApproval)} note="draft or revised" />
        <StatCard label="Awaiting Proforma" value={downstreamKnown ? String(awaitingProforma) : "—"} note={downstreamKnown ? "approved, nothing built yet" : "needs Proforma and Sales Order access"} />
        <StatCard label="In progress" value={downstreamKnown ? String(inProgress) : "—"} note={downstreamKnown ? "Proforma or Sales Order under way" : "needs Proforma and Sales Order access"} />
      </StatRow>

      <ChipGroup>
        <Chip label={`All ${quotations.length}`} active={statusChip === "All"} onClick={() => { setStatusChip("All"); setPage(1); }} />
        {QUOTATION_STATUSES.filter((s) => statusCounts[s]).map((s) => (
          <Chip key={s} label={`${formatQuotationStatus(s)} ${statusCounts[s]}`} active={statusChip === s} onClick={() => { setStatusChip(s); setPage(1); }} />
        ))}
      </ChipGroup>

      <div style={{ marginTop: 14 }}>
        <Panel title="All Quotations" flush>
          <DataTable
            columns={columns}
            rows={rows}
            onRowClick={(q) => router.push(`/quotations/${q.id}`)}
            emptyTitle={quotations.length === 0 ? "No quotations yet" : "No quotations match this filter"}
            emptyBody={quotations.length === 0 ? (mayCreate ? "Create one from an opportunity to start the quote-to-cash flow." : undefined) : undefined}
          />
          <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
        </Panel>
      </div>

      {showForm && <QuotationForm onClose={() => setShowForm(false)} onSubmit={createQuotation} />}
    </div>
  );
}
