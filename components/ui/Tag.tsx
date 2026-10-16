import { Icon } from "./Icon";
import { LeadStatus, OPPORTUNITY_STAGES, formatOpportunityStage, formatLeadStatus, formatQuotationStatus, formatProformaInvoiceStatus, formatSalesOrderStatus, formatSalesInvoiceStatus, formatAccountsReceivableStatus, formatDispatchOrderStatus } from "../../lib/types/domain";

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

// Opportunity stage is the backend's raw Opportunity.status (QUALIFIED,
// PROPOSAL, NEGOTIATION, WON, LOST), so it is styled and labelled the same way
// as Quotation status: raw value in, formatted label out. Colours are the ones
// these stages have always had.
export const OPPORTUNITY_STAGE_STYLE: Record<string, TagColor> = {
  QUALIFIED: "n",
  PROPOSAL: "w",
  NEGOTIATION: "i",
  WON: "g",
  LOST: "b",
};

export function OpportunityStageTag({ stage }: { stage: string }) {
  return <Tag color={OPPORTUNITY_STAGE_STYLE[stage] ?? "n"}>{formatOpportunityStage(stage)}</Tag>;
}

// Quotation status is a raw backend value (DRAFT/REVISED/APPROVED/REJECTED)
// rather than the Title-Case strings the shared STAGE_COLOR/StatusTag above
// assume — same "raw value in, formatted label out" pattern as LeadStatusTag.
export const QUOTATION_STATUS_STYLE: Record<string, TagColor> = {
  DRAFT: "n",
  REVISED: "w",
  APPROVED: "g",
  REJECTED: "b",
};

export function QuotationStatusTag({ status }: { status: string }) {
  return <Tag color={QUOTATION_STATUS_STYLE[status] ?? "n"}>{formatQuotationStatus(status)}</Tag>;
}

// Proforma Invoice status: PENDING, APPROVED, CANCELLED. Expiry is not a status
// (the backend derives it from the validity date), so it is shown as its own tag
// beside the status of a Proforma that has run out and is not cancelled.
export const PROFORMA_INVOICE_STATUS_STYLE: Record<string, TagColor> = {
  PENDING: "w",
  APPROVED: "g",
  CANCELLED: "b",
};

export function ProformaInvoiceStatusTag({ status, expired }: { status: string; expired?: boolean }) {
  const showExpired = !!expired && status !== "CANCELLED";
  return (
    <span style={{ display: "inline-flex", gap: 5, alignItems: "center", flexWrap: "wrap" }}>
      <Tag color={PROFORMA_INVOICE_STATUS_STYLE[status] ?? "n"}>{formatProformaInvoiceStatus(status)}</Tag>
      {showExpired && <Tag color="b">Expired</Tag>}
    </span>
  );
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
  PENDING_ACCOUNTS_APPROVAL: "w",
  READY_FOR_DISPATCH_ORDER: "g",
  CANCELLED: "b",
};

export function SalesOrderStatusTag({ status }: { status: string }) {
  return <Tag color={SALES_ORDER_STATUS_STYLE[status] ?? "i"}>{formatSalesOrderStatus(status)}</Tag>;
}

// Advance receipt verification: PENDING until a person verifies or rejects it.
export const ADVANCE_RECEIPT_STATUS_STYLE: Record<string, TagColor> = {
  PENDING: "w",
  VERIFIED: "g",
  REJECTED: "b",
};

