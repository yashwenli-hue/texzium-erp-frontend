"use client";

import { useState } from "react";
import { PageHeader, DesignNote } from "../../components/ui/PageHeader";
import { StatCard, StatRow, Panel } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { StatusTag } from "../../components/ui/Tag";
import { DataTable, Column } from "../../components/ui/DataTable";
import { QuotationForm } from "../../components/forms/QuotationForm";
import { useQuotations } from "../../lib/hooks/useQuotations";
import { Quotation } from "../../lib/types/domain";
import { formatInr, formatDate } from "../../lib/format";

export default function QuotationsPage() {
  const { quotations, createQuotation } = useQuotations();
  const [showForm, setShowForm] = useState(false);

  const totalValue = quotations.reduce((s, q) => s + q.amount, 0);
  const accepted = quotations.filter((q) => q.status === "Accepted").length;
  const decided = quotations.filter((q) => ["Accepted", "Rejected", "Expired"].includes(q.status)).length;
  const acceptanceRate = decided ? Math.round((accepted / decided) * 100) : 0;
  const expiringSoon = quotations.filter((q) => {
    if (!q.validUntil) return false;
    const days = (new Date(q.validUntil).getTime() - Date.now()) / 86_400_000;
    return days > 0 && days <= 7;
  }).length;

  const columns: Column<Quotation>[] = [
    { key: "quoteNo", header: "Quote No.", render: (q) => q.quoteNo },
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
        eyebrow="RevenueOS · Quotations"
        title="Quotations"
        subtitle="Every quote sent, its status, and how close it is to becoming revenue."
        cta={
          <Button variant="primary" icon="plus" onClick={() => setShowForm(true)}>
            New Quotation
          </Button>
        }
      />

      <StatRow>
        <StatCard label="Quotations" value={String(quotations.length)} note={`${formatInr(totalValue)} total value`} />
        <StatCard label="Acceptance Rate" value={`${acceptanceRate}%`} note="of decided quotes" />
        <StatCard label="Accepted" value={String(accepted)} note="quotations" />
        <StatCard label="Expiring Soon" value={String(expiringSoon)} note="within 7 days" />
      </StatRow>

      <div style={{ marginTop: 16 }}>
        <Panel title="All Quotations" flush>
          <DataTable columns={columns} rows={quotations} emptyTitle="No quotations yet" />
        </Panel>
      </div>

      <DesignNote>
        <b>Design note.</b> Status tags carry the whole story — Draft → Sent → Viewed →
        Accepted/Rejected/Expired — so a sales head can scan the table and know exactly where every
        quote stands without opening one.
      </DesignNote>

      {showForm && <QuotationForm onClose={() => setShowForm(false)} onSubmit={createQuotation} />}
    </div>
  );
}
