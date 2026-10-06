import { LifecycleCallout } from "./LifecycleCallout";
import { ProformaEvent, ProformaInvoice, Quotation, SalesOrder, formatQuotationStatus } from "../../lib/types/domain";
import { formatDate, formatDateTime } from "../../lib/format";
import { validityLabel } from "../../lib/repository/shared/proformaLifecycle";

/** What is true of the Proforma now, what happens next, and why an action is blocked (expiry, a live Sales Order). */
export function ProformaCallout({
  proforma,
  quotation,
  liveOrders,
  ordersKnown,
  events,
}: {
  proforma: ProformaInvoice;
  quotation?: Quotation | null;
  liveOrders: SalesOrder[];
  ordersKnown: boolean;
  events: ProformaEvent[];
}) {
  const validity = proforma.validityDate ? formatDate(proforma.validityDate) : null;

  if (proforma.status === "CANCELLED") {
    const e = events.find((x) => x.action === "PROFORMA_CANCELLED");
    return (
      <LifecycleCallout tone="bad" icon="close" title="Cancelled — this Proforma Invoice is closed" testId="proforma-callout">
        {e ? (
          <p>
            Cancelled{e.actorName ? ` by ${e.actorName}` : ""} on {formatDateTime(e.occurredAt)}.
            {e.remarks && <> Reason: <span className="quote">&ldquo;{e.remarks}&rdquo;</span></>}
          </p>
        ) : (
          <p>The reason and who cancelled it weren&apos;t recorded.</p>
        )}
        <p>Cancellation is final. While its quotation is approved and has no other active Proforma Invoice, a new one can be created from the quotation.</p>
      </LifecycleCallout>
    );
  }

  if (proforma.isExpired) {
    const approved = proforma.status === "APPROVED";
    return (
      <LifecycleCallout tone="bad" icon="alert" title={`Expired${validity ? ` on ${validity}` : ""} — ${approved ? "can't create a Sales Order" : "can't be approved"}`} testId="proforma-callout">
        <p>
          {approved
            ? "A Sales Order can no longer be created from this Proforma Invoice."
            : "An expired Proforma Invoice can no longer be approved."}{" "}
          {liveOrders.length > 0
            ? `Sales Order ${liveOrders[0].salesOrderCode}, created from it earlier, is not affected.`
            : "Cancel it, then create a new Proforma Invoice from the quotation."}
        </p>
      </LifecycleCallout>
    );
  }

  const v = validityLabel(proforma.validityDate);

  if (proforma.status === "PENDING") {
    return (
      <LifecycleCallout tone="warn" icon="clock" title="Awaiting approval" testId="proforma-callout">
        <p>
          Approve it once the customer has confirmed. A Sales Order can only be created from an approved Proforma Invoice
          {validity ? `, and this one is valid through ${validity} (${v.text}).` : "."}
        </p>
      </LifecycleCallout>
    );
  }

  // APPROVED and not expired
  if (liveOrders.length > 0) {
    return (
      <LifecycleCallout tone="good" icon="check" title={`Approved — Sales Order ${liveOrders[0].salesOrderCode} was created from it`} testId="proforma-callout">
        <p>While that order is live this Proforma Invoice can&apos;t be cancelled and only one active order can exist for it. Cancel the Sales Order first if the Proforma must change.</p>
      </LifecycleCallout>
    );
  }
  if (quotation && quotation.status !== "APPROVED") {
    return (
      <LifecycleCallout tone="warn" icon="alert" title={`Approved, but its quotation is ${formatQuotationStatus(quotation.status)}`} testId="proforma-callout">
        <p>A Sales Order needs the quotation to be approved, so none can be created from this Proforma Invoice right now.</p>
      </LifecycleCallout>
    );
  }
  return (
    <LifecycleCallout tone="good" icon="check" title="Approved — ready for a Sales Order" testId="proforma-callout">
      <p>
        Create the Sales Order from here; its total is this Proforma&apos;s total and only one active order can exist for it
        {validity ? `. Valid through ${validity} (${v.text}).` : "."}
        {!ordersKnown && " (Sales Orders couldn't be checked from here; the system will refuse a second one.)"}
      </p>
    </LifecycleCallout>
  );
}
