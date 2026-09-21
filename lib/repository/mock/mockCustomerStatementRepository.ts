import { CustomerStatement } from "../../types/domain";
import { ICustomerStatementRepository } from "../interfaces";
import { db } from "./db";
import { delay } from "./queryUtils";

/** Mirrors the real GET /customer-statements/:customerName — derives from the mock ledger only, same as the real one derives from CustomerLedger. */
export class MockCustomerStatementRepository implements ICustomerStatementRepository {
  async get(customerName: string): Promise<CustomerStatement> {
    const entries = db.customerLedger
      .getAll()
      .filter((e) => e.customerName === customerName)
      .sort((a, b) => (a.entryDate < b.entryDate ? -1 : 1));
    const openingBalance = entries.length > 0 ? entries[0].balanceAmount : 0;
    const closingBalance = entries.length > 0 ? entries[entries.length - 1].balanceAmount : 0;
    return delay({ customerName, openingBalance, closingBalance, entries });
  }
}
