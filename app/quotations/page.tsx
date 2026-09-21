"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, DesignNote } from "../../components/ui/PageHeader";
import { StatCard, StatRow, Panel } from "../../components/ui/Card";
import { Button, EmptyState } from "../../components/ui/Button";
import { QuotationStatusTag, ChipGroup, Chip } from "../../components/ui/Tag";
import { DataTable, Column } from "../../components/ui/DataTable";
import { QuotationForm } from "../../components/forms/QuotationForm";
import { useQuotations } from "../../lib/hooks/useQuotations";
import { Quotation, QUOTATION_STATUSES, formatQuotationStatus } from "../../lib/types/domain";
import { formatInr, formatDate } from "../../lib/format";

export default function QuotationsPage() {
  const router = useRouter();
  const { quotations, loading, error, createQuotation, refetch } = useQuotations();
  const [showForm, setShowForm] = useState(false);
  const [statusChip, setStatusChip] = useState<string>("All");

  const totalValue = quotations.reduce((s, q) => s + q.amount, 0);
  const approved = quotations.filter((q) => q.status === "APPROVED" || q.status === "CONVERTED").length;
  const needsAction = quotations.filter((q) => q.status === "DRAFT" || q.status === "REVISED").length;
  const expiringSoon = quotations.filter((q) => {
    if (!q.validUntil) return false;
    const days = (new Date(q.validUntil).getTime() - Date.now()) / 86_400_000;
    return days > 0 && days <= 7;
  }).length;

  const statusCounts = useMemo(() => {
    const map: Record<string, number> = {};
    quotations.forEach((q) => (map[q.status] = (map[q.status] ?? 0) + 1));
    return map;
  }, [quotations]);

  const rows = statusChip === "All" ? quotations : quotations.filter((q) => q.status === statusChip);

  const columns: Column<Quotation>[] = [
    { key: "quoteNo", header: "Quote No.", render: (q) => (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
        {q.quoteNo}
        <span className="version-badge">V{q.version}</span>
      </span>
    ) },
    { key: "customerName", header: "Customer", render: (q) => q.customerName },
    { key: "opportunityName", header: "Opportunity", render: (q) => q.opportunityName },
    { key: "amount", header: "Amount", render: (q) => formatInr(q.amount) },
    { key: "status", header: "Status", render: (q) => <QuotationStatusTag status={q.status} /> },
    { key: "validUntil", header: "Valid Until", render: (q) => formatDate(q.validUntil) },
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
    return (
      <div className="page">
        <PageHeader
          eyebrow="RevenueOS · Quote to Cash · Quotations"
          title="Quotations"
          subtitle="Every quote raised, its version, and how close it is to becoming revenue."
        />
        <Panel title="All Quotations">
          <EmptyState
            icon="alert"
            title="Couldn't load quotations"
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
        eyebrow="RevenueOS · Quote to Cash · Quotations"
        title="Quotations"
        subtitle="Every quote raised, its version, and how close it is to becoming revenue."
        cta={
          <Button variant="primary" icon="plus" onClick={() => setShowForm(true)}>
            New Quotation
          </Button>
        }
      />

      <StatRow>
        <StatCard label="Quotations" value={String(quotations.length)} note={`${formatInr(totalValue)} total value`} />
        <StatCard label="Approved" value={String(approved)} note="approved or converted" />
        <StatCard label="Needs Action" value={String(needsAction)} note="draft or revised" />
        <StatCard label="Expiring Soon" value={String(expiringSoon)} note="within 7 days" />
      </StatRow>

      <ChipGroup>
        <Chip label={`All ${quotations.length}`} active={statusChip === "All"} onClick={() => setStatusChip("All")} />
        {QUOTATION_STATUSES.filter((s) => statusCounts[s]).map((s) => (
          <Chip key={s} label={`${formatQuotationStatus(s)} ${statusCounts[s]}`} active={statusChip === s} onClick={() => setStatusChip(s)} />
        ))}
      </ChipGroup>

      <div style={{ marginTop: 14 }}>
        <Panel title="All Quotations" flush>
          <DataTable
            columns={columns}
            rows={rows}
            onRowClick={(q) => router.push(`/quotations/${q.id}`)}
            emptyTitle="No quotations match this filter"
          />
        </Panel>
      </div>

      <DesignNote>
        <b>Design note.</b> Status uses only the verified backend lifecycle — Draft, Revised and
        Approved are set by the corresponding backend action; Converted is part of the documented
        workflow terminology but no backend code path ever writes it onto a quotation (converting
        creates a Sales Order instead — see the quotation&apos;s own detail page). The V-number badge is a
        mock/UI-only revision trail (see QuotationRevision in lib/types/domain.ts); click any row to
        open its full detail.
      </DesignNote>

      {showForm && <QuotationForm onClose={() => setShowForm(false)} onSubmit={createQuotation} />}
    </div>
  );
}
