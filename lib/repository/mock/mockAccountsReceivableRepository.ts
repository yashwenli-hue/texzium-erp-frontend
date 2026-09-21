import { ID, ListQuery, Page } from "../../types/common";
import { AccountsReceivable } from "../../types/domain";
import { AccountsReceivableSortField, IAccountsReceivableRepository } from "../interfaces";
import { db } from "./db";
import { delay, applyListQuery } from "./queryUtils";

const SEARCHABLE: (keyof AccountsReceivable)[] = ["invoiceNumber", "customerName"];

/** Mirrors the real GET-only, no-detail-endpoint surface — see IAccountsReceivableRepository. */
export class MockAccountsReceivableRepository implements IAccountsReceivableRepository {
  async list(query?: ListQuery<AccountsReceivableSortField>): Promise<Page<AccountsReceivable>> {
    return delay(applyListQuery(db.accountsReceivable.getAll(), query, SEARCHABLE));
  }

  async getBySalesInvoiceId(salesInvoiceId: ID): Promise<AccountsReceivable | null> {
    const all = db.accountsReceivable.getAll();
    return delay(all.find((ar) => ar.salesInvoiceId === salesInvoiceId) ?? null);
  }
}
