import { ID, ListQuery, Page } from "../../types/common";
import { SalesOrder, SalesOrderEvent } from "../../types/domain";
import {
  ISalesOrderRepository,
  CreateSalesOrderInput,
  SalesOrderSortField,
} from "../interfaces";
import { db } from "./db";
import { CustomerConflictError, customerInactiveForMessage } from "../shared/customerLifecycle";
import { delay, applyListQuery } from "./queryUtils";
import { mockId } from "./entityStore";
import {
  isProformaExpired,
  proformaExpiredMessage,
  proformaParentQuotationNotApprovedMessage,
  proformaTotalsDifferMessage,
} from "../shared/proformaLifecycle";
import { QUOTATION_AMOUNT_TOLERANCE } from "../shared/quotationLifecycle";
import {
  SALES_ORDER_ALREADY_EXISTS_MESSAGE,
  SALES_ORDER_LIFECYCLE_STATUS,
  SALES_ORDER_PROFORMA_NOT_APPROVED_MESSAGE,
  SalesOrderConflictError,
  isLiveSalesOrder,
} from "../shared/salesOrderLifecycle";

const SEARCHABLE: (keyof SalesOrder)[] = ["salesOrderCode", "customerName", "opportunityName", "ownerName", "quoteNo"];

let orderCounter = 5210;

/**
 * Mirrors POST /sales-orders, the only way a Sales Order is created (the old
 * Quotation conversion no longer exists, in the backend or here).
 *
 * Follows the backend's rules (commit 85c3666): the order's total is the
 * approved Proforma's total (the input carries none), the Proforma must be
 * APPROVED, and only one non-cancelled Sales Order can exist per Proforma. The
 * lifecycle that follows lives in MockSalesOrderCommercialRepository.
 */
export class MockSalesOrderRepository implements ISalesOrderRepository {
  async list(query?: ListQuery<SalesOrderSortField>): Promise<Page<SalesOrder>> {
    return delay(applyListQuery(db.salesOrders.getAll(), query, SEARCHABLE));
  }

  async getById(id: ID): Promise<SalesOrder | null> {
    return delay(db.salesOrders.getById(id) ?? null);
  }

  async create(input: CreateSalesOrderInput): Promise<SalesOrder> {
    const proforma = db.proformaInvoices.getById(input.proformaInvoiceId);
    if (!proforma) throw new Error("Proforma Invoice not found.");
    if (proforma.status !== "APPROVED") throw new SalesOrderConflictError(SALES_ORDER_PROFORMA_NOT_APPROVED_MESSAGE);
    // The same extra checks as the backend (commit 1d0b1dc), in its order: the
    // Proforma must not have expired, its quotation must still be APPROVED, and
    // the two totals must agree within a paisa.
    if (proforma.validityDate && isProformaExpired(proforma.validityDate)) {
      throw new SalesOrderConflictError(proformaExpiredMessage(proforma.validityDate, "used to create a Sales Order"));
    }
    const quotation = db.quotations.getById(proforma.quotationId);
    if (quotation && quotation.status !== "APPROVED") {
      throw new SalesOrderConflictError(proformaParentQuotationNotApprovedMessage(quotation.status));
    }
    if (quotation && Math.abs(proforma.totalAmount - (quotation.totalAmount ?? quotation.amount)) > QUOTATION_AMOUNT_TOLERANCE + 1e-6) {
      throw new SalesOrderConflictError(proformaTotalsDifferMessage(proforma.totalAmount, quotation.totalAmount ?? quotation.amount));
    }
    // An opportunity with an inactive customer gets no new order (legacy, unlinked ones are unaffected).
    const owner = proforma.opportunityId ? db.opportunities.getById(proforma.opportunityId)?.customerId : undefined;
    if (owner && db.customers.getById(owner)?.isActive === false) {
      throw new CustomerConflictError(customerInactiveForMessage("Sales Order"), "CUSTOMER_INACTIVE");
    }
    // One NON-cancelled order per Proforma: a cancelled order stays in history but no longer blocks a replacement.
    if (db.salesOrders.getAll().some((o) => o.proformaInvoiceId === proforma.id && isLiveSalesOrder(o.status))) {
      throw new SalesOrderConflictError(SALES_ORDER_ALREADY_EXISTS_MESSAGE);
    }
    orderCounter += 1;
    const now = new Date().toISOString();
    const salesOrder: SalesOrder = {
      id: mockId("SO"),
      salesOrderCode: `SO-${orderCounter}`,
      orderDate: input.orderDate,
      // Never the caller's: the approved Proforma's total is authoritative.
      totalAmount: proforma.totalAmount,
      status: SALES_ORDER_LIFECYCLE_STATUS.PENDING_STORE_APPROVAL,
      proformaInvoiceId: proforma.id,
      proformaNumber: proforma.proformaNumber,
      quotationId: proforma.quotationId,
      quoteNo: proforma.quoteNo,
      opportunityId: proforma.opportunityId,
      opportunityName: proforma.opportunityName,
      customerName: proforma.customerName,
      ownerName: proforma.ownerName,
      inventoryItemId: input.inventoryItemId,
      createdAt: now,
    };
    db.salesOrders.add(salesOrder);
    return delay(salesOrder);
  }

  async listEvents(id: ID): Promise<SalesOrderEvent[]> {
    if (!db.salesOrders.getById(id)) throw new Error("Sales Order not found.");
    // Newest first; events recorded in the same millisecond keep their real order (the later one first).
    const events = db.salesOrderEvents
      .getAll()
      .map((e, index) => ({ e, index }))
      .filter(({ e }) => e.salesOrderId === id)
      .sort((a, b) => +new Date(b.e.occurredAt) - +new Date(a.e.occurredAt) || b.index - a.index)
      .map(({ e }) => e);
    return delay(events);
  }
}
