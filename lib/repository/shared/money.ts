import { formatInr, formatInrExact } from "../../format";

/**
 * How the Customer screens write money. One rule: where you scan (the snapshot,
 * a deal's chain, an attention item) the amount is compact, "₹2.5 L" and
 * "₹1.1 Cr", and the exact figure is one hover or one screen-reader word away
 * (MoneyText); where the figure is the point (a document's own page, the list of
 * documents under a deal) it is exact, "₹2,95,000.00". Negative amounts keep their
 * sign (a receivable can be negative once over-paid).
 */
export function formatCompactInr(amount: number): string {
  return amount < 0 ? `−${formatInr(-amount)}` : formatInr(amount);
}

export function formatExactInr(amount: number): string {
  return amount < 0 ? `−${formatInrExact(-amount)}` : formatInrExact(amount);
}