export function AdvanceReceiptStatusTag({ status }: { status: string }) {
  return <Tag color={ADVANCE_RECEIPT_STATUS_STYLE[status] ?? "n"}>{formatSalesOrderStatus(status)}</Tag>;
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

// Lead lifecycle palette: one hue per stage, so neighbouring stages never look
// the same, on the restrained light-tint-with-dark-text badge used everywhere
// (no solid fills, even for a terminal state). Every pair is theme-aware
// (--lead-* tokens in app/globals.css, light and dark-v4) and at least 4.5:1.
//   blue      New
//   indigo    Assigned / Pre-Sales Assigned  (an assignment, not a verdict)
//   cyan      Contacted
//   orange    Underqualified (contacted, not yet a fit)
//   teal      Qualified / Sales Assigned
//   amber     Proposal Sent
//   violet    Negotiation
//   green     Won    + tick
//   red       Lost   + cross
//   slate     Rejected + cross   (closed as not a fit; not the same as Lost)
// The label is always shown, and the closed states carry an icon in place of the
// dot, so nothing depends on colour alone. This map is also KanbanBoard's
// colorMap on the Lead Pipeline board (app/pipeline/page.tsx).
export const LEAD_STATUS_STYLE: Record<LeadStatus, { bg: string; fg: string }> = {
  NEW: { bg: "var(--lead-new-bg)", fg: "var(--lead-new-fg)" },
  ASSIGNED: { bg: "var(--lead-assigned-bg)", fg: "var(--lead-assigned-fg)" },
  PRE_SALES_ASSIGNED: { bg: "var(--lead-assigned-bg)", fg: "var(--lead-assigned-fg)" },
  CONTACTED: { bg: "var(--lead-contacted-bg)", fg: "var(--lead-contacted-fg)" },
  UNDERQUALIFIED: { bg: "var(--lead-underqualified-bg)", fg: "var(--lead-underqualified-fg)" },
  QUALIFIED: { bg: "var(--lead-qualified-bg)", fg: "var(--lead-qualified-fg)" },
  SALES_ASSIGNED: { bg: "var(--lead-qualified-bg)", fg: "var(--lead-qualified-fg)" },
  PROPOSAL_SENT: { bg: "var(--lead-proposal-bg)", fg: "var(--lead-proposal-fg)" },
  NEGOTIATION: { bg: "var(--lead-negotiation-bg)", fg: "var(--lead-negotiation-fg)" },
  WON: { bg: "var(--lead-good-bg)", fg: "var(--lead-good-fg)" },
  LOST: { bg: "var(--lead-lost-bg)", fg: "var(--lead-lost-fg)" },
  REJECTED: { bg: "var(--lead-rejected-bg)", fg: "var(--lead-rejected-fg)" },
};

/** The icon a closed status shows in place of the dot. */
export const LEAD_STATUS_MARK: Partial<Record<LeadStatus, string>> = {
  WON: "check",
  LOST: "close",
  REJECTED: "close",
};

export function LeadStatusTag({ status }: { status: string }) {
  const style = LEAD_STATUS_STYLE[status as LeadStatus] ?? { bg: "var(--line-2)", fg: "var(--text-2)" };
  const mark = LEAD_STATUS_MARK[status as LeadStatus];
  return (
    <span className={mark ? "tag tag-mark" : "tag"} style={{ background: style.bg, color: style.fg }}>
      {mark && <Icon name={mark} size={11} />}
      {formatLeadStatus(status)}
    </span>
  );
}

/** Shown next to (never instead of) the lead's pipeline status. Neutral on purpose: it is a record state, not a stage. */
export function LeadDeactivatedTag() {
  return (
    <span className="tag" style={{ background: "var(--line-2)", color: "var(--text-2)" }}>
      Deactivated
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

/** Column tints for a board whose columns are opportunity stages (see KanbanBoard `colorMap`). */
export const OPPORTUNITY_STAGE_TINT: Record<string, { bg: string; fg: string }> = Object.fromEntries(
  OPPORTUNITY_STAGES.map((stage) => [stage, TINT[OPPORTUNITY_STAGE_STYLE[stage]]])
);

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

/** A customer is active or inactive (an inactive one is kept, with everything it has, but takes nothing new). */
export function CustomerStatusTag({ isActive }: { isActive: boolean }) {
  return <Tag color={isActive ? "g" : "n"}>{isActive ? "Active" : "Inactive"}</Tag>;
}
