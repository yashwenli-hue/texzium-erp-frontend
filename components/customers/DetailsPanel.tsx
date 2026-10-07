import { QuickActions } from "../ui/QuickActions";
import type { Customer } from "../../lib/types/domain";
import { formatDate } from "../../lib/format";

/** The customer's own details and the three ways to reach it (call, email, WhatsApp; there is no calendar to schedule a meeting against). */
export function DetailsPanel({ customer }: { customer: Customer }) {
  const reachable = !!(customer.phone || customer.email);
  return (
    <section className="card panel" id="details" aria-labelledby="details-title" data-testid="details-panel">
      <div className="panel-head">
        <h3 id="details-title">Details</h3>
      </div>
      <div className="facts" data-testid="details">
        <div className="f"><span className="k">PAN</span><div>{customer.panNumber ?? "—"}</div></div>
        <div className="f"><span className="k">Email</span><div>{customer.email ?? "—"}</div></div>
        <div className="f"><span className="k">Phone</span><div>{customer.phone ?? "—"}</div></div>
        <div className="f"><span className="k">Type</span><div>{customer.customerType ?? "—"}</div></div>
        <div className="f"><span className="k">Created</span><div>{formatDate(customer.createdAt)}</div></div>
        <div className="f"><span className="k">Last updated</span><div>{formatDate(customer.updatedAt)}</div></div>
      </div>
      {reachable && (
        <div className="details-contact" data-testid="quick-contact">
          <QuickActions phone={customer.phone} email={customer.email} contactName={customer.customerName} include={["call", "email", "whatsapp"]} />
        </div>
      )}
    </section>
  );
}
