import Link from "next/link";
import { Button } from "../ui/Button";
import { Disclosure } from "../ui/Disclosure";
import { EntityChip } from "../ui/EntityChip";
import { Icon } from "../ui/Icon";
import { MoneyText } from "../ui/MoneyText";
import { StageChain } from "../ui/StageChain";
import { OpportunityStageTag, ProformaInvoiceStatusTag, QuotationStatusTag, SalesOrderStatusTag, Tag } from "../ui/Tag";
import { Deal, QuotationTrail, documentRef } from "../../lib/repository/shared/customerCockpit";
import type { CustomerLegacyMatch, CustomerOverviewInvoice } from "../../lib/types/domain";
import { formatDate } from "../../lib/format";

const NEXT_ICON = { bad: "alert", warn: "alert", action: "arrow", info: "clock", good: "check" } as const;

/** The payment tag is collections data: without collections.view only the invoice's own status is shown. */
function invoiceTags(i: CustomerOverviewInvoice, collectionsHidden: boolean) {
  const pay = i.paymentStatus.charAt(0) + i.paymentStatus.slice(1).toLowerCase().replace("_", " ");
  return (
    <>
      <Tag color={i.status === "DRAFT" ? "n" : "g"}>{i.status === "DRAFT" ? "Draft" : "Posted"}</Tag>
      {!collectionsHidden && <Tag color={i.paymentStatus === "PAID" ? "g" : i.paymentStatus === "PARTIAL" ? "w" : "n"}>{pay}</Tag>}
    </>
  );
}

/** The documents of one quotation, in the order they were made: quotation, then what was built on it. */
function TrailRows({ t }: { t: QuotationTrail }) {
  const q = t.quotation;
  return (
    <li className="dd-group">
      <ul className="deal-docs">
        <li>
          <span className="kind">Quotation</span>
          <Link href={`/quotations/${q.id}`}>{documentRef(q.id, q.quotationCode)}</Link>
          <QuotationStatusTag status={q.status as never} />
          <span className="amt">
            <MoneyText value={q.totalAmount} mode="exact" />
          </span>
        </li>
        {t.proformas.map((p) => (
          <li key={p.id} className="indent-1">
            <span className="kind">Proforma</span>
            <Link href={`/proforma-invoices/${p.id}`}>{documentRef(p.id, p.proformaNumber)}</Link>
            <ProformaInvoiceStatusTag status={p.status as never} expired={p.isExpired} />
            <span className="amt">
              <MoneyText value={p.totalAmount} mode="exact" />
            </span>
          </li>
        ))}
        {t.orders.map((o) => (
          <li key={o.id} className="indent-1">
            <span className="kind">Order</span>
            <Link href={`/sales-orders/${o.id}`}>{documentRef(o.id, o.salesOrderCode)}</Link>
            <SalesOrderStatusTag status={o.status} />
            <span className="amt">
              <MoneyText value={o.totalAmount} mode="exact" />
            </span>
          </li>
        ))}
        {t.invoices.map((i) => (
          <li key={i.id} className="indent-2">
            <span className="kind">Invoice</span>
            <Link href={`/sales-invoices/${i.id}`}>{documentRef(i.id, i.invoiceNumber)}</Link>
            {invoiceTags(i, t.collectionsHidden)}
            <span className="amt">
              <MoneyText value={i.totalAmount} mode="exact" />
            </span>
          </li>
        ))}
      </ul>
      <p className="dd-next">Next: {t.next.label}</p>
    </li>
  );
}

/**
 * One deal of the customer, the central object of the cockpit: its title and
 * stage, what it is worth, the chain that shows where it is (deal, quotation,
 * Proforma, order, invoice, payment), the one thing it is waiting for with a link to
 * where to do it, and, folded away, every document built on it. The only action it
 * offers itself is a new quotation; approving, invoicing and the rest stay on the
 * documents, which own those rules.
 */
