import { ListQuery, Page, ID } from "../types/common";
import {
  Lead,
  LeadStatus,
  LeadSourceRecord,
  LeadTimelineEntry,
  LeadUIContext,
  LeadFollowup,
  AssignableUser,
  InventoryItemOption,
  GstRegistrationOption,
  Customer,
  Contact,
  Activity,
  ActivityType,
  Task,
  Note,
  Opportunity,
  OpportunityStage,
  Quotation,
  ProformaInvoice,
  SalesOrder,
  SalesInvoice,
  DispatchOrderOption,
  AccountsReceivable,
  RecordPaymentResult,
  CustomerStatement,
  PaymentLinkResult,
  ReceiptVoucher,
  SalesRevenueSummary,
  CollectionsSummary,
  CollectionsAging,
  CollectionsEfficiency,
  CollectionsRecoveryRate,
  AppNotification,
} from "../types/domain";

/**
 * ============================================================================
 * REPOSITORY INTERFACES
 * ============================================================================
 * UI components and hooks depend ONLY on these interfaces — never on the
 * mock implementation directly. When the real RevenueOS API is ready,
 * implement these same interfaces in lib/repository/real/*.ts (fetch calls
 * against the existing backend) and swap them in RepositoryProvider.
 * No component or hook should need to change.
 * ============================================================================
 */

export type LeadSortField = "customerName" | "lastActivityAt" | "createdAt";
export type CustomerSortField = "customerName" | "customerCode" | "createdAt";
export type ContactSortField = "name" | "lastContactedAt";
export type OpportunitySortField = "expectedValue" | "probability" | "expectedCloseDate";
export type QuotationSortField = "amount" | "validUntil" | "createdAt";
export type ProformaInvoiceSortField = "totalAmount" | "issueDate" | "createdAt";
export type SalesOrderSortField = "totalAmount" | "orderDate" | "createdAt";
export type SalesInvoiceSortField = "totalAmount" | "invoiceDate" | "createdAt";
export type AccountsReceivableSortField = "balanceAmount" | "dueDate" | "createdAt";
export type TaskSortField = "dueAt" | "priority" | "createdAt";

// Mirrors the VERIFIED CreateLeadDto field-for-field. No deal value, owner,
// industry or city here — those either don't exist on Lead (backend) or are
// set later through a dedicated action (Assign), not at creation.
export interface CreateLeadInput {
  customerName: string;
  companyName?: string;
  email?: string;
  phone: string;
  alternatePhone?: string;
  sourceId: ID;
  /** MOCK/UI-ONLY extras — kept structurally separate from the DTO fields above. See LeadUIContext. */
  uiContext?: LeadUIContext;
}

// Mirrors the VERIFIED UpdateLeadDto (customerName?, companyName?, email?,
// phone?, alternatePhone?, sourceId?), plus the same separated uiContext
// block used at creation.
export interface UpdateLeadInput {
  customerName?: string;
  companyName?: string;
  email?: string;
  phone?: string;
  alternatePhone?: string;
  sourceId?: string;
  uiContext?: LeadUIContext;
}

export interface ILeadRepository {
  list(query?: ListQuery<LeadSortField>): Promise<Page<Lead>>;
  getById(id: ID): Promise<Lead | null>;
  create(input: CreateLeadInput): Promise<Lead>;
  update(id: ID, input: UpdateLeadInput): Promise<Lead>;
  /** Lightweight status movement (NEW/CONTACTED) — mirrors the lead-status module. */
  updateStatus(id: ID, status: LeadStatus): Promise<Lead>;
  /** VERIFIED: AssignLeadDto { leadId, assignedToId } — writes PRE_SALES_ASSIGNED. */
  assign(id: ID, assignedToId: ID, assignedToName: string): Promise<Lead>;
  /** VERIFIED: PATCH /:id/qualify, body { salesUserId } — writes LEAD_QUALIFIED, status SALES_ASSIGNED. Gated by leads.qualify. */
  qualify(id: ID, salesUserId: ID): Promise<Lead>;
  /** VERIFIED: PATCH /:id/reject, body { reason } — writes LEAD_REJECTED. Gated by leads.reject. */
  reject(id: ID, reason: string): Promise<Lead>;
  getTimeline(leadId: ID): Promise<LeadTimelineEntry[]>;
  appendTimelineEntry(
    leadId: ID,
    entry: Omit<LeadTimelineEntry, "id" | "leadId">
  ): Promise<LeadTimelineEntry>;
}

