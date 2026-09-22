import { ISearchRepository, SearchResults } from "../interfaces";
import { db } from "./db";
import { delay } from "./queryUtils";

/**
 * Naive client-side substring search across the mock dataset. Deliberately
 * simple: this is here to make the Search screen genuinely interactive, not
 * to model real search relevance/ranking (which the real backend may do
 * very differently — see docs/backend-ui-contract.md, item: "Search backend").
 */
export class MockSearchRepository implements ISearchRepository {
  async search(term: string): Promise<SearchResults> {
    const q = term.trim().toLowerCase();
    if (!q) {
      return delay({
        leads: [],
        customers: [],
        contacts: [],
        quotations: [],
        notes: [],
        opportunities: [],
        proformaInvoices: [],
        salesOrders: [],
        salesInvoices: [],
      });
    }
    const leads = db.leads.getAll().filter((l) =>
      [l.customerName, l.companyName ?? "", l.sourceName].some((f) => f.toLowerCase().includes(q))
    );
    const customers = db.customers.getAll().filter((c) =>
      [c.customerName, c.industry ?? "", c.city ?? ""].some((f) => f.toLowerCase().includes(q))
    );
    const contacts = db.contacts.getAll().filter((c) =>
      [c.name, c.companyName, c.title].some((f) => f.toLowerCase().includes(q))
    );
    const quotations = db.quotations.getAll().filter((qq) =>
      [qq.quoteNo, qq.customerName, qq.opportunityName].some((f) =>
        f.toLowerCase().includes(q)
      )
    );
    const notes = db.notes.getAll().filter((n) =>
      [n.text, n.linkedName].some((f) => f.toLowerCase().includes(q))
    );
    const opportunities = db.opportunities.getAll().filter((o) =>
      [o.title, o.customerName].some((f) => f.toLowerCase().includes(q))
    );
    const proformaInvoices = db.proformaInvoices.getAll().filter((p) =>
      [p.proformaNumber, p.customerName, p.quoteNo].some((f) => f.toLowerCase().includes(q))
    );
    const salesOrders = db.salesOrders.getAll().filter((so) =>
      [so.salesOrderCode, so.customerName, so.quoteNo ?? "", so.proformaNumber ?? ""].some((f) =>
        f.toLowerCase().includes(q)
      )
    );
    const salesInvoices = db.salesInvoices.getAll().filter((si) =>
      [si.invoiceNumber, si.customerName, si.salesOrderCode ?? ""].some((f) =>
        f.toLowerCase().includes(q)
      )
    );
    return delay({
      leads,
      customers,
      contacts,
      quotations,
      notes,
      opportunities,
      proformaInvoices,
      salesOrders,
      salesInvoices,
    });
  }
}
