import { LifecycleCallout } from "./LifecycleCallout";
import { ProformaInvoice, Quotation, QuotationEvent, SalesOrder } from "../../lib/types/domain";
import { formatDateTime } from "../../lib/format";

/** What is true of the quotation now, what happens next, and why something is locked. */
export function QuotationCallout({
  quotation,
  legacy,
  activeProforma,
  liveOrders,
  downstreamKnown,
  events,
}: {
  quotation: Quotation;
  legacy: boolean;
  activeProforma?: ProformaInvoice;
  liveOrders: SalesOrder[];
  downstreamKnown: boolean;
  events: QuotationEvent[];
}) {
  const legacyNote = legacy ? (
    <p data-testid="legacy-note">
      <b>Legacy quotation.</b> Its taxable amount and GST were never recorded, so the system can&apos;t say what its tax
      should be and won&apos;t revise or approve it. Anything already built on it keeps working. To change the commercial
      terms, create a new quotation.
    </p>
  ) : null;

  if (quotation.status === "REJECTED") {
    const e = events.find((x) => x.action === "QUOTATION_REJECTED");
    return (
      <LifecycleCallout tone="bad" icon="close" title="Rejected — this quotation is closed" testId="quotation-callout">
        {e ? (
          <p>
            Rejected{e.actorName ? ` by ${e.actorName}` : ""} on {formatDateTime(e.occurredAt)}.
            {e.remarks && <> Reason: <span className="quote">&ldquo;{e.remarks}&rdquo;</span></>}
          </p>
        ) : (
          <p>The reason and who rejected it weren&apos;t recorded.</p>
        )}
        <p>A rejected quotation is final: it can&apos;t be revised, approved or turned into a Proforma Invoice.</p>
        {legacyNote}
      </LifecycleCallout>
    );
  }

  if (quotation.status === "DRAFT") {
    return (
      <LifecycleCallout tone={legacy ? "warn" : "info"} icon="edit" title="Draft — not approved yet" testId="quotation-callout">
        <p>Check the amount, revise it if needed, then approve it. A Proforma Invoice can only be created from an approved quotation.</p>
        {legacyNote}
      </LifecycleCallout>
    );
  }

  if (quotation.status === "REVISED") {
    return (
      <LifecycleCallout tone="warn" icon="layers" title="Revised — needs approval" testId="quotation-callout">
        <p>The amount was changed after it was created or approved. It must be approved again before a Proforma Invoice can be created; the history shows what changed.</p>
        {legacyNote}
      </LifecycleCallout>
    );
  }

  // APPROVED
  if (liveOrders.length > 0) {
    const o = liveOrders[0];
    return (
      <LifecycleCallout tone="good" icon="check" title={`Approved — Sales Order ${o.salesOrderCode} exists`} testId="quotation-callout">
        <p>This quotation is commercially locked: a Sales Order has been created from it, so its amounts can&apos;t be changed. Cancel the Sales Order (and any Proforma Invoice) first if the terms must change.</p>
        {legacyNote}
      </LifecycleCallout>
    );
  }
  if (activeProforma) {
    const expired = activeProforma.isExpired;
    return (
      <LifecycleCallout tone={expired ? "bad" : "good"} icon={expired ? "alert" : "check"} title={expired ? `Approved — Proforma ${activeProforma.proformaNumber} has expired` : "Approved and locked by its Proforma Invoice"} testId="quotation-callout">
        <p>
          {expired
            ? `Proforma ${activeProforma.proformaNumber} is past its validity date, so it can't be approved or turned into a Sales Order. Cancel it to create a new one, or to revise this quotation.`
            : `Proforma ${activeProforma.proformaNumber} (${activeProforma.status === "APPROVED" ? "approved" : "awaiting approval"}) is active, so this quotation's amounts are locked. Cancel the Proforma Invoice first to revise the quotation.`}
        </p>
        {legacyNote}
      </LifecycleCallout>
    );
  }
  return (
    <LifecycleCallout tone="good" icon="check" title="Approved — ready for a Proforma Invoice" testId="quotation-callout">
      <p>
        The amounts are approved. Create a Proforma Invoice to continue toward a Sales Order. Until something is built on it
        you can still revise the quotation, which sends it back for approval.
        {!downstreamKnown && " (Proformas and Sales Orders couldn't be checked from here; the system will refuse a revision if something has been built on it.)"}
      </p>
      {legacyNote}
    </LifecycleCallout>
  );
}