export interface ILeadSourceRepository {
  list(): Promise<LeadSourceRecord[]>;
}

// VERIFIED CreateFollowupDto: leadId, followupDate, remarks?. See
// docs/backend-ui-contract.md §5.
export interface CreateFollowupInput {
  leadId: ID;
  followupDate: string; // ISO 8601
  remarks?: string;
}

export interface ILeadFollowupRepository {
  listByLead(leadId: ID): Promise<LeadFollowup[]>;
  create(input: CreateFollowupInput): Promise<LeadFollowup>;
  /** VERIFIED: PATCH /:id/complete — completing user comes from the auth token, not the request body. */
  complete(id: ID): Promise<LeadFollowup>;
  /** VERIFIED: PATCH /:id/reschedule, body { followupDate } — resets status back to PENDING. */
  reschedule(id: ID, followupDate: string): Promise<LeadFollowup>;
  /** VERIFIED: PATCH /:id/cancel. */
  cancel(id: ID): Promise<LeadFollowup>;
}

/**
 * Minimal user lookup backing the Assign/Qualify dropdowns. No RevenueOS-
 * scoped assignable-user endpoint is confirmed — the real implementation
 * calls the separate (unguarded) GET /users route as the least invasive
 * option; see docs/backend-ui-contract.md §21 and the Stage 2A report.
 */
export interface IUserRepository {
  listAssignable(): Promise<AssignableUser[]>;
}

// Mirrors the VERIFIED CreateCustomerDto for Customer Master.
export interface CreateCustomerInput {
  customerCode: string;
  customerName: string;
  panNumber?: string;
  email?: string;
  phone?: string;
  customerType?: string;
}

export interface ICustomerRepository {
  list(query?: ListQuery<CustomerSortField>): Promise<Page<Customer>>;
  getById(id: ID): Promise<Customer | null>;
  create(input: CreateCustomerInput): Promise<Customer>;
}

export interface CreateContactInput {
  name: string;
  title: string;
  companyName: string;
  companyId?: ID;
  type: Contact["type"];
  email: string;
  phone: string;
  ownerName: string;
}

export interface IContactRepository {
  list(query?: ListQuery<ContactSortField>): Promise<Page<Contact>>;
  create(input: CreateContactInput): Promise<Contact>;
  listByCompanyName(companyName: string): Promise<Contact[]>;
}

export interface CreateActivityInput {
  type: ActivityType;
  relatedType: Activity["relatedType"];
  relatedId: ID;
  relatedName: string;
  ownerName: string;
  note: string;
}

export interface IActivityRepository {
  list(query?: ListQuery): Promise<Page<Activity>>;
  create(input: CreateActivityInput): Promise<Activity>;
  listByRelated(relatedId: ID): Promise<Activity[]>;
}

export interface CreateTaskInput {
  title: string;
  dueAt: string | null;
  priority: Task["priority"];
  linkedType: Task["linkedType"];
  linkedId: ID;
  linkedName: string;
  assigneeName: string;
}

export interface ITaskRepository {
  list(query?: ListQuery<TaskSortField>): Promise<Page<Task>>;
  create(input: CreateTaskInput): Promise<Task>;
  setDone(id: ID, done: boolean): Promise<Task>;
}

export interface CreateNoteInput {
  text: string;
  linkedType: Note["linkedType"];
  linkedId: ID;
  linkedName: string;
  authorName: string;
  pinned?: boolean;
}

export interface UpdateNoteInput {
  text?: string;
  pinned?: boolean;
}

export interface INoteRepository {
  list(query?: ListQuery): Promise<Page<Note>>;
  create(input: CreateNoteInput): Promise<Note>;
  update(id: ID, input: UpdateNoteInput): Promise<Note>;
  listByRelated(linkedId: ID): Promise<Note[]>;
}

