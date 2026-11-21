import { ID } from "../../types/common";
import { LeadQuotationSummary, QuotationProgress } from "../../types/domain";
import { ILeadQuotationRepository } from "../interfaces";
import { db } from "./db";
import { delay } from "./queryUtils";

const LABEL: Record<QuotationProgress, string> = {
  IN_PREPARATION: "Being prepared",
  APPROVED: "Approved, ready for the customer",
  PROFORMA_ISSUED: "Proforma issued to the customer",
  CUSTOMER_ACCEPTED: "Customer accepted",
  ORDER_PLACED: "Order placed",
  REJECTED: "Rejected",
};

/**
 * MOCK (Phase A): the mock quotations of a lead's opportunities, stripped of prices
 * the way GET /leads/:id/quotations returns them.
 */
export class MockLeadQuotationRepository implements ILeadQuotationRepository {
  async listForLead(leadId: ID): Promise<LeadQuotationSummary[]> {
    const opps = db.opportunities.getAll().filter((o) => o.leadId === leadId);
    const oppIds = new Set(opps.map((o) => o.id));
    const rows = db.quotations
      .getAll()
      .filter((q) => q.opportunityId && oppIds.has(q.opportunityId))
      .map((q): LeadQuotationSummary => {
        const proformas = db.proformaInvoices.getAll().filter((p) => p.quotationId === q.id);
        const orders = db.salesOrders
          .getAll()
          .filter((o) => o.quotationId === q.id || proformas.some((p) => p.id === o.proformaInvoiceId));
        const liveOrder = orders.find((o) => o.status !== "CANCELLED");
        const liveProforma = proformas.find((p) => p.status !== "CANCELLED");
        const progress: QuotationProgress =
          q.status === "REJECTED" ? "REJECTED"
            : liveOrder ? "ORDER_PLACED"
            : proformas.some((p) => p.status === "APPROVED") ? "CUSTOMER_ACCEPTED"
            : liveProforma ? "PROFORMA_ISSUED"
            : q.status === "APPROVED" ? "APPROVED"
            : "IN_PREPARATION";
        return {
          id: q.id,
          quotationCode: q.numbered ? q.quoteNo : null,
          quoteDate: q.quoteDate ?? q.createdAt,
          status: q.status,
          progress,
          progressLabel: LABEL[progress],
          opportunity: { id: q.opportunityId!, title: q.opportunityName },
          lines: (q.lines ?? []).map((l) => ({ lineNumber: l.lineNumber, description: l.description, quantity: l.quantity })),
          proforma: liveProforma ? { number: liveProforma.proformaNumber, issueDate: liveProforma.issueDate ?? liveProforma.createdAt } : null,
          order: liveOrder ? { code: liveOrder.salesOrderCode, orderDate: liveOrder.orderDate ?? liveOrder.createdAt } : null,
          createdAt: q.createdAt,
          updatedAt: q.createdAt,
        };
      });
    return delay(rows);
  }
}
