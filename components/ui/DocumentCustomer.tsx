import Link from "next/link";
import { CustomerChip } from "./EntityChip";
import type { OpportunityStatus } from "../../lib/hooks/useDocumentOpportunity";
import type { Opportunity } from "../../lib/types/domain";

/**
 * "Customer: Raj Traders CUST001" on a commercial document, as a link to the customer.
 * It is read-only navigation and nothing else: the customer's actions stay on the
 * customer, the document's on the document.
 *
 * The customer of a document is the customer linked to the deal it belongs to (the
 * governed link on the opportunity). It is never worked out from a name: a lead, a
 * ledger entry or an invoice may carry a name that looks like a customer's, and that is
 * not the same thing. So the states are honest about what is known:
 *  - linked:   the customer, as a chip (an inactive customer says so);
 *  - not linked: the deal has no customer yet (an older deal), with a way to the deal,
 *              where it can be linked;
 *  - unknown:  the deal could not be found or read, so nothing can be said;
 *  - while loading nothing is claimed, only a placeholder.
 */
export function DocumentCustomer({
  opportunity,
  status,
  unlinkedHref,
}: {
  opportunity: Pick<Opportunity, "id" | "customerId" | "customer"> | null;
  status: OpportunityStatus;
  /** Where to go to link a customer: the deal's page by default. */
  unlinkedHref?: string;
}) {
  if (status === "loading") return <span className="doc-customer skeleton" aria-hidden="true" style={{ width: 170, height: 26, display: "inline-block" }} />;

  let body;
  if (status === "ready" && opportunity?.customerId && opportunity.customer) {
    body = <CustomerChip customer={opportunity.customer} />;
  } else if (status === "ready" && opportunity) {
    body = (
      <span className="dc-unlinked" data-state="unlinked">
        No customer linked to its deal yet.{" "}
        <Link href={unlinkedHref ?? `/opportunities/${opportunity.id}`}>Open the deal</Link>
      </span>
    );
  } else {
    body = (
      <span className="dc-unlinked" data-state="unknown">
        {status === "error" ? "Customer unknown: its deal couldn't be read." : status === "missing" ? "Customer unknown: its deal wasn't found." : "Customer unknown: no deal is recorded for this document."}
      </span>
    );
  }
  return (
    <div className="doc-customer" data-testid="document-customer">
      <span className="k">Customer</span>
      {body}
    </div>
  );
}