// Mirrors the VERIFIED CreateOpportunityDto. No customerName/stage input —
// customer is derived from the linked lead, and new opportunities always
// start at "Qualified" (a lead must already be qualified to spawn one).
export interface CreateOpportunityInput {
  leadId: ID;
  title: string;
  expectedValue: number;
  probability: number;
  expectedCloseDate: string;
}

export interface IOpportunityRepository {
  list(query?: ListQuery<OpportunitySortField>): Promise<Page<Opportunity>>;
  getById(id: ID): Promise<Opportunity | null>;
  create(input: CreateOpportunityInput): Promise<Opportunity>;
  /**
   * UI-ONLY for now: no backend PATCH route for opportunity stage is
   * confirmed yet (docs/backend-ui-contract.md §2 lists only POST/GET for
   * Opportunities). Kept mock-only so the Stage detail page and stepper are
   * ready to wire up the instant a real endpoint is confirmed.
   */
  updateStage(id: ID, stage: OpportunityStage): Promise<Opportunity>;
}

// Mirrors the VERIFIED CreateQuotationDto exactly: opportunityId, quoteDate,
// inventoryItemId, quantity, unitPrice, sellerGstId, buyerGstId. The backend
// computes taxableAmount/gstAmount/totalAmount from these — the frontend
// never sends or invents a total. customerName/opportunityName/ownerName
// are always derived from the linked opportunity. See docs/backend-ui-contract.md §8.
export interface CreateQuotationInput {
  opportunityId: ID;
  quoteDate: string; // ISO 8601
  inventoryItemId: ID;
  quantity: number;
  unitPrice: number;
  sellerGstId: ID;
  buyerGstId: ID;
}

export interface IQuotationRepository {
  list(query?: ListQuery<QuotationSortField>): Promise<Page<Quotation>>;
  getById(id: ID): Promise<Quotation | null>;
  create(input: CreateQuotationInput): Promise<Quotation>;
  /** VERIFIED: `PATCH /:id/revise`, body `{ totalAmount }` — sets REVISED. Version/history trail is mock-only. */
  revise(id: ID, amount: number, note?: string): Promise<Quotation>;
  /** VERIFIED: `PATCH /:id/approve`, no body — sets APPROVED. */
  approve(id: ID): Promise<Quotation>;
  /**
   * VERIFIED: `POST /:id/convert` — creates a real SalesOrder linked to this
   * quotation, but does NOT write CONVERTED (or any status) back onto the
   * Quotation itself; confirmed by reading quotations.service.ts directly.
   * Returns the quotation as re-fetched after conversion (its status will
   * still reflect whatever it was before, e.g. APPROVED — the honest
   * backend behavior, not a bug in this mapping) plus the id of the Sales
   * Order the backend just created, straight from its response body, so the
   * caller can navigate to it once Sales Order screens exist without
   * guessing or re-deriving the id client-side.
   */
  convert(id: ID): Promise<{ quotation: Quotation; salesOrderId: ID }>;
}

// Mirrors the VERIFIED CreateProformaInvoiceDto exactly: quotationId,
// issueDate, totalAmount, validityDate?, remarks?. totalAmount is not
// backend-computed — the caller supplies it (the UI defaults it from the
// source Quotation's own backend-computed total). See docs/backend-ui-contract.md §9.
export interface CreateProformaInvoiceInput {
  quotationId: ID;
  issueDate: string; // ISO 8601
  totalAmount: number;
  validityDate?: string;
  remarks?: string;
}

export interface IProformaInvoiceRepository {
  list(query?: ListQuery<ProformaInvoiceSortField>): Promise<Page<ProformaInvoice>>;
  getById(id: ID): Promise<ProformaInvoice | null>;
  create(input: CreateProformaInvoiceInput): Promise<ProformaInvoice>;
  /** VERIFIED: `PATCH /:id/approve`, no body — sets customerStatus to APPROVED. No other transition exists. */
  approve(id: ID): Promise<ProformaInvoice>;
}

