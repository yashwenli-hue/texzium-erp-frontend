"use client";

import Link from "next/link";
import { Panel } from "./Card";
import { LeadStatusTag } from "./Tag";
import { Icon } from "./Icon";
import { formatDate } from "../../lib/format";
import {
  CustomerMatchForLead,
  ENQUIRY_KIND_GROUP,
  ENQUIRY_KIND_LABEL,
  EnquiryKind,
  LeadDuplicate,
  LeadDuplicateResult,
  describeReasons,
  isHidden,
  namesOf,
  returningHeadline,
  routingAdvice,
} from "../../lib/repository/shared/leadDuplicates";

/**
 * Returning enquiries: the customer this enquiry belongs to (or may belong to), and the
 * person's other enquiries - each marked as a possible duplicate, an earlier enquiry
 * (a legitimate repeat) or a possible match to check. Read only: nothing is merged,
 * blocked or reassigned. A record the person may not open is shown without its details;
 * for a customer, the salesperson who looks after it is named so the enquiry can be routed.
 */
export function LeadDuplicatesPanel({
  result,
  compact,
  canResolve,
}: {
  result: LeadDuplicateResult;
  /** In a form: a short warning instead of a panel. */
  compact?: boolean;
  /** The person may deactivate or delete a lead (the ways to resolve a duplicate). */
  canResolve?: boolean;
}) {
  const { leads, customers } = result;
  const headline = returningHeadline(result);
  if (!headline) return null;

  const groups: EnquiryKind[] = ["POTENTIAL_DUPLICATE", "REPEAT_ENQUIRY", "POSSIBLE_MATCH"];
  const body = (
    <>
      {customers.length > 0 && (
        <ul className="dup-list" aria-label="Existing customers">
          {customers.map((c, i) => (
            <CustomerRow key={isHidden(c) ? `ch${i}` : `${c.link}${c.id}`} c={c} />
          ))}
        </ul>
      )}
      {groups.map((kind) => {
        const rows = leads.filter((l) => l.kind === kind);
        if (!rows.length) return null;
        return (
          <ul key={kind} className="dup-list" aria-label={ENQUIRY_KIND_GROUP[kind]}>
            {rows.map((m, i) => (
              <EnquiryRow key={isHidden(m) ? `h${kind}${i}` : m.id} m={m} />
            ))}
          </ul>
        );
      })}
    </>
  );

  if (compact) {
    return (
      <div className="dup-warn" role="status">
        <p>
          <Icon name="alert" size={14} /> {headline} Check before saving - a new enquiry is still recorded as its own lead.
        </p>
        {body}
      </div>
    );
  }

  return (
    <Panel title={`Returning enquiry · ${leads.length + customers.length}`} flush>
      <p className="dup-head">{headline}</p>
      {body}
      <p className="dup-foot">
        Nothing is merged, blocked or reassigned automatically. A repeat enquiry stays its own lead with its own source and product.
        {result.productComparison === "unavailable" ? " No product is recorded on this enquiry, so products could not be compared." : ""}
        {canResolve ? " If this lead is an accidental duplicate, deactivate it (or delete it as a duplicate, naming the lead to keep)." : ""}
      </p>
    </Panel>
  );
}

function CustomerRow({ c }: { c: CustomerMatchForLead }) {
  const tag = c.link === "LINKED" ? "Linked customer" : c.strength === "EXACT" ? "Same customer" : c.strength === "STRONG" ? "Likely customer" : "Possible customer";
  if (isHidden(c)) {
    return (
      <li className="dup-item">
        <span className={`dup-strength cust ${c.strength === "EXACT" ? "exact" : ""}`}>{tag}</span>
        <span className="dup-main">
          <span>
            An existing customer you do not have access to{c.reasons.length ? ` (${describeReasons(c.reasons)})` : ""}.
          </span>
          <small>{routingAdvice(c.mappedTo)}</small>
        </span>
      </li>
    );
  }
  return (
    <li className="dup-item">
      <span className={`dup-strength cust ${c.strength === "EXACT" ? "exact" : ""}`}>{tag}</span>
      <span className="dup-main">
        <Link href={`/customers/${c.id}`} className="dup-link">
          {c.customerName} ({c.customerCode})
        </Link>
        <small>
          {c.link === "LINKED" ? "This enquiry's customer" : `Existing customer · ${describeReasons(c.reasons)}`}
          {c.mappedTo.length ? ` · looked after by ${namesOf(c.mappedTo)}` : ""}
          {!c.isActive ? " · inactive" : ""}
        </small>
      </span>
    </li>
  );
}

function EnquiryRow({ m }: { m: LeadDuplicate }) {
  const label = ENQUIRY_KIND_LABEL[m.kind];
  const strong = m.kind === "POTENTIAL_DUPLICATE";
  const when = m.relation ? ` (${m.relation === "EARLIER" ? "earlier" : "later"})` : "";
  const why = `${describeReasons(m.reasons)}${m.differentName ? " - but another name: it may be a different person" : ""}`;
  if (isHidden(m)) {
    return (
      <li className="dup-item">
        <span className={`dup-strength ${strong ? "exact" : ""}`}>{label}</span>
        <span className="dup-main">
          <span>An enquiry you do not have access to{when}.</span>
          <small>
            {why}
            {m.handledBy ? ` · handled by ${m.handledBy.fullName ?? "a former user"}` : " · not assigned"}
          </small>
        </span>
      </li>
    );
  }
  const product = m.inventoryItem?.productName
    ? ` · ${m.inventoryItem.productName}${m.sameProduct === true ? " (same product)" : m.sameProduct === false ? " (another product)" : ""}`
    : "";
  const customer = m.customer
    ? isHidden(m.customer)
      ? ` · linked to a customer${m.customer.mappedTo.length ? ` looked after by ${namesOf(m.customer.mappedTo)}` : ""}`
      : ` · customer ${m.customer.customerName}`
    : "";
  return (
    <li className="dup-item">
      <span className={`dup-strength ${strong ? "exact" : ""}`}>{label}</span>
      <span className="dup-main">
        <Link href={`/leads/${m.id}`} className="dup-link">
          {m.customerName}
          {m.companyName ? ` · ${m.companyName}` : ""}
        </Link>
        <small>
          {m.sourceName ?? "Unknown source"} · received {formatDate(m.createdAt)}
          {when}
          {product} · {why}
          {m.assignedTo ? ` · handled by ${m.assignedTo.fullName ?? "a former user"}` : ""}
          {customer}
          {!m.isActive ? " · deactivated" : ""}
        </small>
      </span>
      <LeadStatusTag status={m.status} />
    </li>
  );
}
