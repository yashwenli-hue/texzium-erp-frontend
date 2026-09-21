"use client";

import { useRouter } from "next/navigation";
import { PageHeader, DesignNote } from "../../components/ui/PageHeader";
import { StatCard, StatRow, Panel } from "../../components/ui/Card";
import { Button, EmptyState } from "../../components/ui/Button";
import { AccountsReceivableStatusTag } from "../../components/ui/Tag";
import { DataTable, Column } from "../../components/ui/DataTable";
import { useAccountsReceivable } from "../../lib/hooks/useAccountsReceivable";
import { AccountsReceivable } from "../../lib/types/domain";
import { formatInr, formatDate } from "../../lib/format";

export default function PaymentsPage() {
  const router = useRouter();
  const { accountsReceivable, loading, error, refetch } = useAccountsReceivable();

  const totalOutstanding = accountsReceivable.reduce((s, ar) => s + ar.balanceAmount, 0);
  const totalCollected = accountsReceivable.reduce((s, ar) => s + ar.paidAmount, 0);
  const paidCount = accountsReceivable.filter((ar) => ar.paymentStatus === "PAID").length;

  const columns: Column<AccountsReceivable>[] = [
    { key: "invoiceNumber", header: "Invoice No.", render: (ar) => ar.invoiceNumber ?? "—" },
    { key: "customerName", header: "Customer", render: (ar) => ar.customerName ?? "—" },
    { key: "outstandingAmount", header: "Invoiced", render: (ar) => formatInr(ar.outstandingAmount) },
    { key: "paidAmount", header: "Paid", render: (ar) => formatInr(ar.paidAmount) },
    { key: "balanceAmount", header: "Balance", render: (ar) => <span style={ar.balanceAmount < 0 ? { color: "var(--bad)" } : undefined}>{formatInr(ar.balanceAmount)}</span> },
    { key: "paymentStatus", header: "Status", render: (ar) => <AccountsReceivableStatusTag status={ar.paymentStatus} /> },
    { key: "dueDate", header: "Due Date", render: (ar) => formatDate(ar.dueDate) },
  ];

  if (loading && accountsReceivable.length === 0) {
    return (
      <div className="page">
        <div className="skeleton" style={{ height: 220, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 300 }} />
      </div>
    );
  }

  // A failed fetch must not read as "zero receivables" — that's the
  // DataTable's own empty state below, reserved for a genuine zero-result response.
  if (error && accountsReceivable.length === 0) {
    return (
      <div className="page">
        <PageHeader
          eyebrow="RevenueOS · Quote to Cash · Payments"
          title="Payments & Collections"
          subtitle="Accounts Receivable status per invoice, and recording payments."
        />
        <Panel title="Accounts Receivable">
          <EmptyState
            icon="alert"
            title="Couldn't load Accounts Receivable"
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
        eyebrow="RevenueOS · Quote to Cash · Payments"
        title="Payments & Collections"
        subtitle="Accounts Receivable status per invoice, and recording payments."
      />

      <StatRow>
        <StatCard label="Receivables" value={String(accountsReceivable.length)} note={`${formatInr(totalOutstanding)} outstanding`} />
        <StatCard label="Collected" value={formatInr(totalCollected)} note="across all receivables" />
        <StatCard label="Fully Paid" value={String(paidCount)} note="of the receivables above" />
      </StatRow>

      <div style={{ marginTop: 14 }}>
        <Panel title="Accounts Receivable" flush>
          <DataTable
            columns={columns}
            rows={accountsReceivable}
            onRowClick={(ar) => router.push(`/sales-invoices/${ar.salesInvoiceId}`)}
            emptyTitle="No receivables yet"
            emptyBody="Accounts Receivable records are created automatically when a Sales Invoice is raised."
          />
        </Panel>
      </div>

      <DesignNote>
        <b>Design note.</b> There is no verified endpoint to list individual payments (<code>GET /payment-collections</code>{" "}
        returns 404) — this shows the real, authoritative Accounts Receivable status per invoice instead (paid
        amount, balance and status all come from <code>GET /accounts-receivable</code>, never from the
        invoice&apos;s own stale <code>paymentStatus</code> field). Click a row to open its Sales Invoice,
        where payments are recorded and collection history is shown.
      </DesignNote>
    </div>
  );
}
