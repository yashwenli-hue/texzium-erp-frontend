import { ID, ListQuery, Page } from "../../types/common";
import { AccountsReceivable } from "../../types/domain";
import { AccountsReceivableSortField, IAccountsReceivableRepository } from "../interfaces";
import { apiFetch } from "../../api/httpClient";
import { applyListQuery } from "../shared/listQuery";
import { BackendAccountsReceivable, mapAccountsReceivable } from "./mappers";

const SEARCHABLE: (keyof AccountsReceivable)[] = ["invoiceNumber", "customerName"];

/**
 * VERIFIED: `GET /accounts-receivable` only — no `GET /:id`. A separate
 * `POST /accounts-receivable` exists but is deliberately not exposed here
 * (see IAccountsReceivableRepository) since it's an independent creation
 * path that would create a duplicate AR row; every real AR row already
 * comes into existence as a side effect of Sales Invoice creation.
 *
 * SECURITY NOTE (not fixed — backend is read-only): no `@UseGuards` on this
 * controller at all, same as every other Quote-to-Cash controller.
 * Confirmed by reading accounts-receivable.controller.ts directly.
 */
export class RealAccountsReceivableRepository implements IAccountsReceivableRepository {
  private async fetchAll(): Promise<AccountsReceivable[]> {
    const rows = await apiFetch<BackendAccountsReceivable[]>("/accounts-receivable");
    return rows.map(mapAccountsReceivable);
  }

  async list(query?: ListQuery<AccountsReceivableSortField>): Promise<Page<AccountsReceivable>> {
    const all = await this.fetchAll();
    return applyListQuery(all, query, SEARCHABLE);
  }

  async getBySalesInvoiceId(salesInvoiceId: ID): Promise<AccountsReceivable | null> {
    const all = await this.fetchAll();
    return all.find((ar) => ar.salesInvoiceId === salesInvoiceId) ?? null;
  }
}
