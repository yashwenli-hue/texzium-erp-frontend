import { EntityStore } from "./entityStore";
import {
  Lead,
  LeadTimelineEntry,
  LeadSourceRecord,
  LeadFollowup,
  Customer,
  Contact,
  Activity,
  Task,
  Note,
  Opportunity,
  Quotation,
  ProformaInvoice,
  SalesOrder,
  SalesInvoice,
  DispatchOrderOption,
  AccountsReceivable,
  PaymentCollectionRecord,
  CustomerStatementEntry,
  AppNotification,
} from "../../types/domain";
import {
  SEED_LEADS,
  SEED_LEAD_TIMELINE,
  SEED_LEAD_SOURCES,
  SEED_CUSTOMERS,
  SEED_CONTACTS,
  SEED_ACTIVITIES,
  SEED_TASKS,
  SEED_NOTES,
  SEED_OPPORTUNITIES,
  SEED_QUOTATIONS,
  SEED_PROFORMA_INVOICES,
  SEED_SALES_ORDERS,
  SEED_SALES_INVOICES,
  SEED_DISPATCH_ORDERS,
  SEED_ACCOUNTS_RECEIVABLE,
  SEED_CUSTOMER_LEDGER,
  SEED_NOTIFICATIONS,
} from "./seed";

/**
 * Singleton mock database for the lifetime of the browser tab. This is
 * module-level state, which is safe here because:
 *   1. This module is only ever imported on the client (see
 *      RepositoryProvider's "use client" boundary), and
 *   2. It exists purely to pressure-test the UI — it is explicitly NOT
 *      meant to survive a refresh or be treated as real persistence.
 *
 * When the real backend is wired in, this entire file (and everything else
 * under lib/repository/mock/) is deleted; nothing outside this folder
 * imports from here directly except the mock repository classes.
 */
export const db = {
  leads: new EntityStore<Lead>(SEED_LEADS),
  leadTimeline: new EntityStore<LeadTimelineEntry>(SEED_LEAD_TIMELINE),
  leadSources: new EntityStore<LeadSourceRecord>(SEED_LEAD_SOURCES),
  leadFollowups: new EntityStore<LeadFollowup>([]),
  customers: new EntityStore<Customer>(SEED_CUSTOMERS),
  contacts: new EntityStore<Contact>(SEED_CONTACTS),
  activities: new EntityStore<Activity>(SEED_ACTIVITIES),
  tasks: new EntityStore<Task>(SEED_TASKS),
  notes: new EntityStore<Note>(SEED_NOTES),
  // storageKey enabled here only: the design review specifically calls out
  // Opportunity pipeline stage needing to survive a refresh. Other stores
  // intentionally keep the original "resets on refresh" mock behavior.
  opportunities: new EntityStore<Opportunity>(SEED_OPPORTUNITIES, "revenueos.mock.opportunities"),
  quotations: new EntityStore<Quotation>(SEED_QUOTATIONS),
  proformaInvoices: new EntityStore<ProformaInvoice>(SEED_PROFORMA_INVOICES),
  salesOrders: new EntityStore<SalesOrder>(SEED_SALES_ORDERS),
  salesInvoices: new EntityStore<SalesInvoice>(SEED_SALES_INVOICES),
  dispatchOrders: new EntityStore<DispatchOrderOption>(SEED_DISPATCH_ORDERS),
  accountsReceivable: new EntityStore<AccountsReceivable>(SEED_ACCOUNTS_RECEIVABLE),
  // Mirrors the real backend: these rows exist once created, but no
  // repository interface ever lists them (no GET /payment-collections on
  // the real API) — kept as an EntityStore purely as the mock's equivalent
  // of "a row in a table nothing reads back", so receipt-voucher generation
  // can still look one up by id immediately after creation.
  paymentCollections: new EntityStore<PaymentCollectionRecord>([]),
  customerLedger: new EntityStore<CustomerStatementEntry>(SEED_CUSTOMER_LEDGER),
  notifications: new EntityStore<AppNotification>(SEED_NOTIFICATIONS),
};
