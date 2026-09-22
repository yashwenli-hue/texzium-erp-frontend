import {
  ICustomerRepository,
  ILeadRepository,
  IOpportunityRepository,
  IQuotationRepository,
  ISalesInvoiceRepository,
  ISalesOrderRepository,
  ISearchRepository,
  SearchResults,
} from "../interfaces";

/**
 * No dedicated backend search endpoint exists (confirmed: nothing resembling
 * a search controller/route anywhere in the backend), so this aggregates
 * already-real list() calls from the entities RevenueOS itself owns instead
 * of inventing one. Each dependency is an already-instantiated real
 * repository (see realRepository.ts) so this reuses the exact same fetch/
 * mapping logic — and therefore the exact same data — as each entity's own
 * list page. Naive substring matching, same approach as the mock
 * implementation; this is not meant to model real search relevance/ranking.
 *
 * Contacts and Notes have no backend counterpart at all (confirmed) — they
 * always come back empty here rather than being silently backed by mock/
 * fixture data the way the old MockSearchRepository-in-real-mode wiring did.
 */
export class RealSearchRepository implements ISearchRepository {
  constructor(
    private leads: ILeadRepository,
    private customers: ICustomerRepository,
    private quotations: IQuotationRepository,
    private opportunities: IOpportunityRepository,
    private salesOrders: ISalesOrderRepository,
    private salesInvoices: ISalesInvoiceRepository
  ) {}

  async search(term: string): Promise<SearchResults> {
    const empty: SearchResults = {
      leads: [],
      customers: [],
      contacts: [],
      quotations: [],
      notes: [],
      opportunities: [],
      salesOrders: [],
      salesInvoices: [],
    };
    const q = term.trim().toLowerCase();
    if (!q) return empty;

    const matches = (fields: (string | undefined)[]) =>
      fields.some((f) => (f ?? "").toLowerCase().includes(q));

    const [leadsPage, customersPage, quotationsPage, opportunitiesPage, salesOrdersPage, salesInvoicesPage] =
      await Promise.all([
        this.leads.list(),
        this.customers.list(),
        this.quotations.list(),
        this.opportunities.list(),
        this.salesOrders.list(),
        this.salesInvoices.list(),
      ]);

    return {
      leads: leadsPage.items.filter((l) => matches([l.customerName, l.companyName, l.sourceName])),
      customers: customersPage.items.filter((c) => matches([c.customerName, c.customerCode, c.email, c.phone])),
      contacts: [],
      quotations: quotationsPage.items.filter((q2) => matches([q2.quoteNo, q2.customerName, q2.opportunityName])),
      notes: [],
      opportunities: opportunitiesPage.items.filter((o) => matches([o.title, o.customerName])),
      salesOrders: salesOrdersPage.items.filter((so) =>
        matches([so.salesOrderCode, so.customerName, so.quoteNo, so.proformaNumber])
      ),
      salesInvoices: salesInvoicesPage.items.filter((si) =>
        matches([si.invoiceNumber, si.customerName, si.salesOrderCode])
      ),
    };
  }
}
