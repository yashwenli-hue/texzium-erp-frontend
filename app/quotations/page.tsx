"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, DesignNote } from "../../components/ui/PageHeader";
import { StatCard, StatRow, Panel } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { StatusTag, ChipGroup, Chip } from "../../components/ui/Tag";
import { DataTable, Column } from "../../components/ui/DataTable";
import { QuotationForm } from "../../components/forms/QuotationForm";
import { useQuotations } from "../../lib/hooks/useQuotations";
import { Quotation, QUOTATION_STATUSES } from "../../lib/types/domain";
import { formatInr, formatDate } from "../../lib/format";

export default function QuotationsPage() {
  const router = useRouter();
  const { quotations, createQuotation } = useQuotations();
  const [showForm, setShowForm] = useState(false);
  const [statusChip, setStatusChip] = useState<string>("All");

  const totalValue = quotations.reduce((s, q) => s + q.amount, 0);
  const approved = quotations.filter((q) => q.status === "Approved" || q.status === "Converted").length;
  const needsAction = quotations.filter((q) => q.status === "Draft" || q.status === "Revised").length;
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
    { key: "status", header: "Status", render: (q) => <StatusTag status={q.status} /> },
    { key: "validUntil", header: "Valid Until", render: (q) => formatDate(q.validUntil) },
    { key: "ownerName", header: "Owner", render: (q) => q.ownerName },
  ];

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
          <Chip key={s} label={`${s} ${statusCounts[s]}`} active={statusChip === s} onClick={() => setStatusChip(s)} />
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
        <b>Design note.</b> Status uses only the verified backend lifecycle — Draft → Revised →
        Approved → Converted. The V-number badge is a mock/UI-only revision trail (see
        QuotationRevision in lib/types/domain.ts); click any row to open its full detail and history.
      </DesignNote>

      {showForm && <QuotationForm onClose={() => setShowForm(false)} onSubmit={createQuotation} />}
    </div>
  );
}
