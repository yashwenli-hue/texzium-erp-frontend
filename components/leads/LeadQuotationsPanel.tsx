"use client";

import { Panel } from "../ui/Card";
import { DataTable, Column } from "../ui/DataTable";
import { Tag, TagColor } from "../ui/Tag";
import { Button } from "../ui/Button";
import { useLeadQuotations } from "../../lib/hooks/useLeadQuotations";
import { LeadQuotationSummary, QuotationProgress } from "../../lib/types/domain";
import { formatDate } from "../../lib/format";

const PROGRESS_COLOR: Record<QuotationProgress, TagColor> = {
  IN_PREPARATION: "n",
  APPROVED: "i",
  PROFORMA_ISSUED: "i",
  CUSTOMER_ACCEPTED: "g",
  ORDER_PLACED: "g",
  REJECTED: "b",
};

const COLUMNS: Column<LeadQuotationSummary>[] = [
  {
    key: "quotation",
    header: "Quotation",
    render: (q) => (
      <div>
        <b>{q.quotationCode ?? "Draft quotation"}</b>
        <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{q.opportunity.title}</div>
      </div>
    ),
  },
  {
    key: "products",
    header: "Products",
    render: (q) =>
      q.lines.length ? (
        <span className="cell-clip" title={q.lines.map((l) => `${l.description} × ${l.quantity}`).join(", ")}>
          {q.lines.map((l) => `${l.description} × ${l.quantity}`).join(", ")}
        </span>
      ) : (
        <span className="cell-none">—</span>
      ),
  },
  { key: "date", header: "Date", render: (q) => <span className="cell-nowrap">{formatDate(q.quoteDate)}</span> },
  {
    key: "progress",
    header: "Where it is",
    render: (q) => (
      <div className="cell-tags">
        <Tag color={PROGRESS_COLOR[q.progress]}>{q.progressLabel}</Tag>
        {q.order?.code && <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{q.order.code}</span>}
        {!q.order && q.proforma?.number && <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{q.proforma.number}</span>}
      </div>
    ),
  },
];

/**
 * The quotations made on a lead, for people who may see the lead but not prices
 * (Pre-Sales): what was quoted, in what quantity, and how far it got. No amounts.
 */
export function LeadQuotationsPanel({ leadId }: { leadId: string }) {
  const { quotations, loading, error, refetch } = useLeadQuotations(leadId);
  return (
    <Panel title="Quotations" flush>
      {error && quotations.length === 0 ? (
        <div style={{ padding: "4px 19px 12px" }} role="alert">
          <p style={{ color: "var(--bad)", fontSize: 12.5 }}>Couldn&apos;t load the quotations: {error.message}</p>
          <Button variant="ghost" onClick={refetch}>Retry</Button>
        </div>
      ) : loading && quotations.length === 0 ? (
        <div className="skeleton" style={{ height: 80, margin: "0 19px 14px" }} aria-busy="true" />
      ) : (
        <>
          <DataTable
            columns={COLUMNS}
            rows={quotations}
            emptyTitle="No quotations yet"
            emptyBody="Sales prepares the quotation once the lead is qualified and the deal is opened."
          />
          <p style={{ fontSize: 11.5, color: "var(--faint-text)", padding: "8px 19px 12px", margin: 0 }}>
            Prices are shown to Sales only.
          </p>
        </>
      )}
    </Panel>
  );
}
