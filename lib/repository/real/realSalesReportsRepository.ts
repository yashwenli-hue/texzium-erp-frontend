import { SalesRevenueSummary } from "../../types/domain";
import { ISalesReportsRepository } from "../interfaces";
import { apiFetch } from "../../api/httpClient";
import { BackendSalesRevenueSummary, mapSalesRevenueSummary } from "./mappers";

/**
 * VERIFIED: `GET /sales-reports/revenue-summary` only — see
 * ISalesReportsRepository for why the controller's other endpoints
 * (funnel, customer-revenue, lead-conversion, quotation-conversion,
 * lost-opportunities, salesperson-performance, product/HSN/category
 * reports) are deliberately not exposed here. No date-range parameter
 * exists — this sums every SalesInvoice, all-time. No guard.
 */
export class RealSalesReportsRepository implements ISalesReportsRepository {
  async revenueSummary(): Promise<SalesRevenueSummary> {
    const raw = await apiFetch<BackendSalesRevenueSummary>("/sales-reports/revenue-summary");
    return mapSalesRevenueSummary(raw);
  }
}
