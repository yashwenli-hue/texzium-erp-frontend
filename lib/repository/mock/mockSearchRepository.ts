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
      return delay({ leads: [], customers: [], contacts: [], quotations: [], notes: [] });
    }
    const leads = db.leads.getAll().filter((l) =>
      [l.customerName, l.companyName ?? "", l.sourceName].some((f) => f.toLowerCase().includes(q))
    );
    const customers = db.customers.getAll().filter((c) =>
      [c.name, c.industry, c.city].some((f) => f.toLowerCase().includes(q))
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
    return delay({ leads, customers, contacts, quotations, notes });
  }
}
