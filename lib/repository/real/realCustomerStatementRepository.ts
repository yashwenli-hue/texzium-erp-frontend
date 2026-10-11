import { ID } from "../../types/common";
import { CustomerStatement, StatementPeriod } from "../../types/domain";
import { ICustomerStatementRepository } from "../interfaces";
import { apiDownload, apiFetch, DownloadedFile } from "../../api/httpClient";
import { BackendCustomerStatement, mapCustomerStatement } from "./mappers";

/** "?from=…&to=…" for the set ends only (calendar days, YYYY-MM-DD). */
export function statementQuery(period?: StatementPeriod): string {
  const params = new URLSearchParams();
  if (period?.from) params.set("from", period.from);
  if (period?.to) params.set("to", period.to);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/**
 * VERIFIED: GET /customers/:id/statement and GET /customers/:id/statement.pdf
 * (collections.view). The customer is identified by id; the backend finds its ledger
 * rows by id, never by name. The PDF is built in memory and streamed.
 */
export class RealCustomerStatementRepository implements ICustomerStatementRepository {
  async get(customerId: ID, period?: StatementPeriod): Promise<CustomerStatement> {
    const raw = await apiFetch<BackendCustomerStatement>(`/customers/${encodeURIComponent(customerId)}/statement${statementQuery(period)}`);
    return mapCustomerStatement(raw);
  }

  downloadPdf(customerId: ID, period?: StatementPeriod): Promise<DownloadedFile> {
    return apiDownload(`/customers/${encodeURIComponent(customerId)}/statement.pdf${statementQuery(period)}`, "application/pdf", "statement.pdf");
  }
}