// Mirrors the VERIFIED CreateSalesOrderDto exactly: proformaInvoiceId,
// orderDate, totalAmount, inventoryItemId, orderQty, sellerGstId,
// buyerGstId. This is the direct POST /sales-orders creation path, which
// hard-requires an APPROVED Proforma Invoice (validated server-side in
// sales-orders.service.ts, along with the inventory item and both GST
// registrations). It is independent of IQuotationRepository.convert() —
// the backend does not connect the two, so a Sales Order created this way
// is never a duplicate of one created via Quotation conversion. See the
// Stage 2E report.
export interface CreateSalesOrderInput {
  proformaInvoiceId: ID;
  orderDate: string; // ISO 8601
  totalAmount: number;
  inventoryItemId: ID;
  orderQty: number;
  sellerGstId: ID;
  buyerGstId: ID;
}

export interface ISalesOrderRepository {
  list(query?: ListQuery<SalesOrderSortField>): Promise<Page<SalesOrder>>;
  getById(id: ID): Promise<SalesOrder | null>;
  create(input: CreateSalesOrderInput): Promise<SalesOrder>;
}

// Mirrors the VERIFIED CreateSalesInvoiceDto exactly: salesOrderId,
// dispatchOrderId, invoiceDate, customerName, remarks?. This is the only
// live Sales Invoice creation path — it requires the referenced Dispatch
// Order to already be DISPATCHED (validated server-side in
// sales-invoices.service.ts). See the Stage 2F report.
export interface CreateSalesInvoiceInput {
  salesOrderId: ID;
  dispatchOrderId: ID;
  invoiceDate: string; // ISO 8601
  customerName: string;
  remarks?: string;
}

export interface ISalesInvoiceRepository {
  list(query?: ListQuery<SalesInvoiceSortField>): Promise<Page<SalesInvoice>>;
  getById(id: ID): Promise<SalesInvoice | null>;
  create(input: CreateSalesInvoiceInput): Promise<SalesInvoice>;
}

// Read-only — see DispatchOrderOption. No Dispatch Order management UI
// exists in this app; this only powers the "which DISPATCHED order should
// this invoice reference" picker on the Sales Order detail page.
export interface IDispatchOrderRepository {
  list(): Promise<DispatchOrderOption[]>;
}

// VERIFIED: GET /accounts-receivable only — no GET /:id exists, so
// getBySalesInvoiceId() list-scans, same pattern as every other "no detail
// endpoint" resource in this app. There is a separate POST
// /accounts-receivable route, but it is an independent creation path (would
// create a duplicate AR row rather than update one) — deliberately not
// exposed here; AccountsReceivable rows are only ever created as a side
// effect of Sales Invoice creation. See the Stage 2G report.
export interface IAccountsReceivableRepository {
  list(query?: ListQuery<AccountsReceivableSortField>): Promise<Page<AccountsReceivable>>;
  getBySalesInvoiceId(salesInvoiceId: ID): Promise<AccountsReceivable | null>;
}

// Mirrors the VERIFIED CreatePaymentCollectionDto exactly: salesInvoiceId,
// paymentDate, amountReceived, paymentMode, referenceNo — all required.
export interface CreatePaymentCollectionInput {
  salesInvoiceId: ID;
  paymentDate: string; // ISO 8601
  amountReceived: number;
  paymentMode: string;
  referenceNo: string;
}

// VERIFIED: POST /payment-collections only — no GET/list exists for this
// resource at all (confirmed empirically: GET /payment-collections returns
// 404). create() is therefore the repository's only method; nothing else
// is honestly offerable. See the Stage 2G report.
export interface IPaymentCollectionRepository {
  create(input: CreatePaymentCollectionInput): Promise<RecordPaymentResult>;
}

// VERIFIED: GET /customer-statements/:customerName — derives entirely from
// CustomerLedger. See CustomerStatement in lib/types/domain.ts.
export interface ICustomerStatementRepository {
  get(customerName: string): Promise<CustomerStatement>;
}

// VERIFIED: POST /payment-links/:salesInvoiceId/generate. See
// PaymentLinkResult in lib/types/domain.ts for why `mode` is read from the
// real response rather than assumed.
export interface IPaymentLinkRepository {
  generate(salesInvoiceId: ID): Promise<PaymentLinkResult>;
}

// VERIFIED: POST /receipt-vouchers/:paymentCollectionId/generate. Only
// callable with a PaymentCollection id obtained from that payment's own
// creation response — see PaymentCollectionRecord in lib/types/domain.ts.
export interface IReceiptVoucherRepository {
  generate(paymentCollectionId: ID): Promise<ReceiptVoucher>;
}

