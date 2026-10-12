"use client";

import { DocumentLine } from "../../lib/types/domain";
import { formatInrExact } from "../../lib/format";

/**
 * The priced lines of a quotation, Proforma Invoice or invoice, exactly as the
 * backend stored them (it works out every amount). A record stored before
 * lines existed has none and says so.
 */
export function DocumentLinesPanel({ title = "Line items", lines, emptyText }: { title?: string; lines: DocumentLine[] | undefined; emptyText: string }) {
  const rows = lines ?? [];
  return (
    <section className="card panel" aria-label={title} data-testid="document-lines">
      <div className="panel-head">
        <h3>{title}</h3>
      </div>
      {rows.length === 0 ? (
        <p className="pay-empty" style={{ padding: "0 21px 16px" }}>
          {emptyText}
        </p>
      ) : (
        <div className="table-scroll ledger-table">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Description</th>
                <th>HSN</th>
                <th className="r">Qty</th>
                <th className="r">Rate</th>
                <th className="r">Taxable</th>
                <th className="r">GST</th>
                <th className="r">Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l.lineNumber}>
                  <td data-label="#">{l.lineNumber}</td>
                  <td data-label="Description">{l.description}</td>
                  <td data-label="HSN">{l.hsnCode ?? "—"}</td>
                  <td data-label="Qty" className="r">{l.quantity}</td>
                  <td data-label="Rate" className="r">{formatInrExact(l.unitRate)}</td>
                  <td data-label="Taxable" className="r">{formatInrExact(l.taxableAmount)}</td>
                  <td data-label="GST" className="r">
                    {formatInrExact(l.gstAmount)}
                    {l.gstRate !== undefined ? ` (${l.gstRate}%)` : ""}
                  </td>
                  <td data-label="Amount" className="r">{formatInrExact(l.totalAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
