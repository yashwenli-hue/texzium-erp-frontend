import { ID, ListQuery, Page } from "../../types/common";
import { SalesOrder } from "../../types/domain";
import {
  ISalesOrderRepository,
  CreateSalesOrderInput,
  SalesOrderSortField,
} from "../interfaces";
import { db } from "./db";
import { delay, applyListQuery } from "./queryUtils";
import { mockId } from "./entityStore";

const SEARCHABLE: (keyof SalesOrder)[] = ["salesOrderCode", "customerName", "opportunityName", "ownerName", "quoteNo"];

let orderCounter = 5210;

/**
 * Mirrors the direct POST /sales-orders creation path only — the other
 * verified path (Quotation conversion) is mock-modeled on
 * MockQuotationRepository.convert() instead, same split as the real
 * repositories (RealSalesOrderRepository vs RealQuotationRepository.convert()).
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
    if (!proforma) throw new Error(`Proforma invoice ${input.proformaInvoiceId} not found`);
    if (proforma.status !== "APPROVED") throw new Error("Sales Order can only be created from APPROVED Proforma Invoice");
    orderCounter += 1;
    const now = new Date().toISOString();
    const salesOrder: SalesOrder = {
      id: mockId("SO"),
      salesOrderCode: `SO-${orderCounter}`,
      orderDate: input.orderDate,
      totalAmount: input.totalAmount,
      status: "PENDING_STORE_APPROVAL",
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
}
