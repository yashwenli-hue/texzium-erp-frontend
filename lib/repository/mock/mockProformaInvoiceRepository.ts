import { ID, ListQuery, Page } from "../../types/common";
import { ProformaInvoice } from "../../types/domain";
import { CreateProformaInvoiceInput, IProformaInvoiceRepository, ProformaInvoiceSortField } from "../interfaces";
import { db } from "./db";
import { delay, applyListQuery } from "./queryUtils";
import { mockId } from "./entityStore";

const SEARCHABLE: (keyof ProformaInvoice)[] = ["proformaNumber", "quoteNo", "customerName", "opportunityName", "ownerName"];

let proformaCounter = 1058;

/** Mirrors the real PENDING -> APPROVED lifecycle (only two reachable states) — see docs/backend-ui-contract.md §9. */
export class MockProformaInvoiceRepository implements IProformaInvoiceRepository {
  async list(query?: ListQuery<ProformaInvoiceSortField>): Promise<Page<ProformaInvoice>> {
    return delay(applyListQuery(db.proformaInvoices.getAll(), query, SEARCHABLE));
  }

  async getById(id: ID): Promise<ProformaInvoice | null> {
    return delay(db.proformaInvoices.getById(id) ?? null);
  }

  async create(input: CreateProformaInvoiceInput): Promise<ProformaInvoice> {
    const quotation = db.quotations.getById(input.quotationId);
    if (!quotation) throw new Error(`Quotation ${input.quotationId} not found`);
    proformaCounter += 1;
    const now = new Date().toISOString();
    const proforma: ProformaInvoice = {
      id: mockId("PF"),
      proformaNumber: `PI-${proformaCounter}`,
      quotationId: quotation.id,
      quoteNo: quotation.quoteNo,
      customerName: quotation.customerName,
      opportunityId: quotation.opportunityId,
      opportunityName: quotation.opportunityName,
      issueDate: input.issueDate,
      totalAmount: input.totalAmount,
      status: "PENDING",
      validityDate: input.validityDate ?? null,
      remarks: input.remarks,
      ownerName: quotation.ownerName,
      createdAt: now,
    };
    db.proformaInvoices.add(proforma);
    return delay(proforma);
  }

  async approve(id: ID): Promise<ProformaInvoice> {
    const updated = db.proformaInvoices.update(id, { status: "APPROVED" });
    if (!updated) throw new Error(`Proforma invoice ${id} not found`);
    return delay(updated);
  }
}
