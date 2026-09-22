import { LeadStatus, formatLeadStatus, formatQuotationStatus, formatProformaInvoiceStatus, formatSalesOrderStatus, formatSalesInvoiceStatus, formatAccountsReceivableStatus, formatDispatchOrderStatus } from "../../lib/types/domain";

export type TagColor = "g" | "w" | "b" | "i" | "n";

export function Tag({ children, color }: { children: React.ReactNode; color: TagColor }) {
  return <span className={`tag ${color}`}>{children}</span>;
}

/** Maps domain status/stage strings to a consistent tag color across the app. */
export const STAGE_COLOR: Record<string, TagColor> = {
  // "New" is shared with CustomerStatus (see LEAD_STATUS_STYLE below for why
  // Lead itself no longer reads this entry) — design review Stage 1.3.1 §3
  // asks Customer's New badge to be blue.
  New: "i",
  Contacted: "n",
  Qualified: "n",
  Proposal: "w",
  Negotiation: "i",
  Won: "g",
  Lost: "b",
  Active: "g",
  "At Risk": "w",
  Churned: "b",
  Rejected: "b",
  "Decision Maker": "i",
  Champion: "g",
  Influencer: "n",
  Hot: "b",
  Warm: "w",
  // Design review Stage 1.3.1 §1.3: Cold must read as blue, distinguishable
  // from Hot (red) and Warm (amber).
  Cold: "i",
  High: "b",
  Medium: "w",
  Low: "n",
};

export function StatusTag({ status }: { status: string }) {
  return <Tag color={STAGE_COLOR[status] ?? "n"}>{status}</Tag>;
}

// Quotation status is a raw backend value (DRAFT/REVISED/APPROVED/CONVERTED)
// rather than the Title-Case strings the shared STAGE_COLOR/StatusTag above
// assume — same "raw value in, formatted label out" pattern as LeadStatusTag.
export const QUOTATION_STATUS_STYLE: Record<string, TagColor> = {
  DRAFT: "n",
  REVISED: "w",
  APPROVED: "g",
  CONVERTED: "i",
};

export function QuotationStatusTag({ status }: { status: string }) {
  return <Tag color={QUOTATION_STATUS_STYLE[status] ?? "n"}>{formatQuotationStatus(status)}</Tag>;
}

// Proforma Invoice status — only two reachable backend values (PENDING/APPROVED).
export const PROFORMA_INVOICE_STATUS_STYLE: Record<string, TagColor> = {
  PENDING: "w",
  APPROVED: "g",
};

export function ProformaInvoiceStatusTag({ status }: { status: string }) {
  return <Tag color={PROFORMA_INVOICE_STATUS_STYLE[status] ?? "n"}>{formatProformaInvoiceStatus(status)}</Tag>;
}

// Sales Order status is an open-ended backend string, not a closed enum —
// RevenueOS's own Sales Orders controller only ever writes OPEN (Quotation
// conversion) or PENDING_STORE_APPROVAL (direct create from an approved
// Proforma). Other values exist in real data (e.g. READY_FOR_INVOICING) but
// are written exclusively by unrelated OperationsOS/AdminOS modules outside
// this stage's scope — shown honestly via the neutral fallback tint rather
// than styled as if this screen recognizes them.
export const SALES_ORDER_STATUS_STYLE: Record<string, TagColor> = {
  OPEN: "n",
  PENDING_STORE_APPROVAL: "w",
};

export function SalesOrderStatusTag({ status }: { status: string }) {
  return <Tag color={SALES_ORDER_STATUS_STYLE[status] ?? "i"}>{formatSalesOrderStatus(status)}</Tag>;
}

// Sales Invoice status is an open-ended backend string — the RevenueOS
// controller's only live creation path always writes POSTED. A DRAFT value
// was observed in real data but could not have come from this controller
// (see SalesInvoice in lib/types/domain.ts), so it's styled via the neutral
// fallback rather than treated as a normal reachable state.
export const SALES_INVOICE_STATUS_STYLE: Record<string, TagColor> = {
  POSTED: "g",
};

export function SalesInvoiceStatusTag({ status }: { status: string }) {
  return <Tag color={SALES_INVOICE_STATUS_STYLE[status] ?? "n"}>{formatSalesInvoiceStatus(status)}</Tag>;
}

// DispatchOrder.status is an OperationsOS-owned open-ended string — only
// LOGISTICS_PREPARING and DISPATCHED are ever observed through this app's
// own read-only visibility (Sales Order / Sales Invoice detail pages).
export const DISPATCH_ORDER_STATUS_STYLE: Record<string, TagColor> = {
  LOGISTICS_PREPARING: "w",
  DISPATCHED: "g",
};

export function DispatchOrderStatusTag({ status }: { status: string }) {
  return <Tag color={DISPATCH_ORDER_STATUS_STYLE[status] ?? "n"}>{formatDispatchOrderStatus(status)}</Tag>;
}

// SalesInvoice.paymentStatus itself — kept only for completeness/reference.
// NOT authoritative and NOT used anywhere in the app: the live payment flow
// never updates this field (confirmed empirically — real PAID/WRITTEN_OFF
// AccountsReceivable records still show their linked SalesInvoice stuck at
// PENDING here). See AccountsReceivableStatusTag below for the real one.
export const PAYMENT_STATUS_STYLE: Record<string, TagColor> = {
  PENDING: "w",
  PAID: "g",
};

