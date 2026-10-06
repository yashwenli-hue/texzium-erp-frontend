import Link from "next/link";
import { formatInrExact } from "../../lib/format";

/**
 * Taxable amount -> GST -> total, laid out like the foot of an invoice. The
 * figures are exactly what the backend holds; nothing is recomputed here. A
 * legacy quotation whose tax breakdown was never stored shows its total and says
 * plainly that the breakdown is unavailable, instead of showing zeros as if they
 * were real.
 */
export function CommercialSummary({
  taxableAmount,
  gstPercent,
  gstAmount,
  totalAmount,
  taxType,
  breakdownAvailable = true,
  totalLabel = "Total",
  source,
}: {
  taxableAmount?: number;
  gstPercent?: number;
  gstAmount?: number;
  totalAmount: number;
  taxType?: string;
  /** False for a legacy row whose stored tax breakdown does not add up. */
  breakdownAvailable?: boolean;
  totalLabel?: string;
  /** Where the amount comes from, e.g. a Proforma's quotation. */
  source?: { label: string; href?: string; note: string };
}) {
  const taxLabel = [gstPercent !== undefined ? `GST ${gstPercent}%` : "GST", taxType ? taxType.replace("_", " + ") : ""].filter(Boolean).join(" · ");
  return (
    <div className="summary" data-testid="commercial-summary">
      {breakdownAvailable && taxableAmount !== undefined && gstAmount !== undefined ? (
        <>
          <div className="row">
            <span className="k">Taxable amount</span>
            <span className="v" data-testid="summary-taxable">{formatInrExact(taxableAmount)}</span>
          </div>
          <div className="row">
            <span className="k">{taxLabel}</span>
            <span className="v" data-testid="summary-gst">{formatInrExact(gstAmount)}</span>
          </div>
        </>
      ) : (
        <div className="row unavailable" data-testid="summary-unavailable">
          <span className="k">Taxable amount and GST</span>
          <span className="v">Not recorded for this quotation</span>
        </div>
      )}
      <div className="row total">
        <span className="k">{totalLabel}</span>
        <span className="v" data-testid="summary-total">{formatInrExact(totalAmount)}</span>
      </div>
      {source && (
        <p className="src">
          {source.note}{" "}
          {source.href ? <Link href={source.href}>{source.label}</Link> : <b>{source.label}</b>}
        </p>
      )}
    </div>
  );
}
