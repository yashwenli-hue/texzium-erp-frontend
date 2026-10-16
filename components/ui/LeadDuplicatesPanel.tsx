"use client";

import Link from "next/link";
import { Panel } from "./Card";
import { LeadStatusTag } from "./Tag";
import { Icon } from "./Icon";
import { formatDate } from "../../lib/format";
import { LeadDuplicateResult, describeReasons, isHidden } from "../../lib/repository/shared/leadDuplicates";

/**
 * Likely duplicates of a lead: the same enquiry entered again (often from another source),
 * and the existing customer it may belong to. Read only - nothing is merged. A match the
 * person may not open is shown as "another lead you do not have access to".
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
  if (leads.length === 0 && customers.length === 0) return null;

  const list = (
    <ul className="dup-list" aria-label="Possible duplicates">
      {leads.map((m, i) =>
        isHidden(m) ? (
          <li key={`h${i}`} className="dup-item">
            <span className={`dup-strength ${m.strength === "EXACT" ? "exact" : ""}`}>{m.strength === "EXACT" ? "Same enquiry" : "Possible"}</span>
            <span>A lead you do not have access to ({describeReasons(m.reasons)}).</span>
          </li>
        ) : (
          <li key={m.id} className="dup-item">
            <span className={`dup-strength ${m.strength === "EXACT" ? "exact" : ""}`}>{m.strength === "EXACT" ? "Same enquiry" : "Possible"}</span>
            <span className="dup-main">
              <Link href={`/leads/${m.id}`} className="dup-link">
                {m.customerName}
                {m.companyName ? ` · ${m.companyName}` : ""}
              </Link>
              <small>
                {m.sourceName ?? "Unknown source"} · received {formatDate(m.createdAt)}
                {m.relation ? ` (${m.relation === "EARLIER" ? "earlier" : "later"})` : ""} · {describeReasons(m.reasons)}
                {!m.isActive ? " · deactivated" : ""}
              </small>
            </span>
            <LeadStatusTag status={m.status} />
          </li>
        ),
      )}
      {customers.map((c, i) =>
        isHidden(c) ? (
          <li key={`ch${i}`} className="dup-item">
            <span className="dup-strength cust">Customer</span>
            <span>An existing customer you do not have access to ({describeReasons(c.reasons)}).</span>
          </li>
        ) : (
          <li key={c.id} className="dup-item">
            <span className="dup-strength cust">Customer</span>
            <span className="dup-main">
              <Link href={`/customers/${c.id}`} className="dup-link">
                {c.customerName} ({c.customerCode})
              </Link>
              <small>Existing customer · {describeReasons(c.reasons)}{!c.isActive ? " · inactive" : ""}</small>
            </span>
          </li>
        ),
      )}
    </ul>
  );

  if (compact) {
    return (
      <div className="dup-warn" role="status">
        <p>
          <Icon name="alert" size={14} /> {result.exact > 0 ? "This looks like an enquiry that is already in RevenueOS." : "Similar records already exist."} Check before saving.
        </p>
        {list}
      </div>
    );
  }

  return (
    <Panel title={`Possible duplicates · ${leads.length + customers.length}`} flush>
      {list}
      <p className="dup-foot">
        Nothing is merged automatically. Leads have no product field, so the same product cannot be compared.
        {canResolve ? " If this lead is the duplicate, deactivate it (or delete it as a duplicate, naming the lead to keep)." : ""}
      </p>
    </Panel>
  );
}