// VERIFIED: GET /sales-reports/revenue-summary only. The sales-reports
// controller exposes many more endpoints (funnel, customer-revenue,
// lead-conversion, quotation-conversion, lost-opportunities,
// salesperson-performance, product/HSN/category reports) — deliberately not
// exposed here. Each was investigated and found unsuitable to surface as
// authoritative analytics as-is (naive ratios, an always-empty list, a
// mislabeled/duplicate metric); see the Stage 2I report.
export interface ISalesReportsRepository {
  revenueSummary(): Promise<SalesRevenueSummary>;
}

// VERIFIED: GET /collections-dashboard/{summary,aging,efficiency,recovery-rate}.
// `high-risk` and `customer-ranking` also exist on this controller but are
// deliberately not exposed here — customer-ranking sums a running
// CustomerLedger balance column and produces mathematically misleading
// totals (confirmed empirically); see the Stage 2I report.
export interface ICollectionsDashboardRepository {
  summary(): Promise<CollectionsSummary>;
  aging(): Promise<CollectionsAging>;
  efficiency(): Promise<CollectionsEfficiency>;
  recoveryRate(): Promise<CollectionsRecoveryRate>;
}

export interface IInventoryItemRepository {
  list(): Promise<InventoryItemOption[]>;
}

export interface ISellerGstRepository {
  list(): Promise<GstRegistrationOption[]>;
}

export interface IBuyerGstRepository {
  list(): Promise<GstRegistrationOption[]>;
}

export interface INotificationRepository {
  list(): Promise<AppNotification[]>;
  markRead(id: ID): Promise<void>;
  markAllRead(): Promise<void>;
  unreadCount(): Promise<number>;
}

export interface SearchResults {
  leads: Lead[];
  customers: Customer[];
  contacts: Contact[];
  quotations: Quotation[];
  notes: Note[];
  opportunities: Opportunity[];
  salesOrders: SalesOrder[];
  salesInvoices: SalesInvoice[];
}

// The real implementation aggregates already-real list() calls across the
// entities RevenueOS itself owns (Leads, Customers, Quotations,
// Opportunities, Sales Orders, Sales Invoices) — no dedicated backend search
// endpoint exists (confirmed: nothing resembling a search controller/route
// anywhere in the backend). Contacts and Notes have no backend counterpart
// at all, so the real repository always returns them empty rather than
// silently backing them with mock/fixture data.
export interface ISearchRepository {
  search(term: string): Promise<SearchResults>;
}

/** The full set of repositories the app needs. Provided via RepositoryProvider. */
export interface RevenueOSRepository {
  /** Which implementation is wired up — lets the few UI spots with a genuine backend
   * capability gap (note creation, activity logging) adapt honestly instead of
   * pretending they work the same way against the real API as they do against the mock. */
  kind: "mock" | "real";
  leads: ILeadRepository;
  leadSources: ILeadSourceRepository;
  leadFollowups: ILeadFollowupRepository;
  users: IUserRepository;
  customers: ICustomerRepository;
  contacts: IContactRepository;
  activities: IActivityRepository;
  tasks: ITaskRepository;
  notes: INoteRepository;
  opportunities: IOpportunityRepository;
  quotations: IQuotationRepository;
  proformaInvoices: IProformaInvoiceRepository;
  salesOrders: ISalesOrderRepository;
  salesInvoices: ISalesInvoiceRepository;
  dispatchOrders: IDispatchOrderRepository;
  accountsReceivable: IAccountsReceivableRepository;
  paymentCollections: IPaymentCollectionRepository;
  customerStatements: ICustomerStatementRepository;
  paymentLinks: IPaymentLinkRepository;
  receiptVouchers: IReceiptVoucherRepository;
  salesReports: ISalesReportsRepository;
  collectionsDashboard: ICollectionsDashboardRepository;
  inventoryItems: IInventoryItemRepository;
  sellerGstRegistrations: ISellerGstRepository;
  buyerGstRegistrations: IBuyerGstRepository;
  notifications: INotificationRepository;
  search: ISearchRepository;
}
