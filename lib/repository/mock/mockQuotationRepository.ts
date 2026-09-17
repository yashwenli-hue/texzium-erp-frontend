import { ListQuery, Page } from "../../types/common";
import { Quotation } from "../../types/domain";
import {
  IQuotationRepository,
  CreateQuotationInput,
  QuotationSortField,
} from "../interfaces";
import { db } from "./db";
import { delay, applyListQuery } from "./queryUtils";
import { mockId } from "./entityStore";

const SEARCHABLE: (keyof Quotation)[] = ["quoteNo", "customerName", "opportunityName", "ownerName"];

let quoteCounter = 3420;

export class MockQuotationRepository implements IQuotationRepository {
  async list(query?: ListQuery<QuotationSortField>): Promise<Page<Quotation>> {
    return delay(applyListQuery(db.quotations.getAll(), query, SEARCHABLE));
  }

  async create(input: CreateQuotationInput): Promise<Quotation> {
    quoteCounter += 1;
    const quotation: Quotation = {
      id: mockId("Q"),
      quoteNo: `QT-${quoteCounter}`,
      ...input,
      createdAt: new Date().toISOString(),
    };
    db.quotations.add(quotation);
    return delay(quotation);
  }
}