export function PaymentStatusTag({ status }: { status: string }) {
  return <Tag color={PAYMENT_STATUS_STYLE[status] ?? "n"}>{formatSalesInvoiceStatus(status)}</Tag>;
}

// AccountsReceivable.paymentStatus — the ONE authoritative payment status in
// the app (see AccountsReceivable in lib/types/domain.ts). Reachable values:
// PENDING, PARTIAL, PAID (live payment-collections flow), WRITTEN_OFF
// (bad-debt-writeoff — not integrated this stage, shown honestly via
// fallback tint if ever encountered in real data).
export const ACCOUNTS_RECEIVABLE_STATUS_STYLE: Record<string, TagColor> = {
  PENDING: "w",
  PARTIAL: "i",
  PAID: "g",
  WRITTEN_OFF: "b",
};

export function AccountsReceivableStatusTag({ status }: { status: string }) {
  return <Tag color={ACCOUNTS_RECEIVABLE_STATUS_STYLE[status] ?? "n"}>{formatAccountsReceivableStatus(status)}</Tag>;
}

// Dedicated lifecycle palette for the verified backend LeadStatus enum
// (LEAD_STATUSES in lib/types/domain.ts) — its own hue per stage, separate
// from the shared STAGE_COLOR palette above and from Score's own red/amber/
// blue (see LEAD_SCORE_STYLE below). Blue/entry, teal/in-progress, green/
// qualified-success, amber/proposal, violet/negotiation, red/lost and
// indigo/rejected read as natural cues; every stage uses the same
// restrained light-tint-with-dark-text construction as the rest of the
// app's badges (design review Stage 1.3 patch 05 §3 explicitly rules out a
// large solid saturated fill, even for a terminal state). No new status
// values are introduced, only presentation color — text always renders
// alongside it so nothing depends on color alone.
export const LEAD_STATUS_STYLE: Record<LeadStatus, { bg: string; fg: string }> = {
  NEW: { bg: "#DBEAFE", fg: "#1E3A8A" },
  ASSIGNED: { bg: "#CCFBF1", fg: "#0F766E" },
  CONTACTED: { bg: "#CCFBF1", fg: "#0F766E" },
  PRE_SALES_ASSIGNED: { bg: "#CCFBF1", fg: "#0F766E" },
  QUALIFIED: { bg: "#D1FAE5", fg: "#065F46" },
  SALES_ASSIGNED: { bg: "#D1FAE5", fg: "#065F46" },
  PROPOSAL_SENT: { bg: "#FEF3C7", fg: "#92400E" },
  NEGOTIATION: { bg: "#EDE9FE", fg: "#5B21B6" },
  WON: { bg: "#D1FAE5", fg: "#065F46" },
  LOST: { bg: "#FEE2E2", fg: "#991B1B" },
  REJECTED: { bg: "#E0E7FF", fg: "#3730A3" },
};

export function LeadStatusTag({ status }: { status: string }) {
  const style = LEAD_STATUS_STYLE[status as LeadStatus] ?? { bg: "var(--line-2)", fg: "var(--muted)" };
  return (
    <span className="tag" style={{ background: style.bg, color: style.fg }}>
      {formatLeadStatus(status)}
    </span>
  );
}

// Light-tint treatment for Lead Score (Hot/Warm/Cold) — the same
// restrained "pale background + dark readable text + small dot" pill every
// other badge in the app uses, reusing the app's existing red/amber/blue
// brand tokens (--bad/--warn/--info) as the dark text/dot color against
// their matching pale background. A previous iteration tried a bold
// solid-fill treatment for extra visual weight; design review Stage 1.3
// patch 05 §2 explicitly asks for the opposite — light, subtle, premium,
// not a large saturated block of color — so this reverts to the standard
// tint construction shared with Status/Follow-up/every other tag in the
// app.
export const LEAD_SCORE_STYLE: Record<string, { bg: string; fg: string }> = {
  Hot: { bg: "var(--bad-bg)", fg: "var(--bad)" },
  Warm: { bg: "var(--warn-bg)", fg: "var(--warn)" },
  Cold: { bg: "var(--info-bg)", fg: "var(--info)" },
};

export function LeadScoreTag({ score, suffix }: { score: string; suffix?: string }) {
  const style = LEAD_SCORE_STYLE[score] ?? { bg: "var(--line-2)", fg: "var(--muted)" };
  return (
    <span className="tag" style={{ background: style.bg, color: style.fg }}>
      {score}
      {suffix ? ` ${suffix}` : ""}
    </span>
  );
}

export const TINT: Record<TagColor, { bg: string; fg: string }> = {
  n: { bg: "var(--line-2)", fg: "var(--muted)" },
  w: { bg: "var(--warn-bg)", fg: "var(--warn)" },
  i: { bg: "var(--info-bg)", fg: "var(--info)" },
  g: { bg: "var(--good-bg)", fg: "var(--good)" },
  b: { bg: "var(--bad-bg)", fg: "var(--bad)" },
};

export function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <span
      className={`chip ${active ? "active" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {label}
    </span>
  );
}

export function ChipGroup({ children }: { children: React.ReactNode }) {
  return <div className="chips">{children}</div>;
}
