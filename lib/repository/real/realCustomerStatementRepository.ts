import { CustomerStatement } from "../../types/domain";
import { ICustomerStatementRepository } from "../interfaces";
import { apiFetch } from "../../api/httpClient";
import { BackendCustomerStatement, mapCustomerStatement } from "./mappers";

/**
 * VERIFIED: `GET /customer-statements/:customerName` — derives entirely
 * from CustomerLedger rows for that exact customer name string. No guard.
 */
export class RealCustomerStatementRepository implements ICustomerStatementRepository {
  async get(customerName: string): Promise<CustomerStatement> {
    const raw = await apiFetch<BackendCustomerStatement>(`/customer-statements/${encodeURIComponent(customerName)}`);
    return mapCustomerStatement(raw);
  }
}