export function DealCard({
  deal,
  lead,
  canQuote,
  quoteBlockedReason,
  onQuote,
}: {
  deal: Deal;
  lead?: { id: string; name: string };
  canQuote: boolean;
  quoteBlockedReason?: string;
  onQuote: () => void;
}) {
  const o = deal.opportunity;
  const docCount = deal.trails.reduce((c, t) => c + 1 + t.proformas.length + t.orders.length + t.invoices.length, 0);
  const reasonId = `deal-${o.id}-why`;
  return (
    <article className="deal-card" aria-labelledby={`deal-${o.id}`} data-testid="deal-card">
      <header className="dc-head">
        <div className="dc-title">
          <h3 id={`deal-${o.id}`}>
            <Link href={`/opportunities/${o.id}`}>{o.title}</Link>
          </h3>
          <div className="dc-meta">
            <OpportunityStageTag stage={o.stage as never} />
            <span>
              <MoneyText value={o.expectedValue} /> expected
            </span>
            <span>{o.probability}%</span>
            <span>closes {formatDate(o.expectedCloseDate)}</span>
            {lead && <EntityChip href={`/leads/${lead.id}`} icon="user" label={lead.name} title={`Open the lead ${lead.name}`} />}
          </div>
        </div>
      </header>

      <StageChain steps={deal.steps} label={`Progress of ${o.title}`} />

      <div className={`dc-next tone-${deal.next.tone}`} data-testid="deal-next">
        <span className="dc-next-text">
          <Icon name={NEXT_ICON[deal.next.tone]} size={14} />
          <span>
            <b>Next:</b> {deal.next.label}
          </span>
        </span>
        {deal.next.href && (
          <Link href={deal.next.href} className="dc-open">
            Open
          </Link>
        )}
      </div>

      {deal.trails.length > 0 && (
        <Disclosure summary={deal.trails.length === 1 ? "Documents" : `Documents · ${deal.trails.length} quotations`} count={docCount} testId="deal-docs">
          <ul className="dd-list">
            {deal.trails.map((t) => (
              <TrailRows key={t.quotation.id} t={t} />
            ))}
          </ul>
        </Disclosure>
      )}

      <footer className="dc-foot">
        <Button className="sm" icon="plus" onClick={onQuote} disabled={!canQuote} aria-describedby={!canQuote && quoteBlockedReason ? reasonId : undefined}>
          New quotation
        </Button>
        {!canQuote && quoteBlockedReason && (
          <span id={reasonId} className="dc-why">
            {quoteBlockedReason}
          </span>
        )}
      </footer>
    </article>
  );
}

/**
 * An opportunity that is not linked to any customer but whose lead carries this
 * customer's name. It sits among the deals, dashed, because it is probably one of
 * them, and says plainly that it is a guess by name: a person checks, then links it.
 */
export function SuggestedDealCard({ match, canLink, reason, onLink }: { match: CustomerLegacyMatch; canLink: boolean; reason?: string; onLink: () => void }) {
  const reasonId = `suggest-${match.id}-why`;
  return (
    <article className="deal-card suggested" aria-labelledby={`suggest-${match.id}`} data-testid="legacy-match">
      <p className="dc-badge">Looks like this customer&apos;s deal</p>
      <h3 id={`suggest-${match.id}`}>
        <Link href={`/opportunities/${match.id}`}>{match.title}</Link>
      </h3>
      <p className="dc-meta-line">
        Lead {match.leadName}
        {match.leadCompany ? ` (${match.leadCompany})` : ""} · {match.matchedBy === "LEAD_NAME" ? "same name as the customer" : "company name matches"} · {match.quotationCount} {match.quotationCount === 1 ? "quotation" : "quotations"}
      </p>
      <p className="dc-guess">That is only a guess by name. Check it, then link it: its quotations, orders and invoices then belong to this customer and count in the totals above.</p>
      <div className="dc-foot">
        <Button variant="primary" className="sm" icon="target" onClick={onLink} disabled={!canLink} aria-describedby={!canLink && reason ? reasonId : undefined}>
          Review and link
        </Button>
        {!canLink && reason && (
          <span id={reasonId} className="dc-why">
            {reason}
          </span>
        )}
      </div>
    </article>
  );
}
