import { ListQuery, Page, ID } from "../types/common";
import {
  Lead,
  LeadStatus,
  LeadSourceRecord,
  LeadTimelineEntry,
  LeadActivityType,
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
  QuotationEvent,
  ProformaInvoice,
  ProformaEvent,
  SalesOrder,
  SalesOrderEvent,
  SalesOrderPaymentTerm,
  SalesOrderAdvanceReceipt,
  SalesOrderCommercialApproval,
  AdvanceReceiptOutcome,
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
  CustomerEvent,
  CustomerGstRegistration,
  CustomerDuplicateCheck,
  CustomerOverview,
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
export type QuotationSortField = "amount" | "createdAt";
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

// Mirrors the VERIFIED CreateLeadActivityDto { activityType, remarks, occurredAt? }.
export interface LogLeadActivityInput {
  activityType: LeadActivityType;
  remarks: string;
  /** ISO 8601. Omit for "now"; may be in the past, never the future. */
  occurredAt?: string;
}

export interface LeadListOptions {
  /** Include deactivated leads. Off by default: inactive leads stay out of normal lists. */
  includeInactive?: boolean;
}

export interface ILeadRepository {
  list(query?: ListQuery<LeadSortField>, options?: LeadListOptions): Promise<Page<Lead>>;
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
  /** System lifecycle events and employee activity together, newest first (by occurredAt). */
  getTimeline(leadId: ID): Promise<LeadTimelineEntry[]>;
  /**
   * VERIFIED: POST /leads/:id/activities (leads.edit). Records employee sales
   * activity without changing the lead's status. The actor is the signed-in
   * user, set by the backend — never sent from here.
   */
  logActivity(leadId: ID, input: LogLeadActivityInput): Promise<LeadTimelineEntry>;
  /**
   * VERIFIED: PATCH /leads/:id/deactivate { reason } (leads.deactivate). Takes an
   * erroneous, duplicate, junk, test or otherwise invalid lead out of active
   * sales without deleting its history. Refused for a lead that has any
   * opportunity or pending follow-up. Never changes either of those.
   */
  deactivate(id: ID, reason: string): Promise<Lead>;
  /** VERIFIED: PATCH /leads/:id/reactivate (leads.deactivate). Only restores the lead to active. */
  reactivate(id: ID): Promise<Lead>;
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

// Mirrors the VERIFIED CreateCustomerDto (backend bb9f81f). The customer code is
// not an input: the server assigns it (CUST-000001, ...) and it never changes.
// A new customer is always active.
export interface CreateCustomerInput {
  customerName: string;
  customerType?: string;
  panNumber?: string;
  email?: string;
  phone?: string;
}

// Mirrors the VERIFIED UpdateCustomerDto: a field that is left out is unchanged,
// and an optional one sent as null is cleared. The name cannot be cleared, and
// the code, the active flag and the vendor link cannot be edited.
export interface UpdateCustomerInput {
  customerName?: string;
  customerType?: string | null;
  panNumber?: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface CustomerDuplicateQuery {
  customerName?: string;
  panNumber?: string;
  phone?: string;
  email?: string;
  /** The customer being edited, so it is not reported as its own duplicate. */
  excludeCustomerId?: ID;
}

/**
 * VERIFIED routes (backend bb9f81f, 7c10ab0): GET /customers, GET /customers/:id,
 * POST /customers (customers.create), PATCH /customers/:id (customers.edit),
 * PATCH /customers/:id/deactivate and /reactivate (customers.deactivate),
 * GET /customers/duplicate-check, GET /customers/:id/events and
 * GET /customers/:id/overview (customers.view).
 *
 * Failures: a 409 is a CustomerConflictError (a duplicate PAN or name, an
 * inactive customer, a stale state); a 403 stays an ApiError(403).
 */
export interface ICustomerRepository {
  list(query?: ListQuery<CustomerSortField>): Promise<Page<Customer>>;
  getById(id: ID): Promise<Customer | null>;
  create(input: CreateCustomerInput): Promise<Customer>;
  /** Writes only what changed; an edit that changes nothing records nothing. An inactive customer cannot be edited. */
  update(id: ID, input: UpdateCustomerInput): Promise<Customer>;
  /** ACTIVE -> INACTIVE. The reason is mandatory. Nothing the customer has is touched. */
  deactivate(id: ID, reason: string): Promise<Customer>;
  reactivate(id: ID, remarks?: string): Promise<Customer>;
  /** Newest first. */
  listEvents(id: ID): Promise<CustomerEvent[]>;
  /** The customer's quote-to-cash chain, followed by id, in one read. */
  getOverview(id: ID): Promise<CustomerOverview>;
  /** Customers that look like the one described; nothing is written. At least one field is needed. */
  duplicateCheck(query: CustomerDuplicateQuery): Promise<CustomerDuplicateCheck>;
}

// Mirrors the VERIFIED CreateCustomerGstDto (backend 70a8609). The state is not an
// input: the server reads it from the GSTIN. The first registration of a
// customer is its default whatever is sent.
export interface CreateGstRegistrationInput {
  customerId: ID;
  gstin: string;
  legalName: string;
  tradeName?: string;
  branchName?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  pincode: string;
  isDefault?: boolean;
}

// Mirrors the VERIFIED UpdateCustomerGstDto. The GSTIN and the state cannot change.
export interface UpdateGstRegistrationInput {
  legalName?: string;
  tradeName?: string | null;
  branchName?: string | null;
  addressLine1?: string;
  addressLine2?: string | null;
  city?: string;
  pincode?: string;
}

/**
 * VERIFIED routes (backend 70a8609): POST /customer-gst, PATCH /customer-gst/:id,
 * PATCH /customer-gst/:id/deactivate, /reactivate and /default, all
 * customers.gst.manage. Registrations are never deleted. Reading them is part of
 * reading the customer (customers.view).
 */
export interface IGstRegistrationRepository {
  create(input: CreateGstRegistrationInput): Promise<CustomerGstRegistration>;
  update(id: ID, input: UpdateGstRegistrationInput): Promise<CustomerGstRegistration>;
  /** The reason is mandatory. The default cannot be deactivated while another registration is active. */
  deactivate(id: ID, reason: string): Promise<CustomerGstRegistration>;
  reactivate(id: ID, remarks?: string): Promise<CustomerGstRegistration>;
  setDefault(id: ID): Promise<CustomerGstRegistration>;
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
// start at QUALIFIED (the backend sets it; the form only offers qualified leads).
export interface CreateOpportunityInput {
  leadId: ID;
  title: string;
  expectedValue: number;
  probability: number;
  expectedCloseDate: string;
  /** The customer the deal is for. Optional: it can be linked later. */
  customerId?: ID;
}

export interface IOpportunityRepository {
  list(query?: ListQuery<OpportunitySortField>): Promise<Page<Opportunity>>;
  getById(id: ID): Promise<Opportunity | null>;
  create(input: CreateOpportunityInput): Promise<Opportunity>;
  /**
   * Moves an opportunity to another stage (PATCH /opportunities/:id/stage,
   * permission opportunities.edit). `fromStage` is the stage the person was
   * looking at: the move only happens if the opportunity is still in it. Rules
   * (lib/repository/shared/opportunityStage.ts): one step forward or back, or
   * Lost from any open stage; Won and Lost are final. Throws
   * OpportunityStageConflictError when the stage has changed in the meantime.
   */
  updateStage(id: ID, fromStage: OpportunityStage, toStage: OpportunityStage): Promise<Opportunity>;
  /**
   * Links the opportunity to a customer, changes it, or (null) removes it
   * (PATCH /opportunities/:id/customer, permission opportunities.edit). The
   * customer and the lead must be active. An opportunity with a customer and a
   * quotation keeps its customer; one without a customer can be given one even
   * if it already has documents, as long as none uses another customer's GST
   * registration. Throws CustomerConflictError on a refusal.
   */
  linkCustomer(id: ID, customerId: ID | null): Promise<Opportunity>;
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

/**
 * Quotation lifecycle (backend commit 1246647). Every mutation sends no actor:
 * the backend takes it from the signed-in user's token. Mutations throw
 * QuotationConflictError (409) when the quotation is no longer in the state the
 * caller saw (or a rule forbids the action), and an ApiError with status 403
 * when the user lacks the permission, which must never change anything locally.
 */
export interface IQuotationRepository {
  list(query?: ListQuery<QuotationSortField>): Promise<Page<Quotation>>;
  getById(id: ID): Promise<Quotation | null>;
  create(input: CreateQuotationInput): Promise<Quotation>;
  /**
   * VERIFIED: `PATCH /:id/revise` { taxableAmount, remarks? } (permission
   * quotations.edit). The backend recomputes GST from the percentage the
   * quotation already carries and sets the total; the caller never sends a
   * total. Moves the quotation to REVISED (from DRAFT, REVISED, or an APPROVED
   * one with no active Proforma and no live Sales Order).
   */
  revise(id: ID, taxableAmount: number, remarks?: string): Promise<Quotation>;
  /** VERIFIED: `PATCH /:id/approve` { remarks? } (permission quotations.approve): DRAFT or REVISED -> APPROVED. */
  approve(id: ID, remarks?: string): Promise<Quotation>;
  /** VERIFIED: `PATCH /:id/reject` { reason } (permission quotations.reject): DRAFT or REVISED -> REJECTED, final. The reason is mandatory. */
  reject(id: ID, reason: string): Promise<Quotation>;
  /** VERIFIED: `GET /:id/events` (permission quotations.view): the lifecycle history, newest first. */
  listEvents(id: ID): Promise<QuotationEvent[]>;
}

// Mirrors the VERIFIED CreateProformaInvoiceDto without its optional
// compatibility total: quotationId, issueDate, validityDate?, remarks?. The
// backend derives the total from the APPROVED quotation, so the caller never
// enters (or sends) one.
export interface CreateProformaInvoiceInput {
  quotationId: ID;
  issueDate: string; // ISO 8601
  validityDate?: string;
  remarks?: string;
}

/**
 * Proforma Invoice lifecycle (backend commit 1d0b1dc). Mutations throw
 * ProformaConflictError (409) when the Proforma is no longer in the state the
 * caller saw (or a rule forbids the action: expired, a live Sales Order,
 * another active Proforma), and an ApiError with status 403 when the user lacks
 * the permission, which must never change anything locally.
 */
export interface IProformaInvoiceRepository {
  list(query?: ListQuery<ProformaInvoiceSortField>): Promise<Page<ProformaInvoice>>;
  getById(id: ID): Promise<ProformaInvoice | null>;
  /** VERIFIED: `POST /` (permission proformas.create): needs an APPROVED quotation with no active Proforma; the backend sets the total. */
  create(input: CreateProformaInvoiceInput): Promise<ProformaInvoice>;
  /** VERIFIED: `PATCH /:id/approve` { remarks? } (permission proformas.approve): PENDING -> APPROVED, refused once expired. */
  approve(id: ID, remarks?: string): Promise<ProformaInvoice>;
  /** VERIFIED: `PATCH /:id/cancel` { reason } (permission proformas.cancel): PENDING or APPROVED -> CANCELLED, final, refused while a live Sales Order references it. The reason is mandatory. */
  cancel(id: ID, reason: string): Promise<ProformaInvoice>;
  /** VERIFIED: `GET /:id/events` (permission proformas.view): the lifecycle history, newest first. */
  listEvents(id: ID): Promise<ProformaEvent[]>;
}

// Mirrors the VERIFIED CreateSalesOrderDto: proformaInvoiceId, orderDate,
// inventoryItemId, orderQty, sellerGstId, buyerGstId. This is the direct
// POST /sales-orders creation path, which hard-requires an APPROVED Proforma
// Invoice (validated server-side, along with the inventory item and both GST
// registrations). There is deliberately NO total: the backend takes the
// order's total from the approved Proforma Invoice's totalAmount and refuses
// any other value, so the frontend neither collects nor sends one. Only one
// Sales Order can be created per Proforma Invoice (a second is a 409). It is
// independent of IQuotationRepository.convert().
export interface CreateSalesOrderInput {
  proformaInvoiceId: ID;
  orderDate: string; // ISO 8601
  inventoryItemId: ID;
  orderQty: number;
  sellerGstId: ID;
  buyerGstId: ID;
}

export interface ISalesOrderRepository {
  list(query?: ListQuery<SalesOrderSortField>): Promise<Page<SalesOrder>>;
  getById(id: ID): Promise<SalesOrder | null>;
  /** Throws SalesOrderConflictError (409) when the Proforma is not approved or already has a Sales Order. */
  create(input: CreateSalesOrderInput): Promise<SalesOrder>;
  /**
   * VERIFIED: `GET /sales-orders/:id/events` (permission salesorders.view) — the
   * order's lifecycle history, newest first: advance verified / rejected,
   * accounts approval, their retractions and cancellation, each with its actor
   * (and, for a retraction or cancellation, the reason). Not general notes.
   */
  listEvents(id: ID): Promise<SalesOrderEvent[]>;
}

export interface CreatePaymentTermInput {
  salesOrderId: ID;
  paymentType: string;
  advanceAmount: number;
  balanceAmount: number;
  creditDays?: number;
  dueDate?: string; // date or ISO 8601
  remarks?: string;
}

export interface CreateAdvanceReceiptInput {
  salesOrderId: ID;
  receiptDate: string; // date or ISO 8601
  amountReceived: number;
  paymentMode: string;
  referenceNo?: string;
  remarks?: string;
}

/**
 * The RevenueOS commercial workflow of a Sales Order, against the verified
 * backend routes (backend commit 85c3666). Every action's actor is the signed-in
 * user, decided by the backend — none of these inputs carries an actor, a
 * verifier or an approver. Lifecycle remarks are optional and belong to the
 * lifecycle event, not to the general Notes system.
 *
 * The three list methods return every row for one Sales Order and are only
 * allowed with their own view permission (salesorders.paymentterms.view,
 * salesorders.advancereceipts.view, salesorders.commercialapproval.view).
 *
 * Mutations throw SalesOrderConflictError (409) when the order or receipt is
 * no longer in the expected state; the backend's status is authoritative.
 */
export interface ISalesOrderCommercialRepository {
  listPaymentTerms(salesOrderId: ID): Promise<SalesOrderPaymentTerm[]>;
  createPaymentTerm(input: CreatePaymentTermInput): Promise<SalesOrderPaymentTerm>;
  listAdvanceReceipts(salesOrderId: ID): Promise<SalesOrderAdvanceReceipt[]>;
  createAdvanceReceipt(input: CreateAdvanceReceiptInput): Promise<SalesOrderAdvanceReceipt>;
  /**
   * `PATCH /sales-order-advance-receipt/:id/verify` { verificationStatus, remarks? }.
   * VERIFIED moves the order PENDING_STORE_APPROVAL -> PENDING_ACCOUNTS_APPROVAL;
   * REJECTED leaves the order's status unchanged. Returns the status the backend
   * reports for the order afterwards.
   */
  verifyAdvanceReceipt(
    receiptId: ID,
    outcome: AdvanceReceiptOutcome,
    remarks?: string
  ): Promise<{ receipt: SalesOrderAdvanceReceipt; salesOrderStatus: string }>;
  listApprovals(salesOrderId: ID): Promise<SalesOrderCommercialApproval[]>;
  /** `POST /accounts-commercial-approval/create` { salesOrderId, remarks? }: PENDING_ACCOUNTS_APPROVAL -> READY_FOR_DISPATCH_ORDER only. */
  approve(
    salesOrderId: ID,
    remarks?: string
  ): Promise<{ approval: SalesOrderCommercialApproval; salesOrderStatus: string }>;
  /**
   * `PATCH /sales-order-advance-receipt/:id/retract-verification` { reason }
   * (salesorders.advancereceipts.retract): PENDING_ACCOUNTS_APPROVAL ->
   * PENDING_STORE_APPROVAL. The receipt goes back to PENDING. The reason is
   * mandatory (1-500 characters); a missing one throws before any request.
   */
  retractVerification(
    receiptId: ID,
    reason: string
  ): Promise<{ receipt: SalesOrderAdvanceReceipt; salesOrderStatus: string }>;
  /**
   * `POST /accounts-commercial-approval/:id/retract` { reason }
   * (salesorders.commercialapproval.retract): READY_FOR_DISPATCH_ORDER ->
   * PENDING_ACCOUNTS_APPROVAL. The approval row is kept and marked RETRACTED.
   */
  retractApproval(
    approvalId: ID,
    reason: string
  ): Promise<{ approval: SalesOrderCommercialApproval; salesOrderStatus: string }>;
  /**
   * `POST /sales-orders/:id/cancel` { reason } (salesorders.cancel): from
   * PENDING_STORE_APPROVAL, PENDING_ACCOUNTS_APPROVAL or READY_FOR_DISPATCH_ORDER
   * to CANCELLED, which is terminal. Receipts (a VERIFIED advance included) are
   * left exactly as they are; nothing is refunded or reversed downstream.
   */
  cancelSalesOrder(salesOrderId: ID, reason: string): Promise<{ salesOrderStatus: string }>;
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
  proformaInvoices: ProformaInvoice[];
  salesOrders: SalesOrder[];
  salesInvoices: SalesInvoice[];
}

// The real implementation aggregates already-real list() calls across the
// entities RevenueOS itself owns (Leads, Customers, Quotations,
// Opportunities, Proforma Invoices, Sales Orders, Sales Invoices) — no
// dedicated backend search endpoint exists (confirmed: nothing resembling a
// search controller/route
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
  customerGst: IGstRegistrationRepository;
  contacts: IContactRepository;
  activities: IActivityRepository;
  tasks: ITaskRepository;
  notes: INoteRepository;
  opportunities: IOpportunityRepository;
  quotations: IQuotationRepository;
  proformaInvoices: IProformaInvoiceRepository;
  salesOrders: ISalesOrderRepository;
  salesOrderCommercial: ISalesOrderCommercialRepository;
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
