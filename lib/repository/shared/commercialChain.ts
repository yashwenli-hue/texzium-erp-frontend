import { ProformaInvoice, Quotation, SalesOrder } from "../../types/domain";
import { isActiveProforma } from "./proformaLifecycle";
import { isLiveSalesOrder } from "./salesOrderLifecycle";

/**
 * Quotation -> Proforma Invoice -> Sales Order, read from the documents
 * themselves. This is the backend's own definition of what blocks a revision
 * (CP1): an ACTIVE Proforma is one that is not cancelled, a blocking Sales Order
 * is one that is not cancelled and was created directly from the quotation or
 * through one of its Proformas.
 */
export interface CommercialChain {
  /** Every Proforma of the quotation, newest first (cancelled ones are history). */
  proformas: ProformaInvoice[];
  activeProforma?: ProformaInvoice;
  /** Every Sales Order reachable from the quotation, newest first. */
  orders: SalesOrder[];
  liveOrders: SalesOrder[];
}

const newestFirst = <T extends { createdAt: string }>(a: T, b: T) => +new Date(b.createdAt) - +new Date(a.createdAt);

export function buildCommercialChain(quotationId: string, proformas: ProformaInvoice[], orders: SalesOrder[]): CommercialChain {
  const mine = proformas.filter((p) => p.quotationId === quotationId).sort(newestFirst);
  const mineIds = new Set(mine.map((p) => p.id));
  const reachable = orders
    .filter((o) => o.quotationId === quotationId || (o.proformaInvoiceId && mineIds.has(o.proformaInvoiceId)))
    .sort(newestFirst);
  return {
    proformas: mine,
    activeProforma: mine.find(isActiveProforma),
    orders: reachable,
    liveOrders: reachable.filter((o) => isLiveSalesOrder(o.status)),
  };
}

export type NextStepTone = "neutral" | "action" | "good" | "warn" | "bad";

export interface NextStep {
  label: string;
  tone: NextStepTone;
}

/** The one-line "what happens next" shown in the quotations list. */
export function quotationNextStep(q: Pick<Quotation, "status">, chain: CommercialChain): NextStep {
  switch (q.status) {
    case "DRAFT":
      return { label: "Needs approval", tone: "action" };
    case "REVISED":
      return { label: "Revised — needs re-approval", tone: "action" };
    case "REJECTED":
      return { label: "Closed — rejected", tone: "neutral" };
    case "APPROVED": {
      if (chain.liveOrders.length > 0) return { label: `Sales Order ${chain.liveOrders[0].salesOrderCode}`, tone: "good" };
      if (chain.activeProforma) {
        const p = chain.activeProforma;
        if (p.isExpired) return { label: "Proforma expired", tone: "bad" };
        return p.status === "APPROVED" ? { label: "Proforma approved — create order", tone: "action" } : { label: "Proforma awaiting approval", tone: "warn" };
      }
      return { label: "Ready for a Proforma", tone: "action" };
    }
    default:
      return { label: "—", tone: "neutral" };
  }
}

/** The one-line "what happens next" shown in the Proforma list. */
export function proformaNextStep(p: Pick<ProformaInvoice, "status" | "isExpired">, liveOrders: SalesOrder[]): NextStep {
  if (p.status === "CANCELLED") return { label: "Closed — cancelled", tone: "neutral" };
  if (liveOrders.length > 0) return { label: `Sales Order ${liveOrders[0].salesOrderCode}`, tone: "good" };
  if (p.isExpired) return { label: p.status === "APPROVED" ? "Expired — can't create an order" : "Expired — can't be approved", tone: "bad" };
  return p.status === "APPROVED" ? { label: "Ready for a Sales Order", tone: "action" } : { label: "Awaiting approval", tone: "warn" };
}
