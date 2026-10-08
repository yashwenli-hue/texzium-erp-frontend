import { MoneyText } from "../ui/MoneyText";
import { DeactivationImpact as Impact } from "../../lib/repository/shared/customerCockpit";

/**
 * What deactivating a customer touches, read from its overview before the person decides.
 * Nothing is cancelled by deactivating: the customer, its registrations, deals and documents
 * are kept and stay readable; what stops is anything new. So this lists, separately, what
 * cannot go on because its next step is a new document, and what is under way and stays as
 * it is. The money is FinanceOS's, as recorded and read-only: outstanding, and the part of it
 * that is overdue by the recorded due dates (a figure worked out here, not a ledger one).
 */
export function DeactivationImpact({ impact, loading, error }: { impact: Impact | null; loading?: boolean; error?: Error | null }) {
  if (error) {
    return (
      <p className="impact-note" role="status" data-testid="deactivation-impact">
        What is open for this customer couldn&apos;t be loaded ({error.message}). You can still deactivate it: nothing is cancelled either way.
      </p>
    );
  }
  if (!impact) {
    return (
      <p className="impact-note" role="status" data-testid="deactivation-impact">
        {loading ? "Checking what is open for this customer…" : "What is open for this customer isn't available."}
      </p>
    );
  }
  const m = impact.money;
  return (
    <div className="impact" data-testid="deactivation-impact">
      <h4>What this touches</h4>
      {impact.clear ? (
        <p>{m === null ? "Nothing is in progress." : "Nothing is in progress and nothing is owed."} Deactivating only stops anything new.</p>
      ) : (
        <>
          {impact.blocked.length > 0 && (
            <div className="impact-group" data-testid="impact-blocked">
              <p>
                <b>Can&apos;t go on while it is inactive</b>, because the next step is a new document:
              </p>
              <ul>
                {impact.blocked.map((l) => (
                  <li key={l.key}>
                    <b>{l.count}</b> {l.label}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {impact.continues.length > 0 && (
            <div className="impact-group" data-testid="impact-continues">
              <p>
                <b>Stays as it is</b> (nothing is cancelled):
              </p>
              <ul>
                {impact.continues.map((l) => (
                  <li key={l.key}>
                    <b>{l.count}</b> {l.label}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {impact.openDeals > 0 && <p className="impact-line">{impact.openDeals} open {impact.openDeals === 1 ? "deal" : "deals"}, kept and readable.</p>}
          {m !== null && m.outstanding > 0 && (
            <p className="impact-money" data-testid="impact-money">
              <b>FinanceOS, as recorded (read-only):</b> <MoneyText value={m.outstanding} /> outstanding on {m.openInvoices} {m.openInvoices === 1 ? "invoice" : "invoices"}
              {m.overdue > 0 ? (
                <>
                  , of which <MoneyText value={m.overdue} /> is overdue by the recorded due dates (worked out here, not a ledger figure)
                </>
              ) : (
                ", none of it overdue"
              )}
              . Deactivating collects, changes and cancels nothing.
            </p>
          )}
        </>
      )}
    </div>
  );
}
