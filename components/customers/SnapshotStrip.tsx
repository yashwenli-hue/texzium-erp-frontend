import { MoneyText } from "../ui/MoneyText";
import type { Snapshot } from "../../lib/repository/shared/customerCockpit";

const n = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/**
 * What this customer has been and is worth, in six numbers: the open pipeline, then
 * what was quoted (approved), ordered, invoiced, collected and what is still
 * outstanding, with the overdue part called out. It is only shown for a customer
 * that has deals: a row of zeros tells nobody anything. Amounts are compact with the
 * exact figure on demand (MoneyText). The note says which numbers are recorded facts
 * and which are worked out here, so nothing derived passes for a ledger figure.
 */
export function SnapshotStrip({ snapshot }: { snapshot: Snapshot }) {
  if (!snapshot.hasData) return null;
  const s = snapshot;
  const allTiles = [
    { key: "pipeline", k: "Open pipeline", v: s.pipelineValue, note: n(s.openDeals, "open deal", "open deals") },
    { key: "quoted", k: "Quoted", v: s.quoted, note: `${n(s.counts.quotations, "quotation", "quotations")}, approved ones` },
    { key: "ordered", k: "Ordered", v: s.ordered, note: n(s.counts.salesOrders, "order", "orders") },
    { key: "invoiced", k: "Invoiced", v: s.invoiced, note: n(s.counts.invoices, "invoice", "invoices") },
    { key: "collected", k: "Collected", v: s.collected, note: "received" },
    { key: "outstanding", k: "Outstanding", v: s.outstanding, note: s.overdue > 0 ? `${s.overdueCount} overdue` : "nothing overdue", bad: s.overdue > 0 },
  ];
  // Collected and outstanding are collections data: without collections.view they are not shown, not shown as zero.
  const tiles = s.collections ? allTiles : allTiles.filter((t) => t.key !== "collected" && t.key !== "outstanding");
  return (
    <section className={`snapshot ${tiles.length === 4 ? "snap-4" : ""}`.trim()} aria-label="Commercial snapshot" data-testid="snapshot">
      <ul>
        {tiles.map((t) => (
          <li key={t.key} className={t.bad ? "snap-bad" : undefined} data-tile={t.key}>
            <span className="k">{t.k}</span>
            <span className="v">
              <MoneyText value={t.v} />
            </span>
            <span className="n">
              {t.bad && s.overdue > 0 ? (
                <>
                  <MoneyText value={s.overdue} /> overdue
                </>
              ) : (
                t.note
              )}
            </span>
          </li>
        ))}
      </ul>
      <p className="snap-note">
        {s.collections
          ? "Quoted, ordered, invoiced, collected and outstanding are as recorded (invoices and receivables by FinanceOS). Pipeline and overdue are worked out here from recorded values. Each figure counts its own stage: a quotation that became an order is in both, so they are not added together, and overdue is part of outstanding, not on top of it."
          : "Quoted, ordered and invoiced are as recorded. The pipeline is worked out here from recorded values. Each figure counts its own stage: a quotation that became an order is in both, so they are not added together."}
      </p>
    </section>
  );
}
