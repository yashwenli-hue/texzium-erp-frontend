import { EntityStore } from "./entityStore";
import {
  Lead,
  LeadTimelineEntry,
  LeadSourceRecord,
  LeadFollowup,
  Customer,
  CustomerEvent,
  Contact,
  Activity,
  Task,
  Note,
  Opportunity,
  Quotation,
  QuotationEvent,
  ProformaInvoice,
  ProformaEvent,
  SalesOrder,
  SalesOrderEvent,
  SalesOrderPaymentTerm,
  SalesOrderAdvanceReceipt,
  SalesOrderCommercialApproval,
  SalesInvoice,
  DispatchOrderOption,
  AccountsReceivable,
  PaymentCollectionRecord,
  PaymentCollectionEvent,
  CustomerStatementEntry,
  AppNotification,
} from "../../types/domain";
import {
  SEED_LEADS,
  SEED_LEAD_TIMELINE,
  SEED_LEAD_SOURCES,
  SEED_CUSTOMERS,
  SEED_CUSTOMER_EVENTS,
  SEED_CONTACTS,
  SEED_ACTIVITIES,
  SEED_TASKS,
  SEED_NOTES,
  SEED_OPPORTUNITIES,
  SEED_QUOTATIONS,
  SEED_QUOTATION_EVENTS,
  SEED_PROFORMA_INVOICES,
  SEED_PROFORMA_EVENTS,
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
  // Customer history (in memory only, like every other mock table: the real backend owns it).
  customerEvents: new EntityStore<CustomerEvent>(SEED_CUSTOMER_EVENTS),
  contacts: new EntityStore<Contact>(SEED_CONTACTS),
  activities: new EntityStore<Activity>(SEED_ACTIVITIES),
  tasks: new EntityStore<Task>(SEED_TASKS),
  notes: new EntityStore<Note>(SEED_NOTES),
  // Like every other mock table, opportunities reset on refresh. Stage is no
  // longer kept in the browser: the real backend owns it (see
  // lib/repository/shared/opportunityStage.ts for the rules the mock follows).
  opportunities: new EntityStore<Opportunity>(SEED_OPPORTUNITIES),
  quotations: new EntityStore<Quotation>(SEED_QUOTATIONS),
  // Quotation and Proforma lifecycle history (in memory only, like every other
  // mock table: the real backend owns it).
  quotationEvents: new EntityStore<QuotationEvent>(SEED_QUOTATION_EVENTS),
  proformaInvoices: new EntityStore<ProformaInvoice>(SEED_PROFORMA_INVOICES),
  proformaEvents: new EntityStore<ProformaEvent>(SEED_PROFORMA_EVENTS),
  salesOrders: new EntityStore<SalesOrder>(SEED_SALES_ORDERS),
  // The Sales Order commercial workflow (payment terms, advance receipts,
  // accounts approvals) and its lifecycle history. In memory only, like every
  // other mock table: nothing about an order's lifecycle is kept in the browser.
  salesOrderPaymentTerms: new EntityStore<SalesOrderPaymentTerm>([]),
  salesOrderAdvanceReceipts: new EntityStore<SalesOrderAdvanceReceipt>([]),
  salesOrderApprovals: new EntityStore<SalesOrderCommercialApproval>([]),
  salesOrderEvents: new EntityStore<SalesOrderEvent>([]),
  salesInvoices: new EntityStore<SalesInvoice>(SEED_SALES_INVOICES),
  dispatchOrders: new EntityStore<DispatchOrderOption>(SEED_DISPATCH_ORDERS),
  accountsReceivable: new EntityStore<AccountsReceivable>(SEED_ACCOUNTS_RECEIVABLE),
  // Mirrors the real backend: a collection, and the event that records it, are
  // written together by MockPaymentCollectionRepository.create().
  paymentCollections: new EntityStore<PaymentCollectionRecord>([]),
  paymentCollectionEvents: new EntityStore<PaymentCollectionEvent>([]),
  customerLedger: new EntityStore<CustomerStatementEntry>(SEED_CUSTOMER_LEDGER),
  notifications: new EntityStore<AppNotification>(SEED_NOTIFICATIONS),
};
