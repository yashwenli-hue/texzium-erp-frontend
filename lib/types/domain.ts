import { ID } from "./common";

/**
 * ============================================================================
 * DOMAIN TYPES — RevenueOS
 * ============================================================================
 * These types describe the shape the UI needs. They are NOT confirmed against
 * the real backend schema yet. Every field with an open question is flagged
 * inline with `// @backend-verify:` and mirrored in docs/backend-ui-contract.md.
 * Do not treat these as a source of truth for Prisma models or API contracts —
 * they are a frontend-side working assumption only.
 * ============================================================================
 */

// VERIFIED: the deployed Prisma `LeadStatus` enum (prisma/schema.prisma on
// the backend). These are the exact values the API accepts/returns — not the
// prototype's invented New/Contacted/Qualified/Proposal/Negotiation/Won/Lost
// labels. LEAD_QUALIFIED and LEAD_REJECTED remain distinct, permission-gated
// events (leads.qualify / leads.reject) reachable only through the dedicated
// Qualify/Reject actions, never a casual drag on the pipeline board — the
// real qualify() action sets status to SALES_ASSIGNED (not "QUALIFIED"),
// confirmed in lead-assignments.service.ts. See docs/backend-ui-contract.md §3.
export type LeadStatus =
  | "NEW"
  | "ASSIGNED"
  | "CONTACTED"
  | "QUALIFIED"
  | "PROPOSAL_SENT"
  | "NEGOTIATION"
  | "WON"
  | "LOST"
  | "PRE_SALES_ASSIGNED"
  | "SALES_ASSIGNED"
  | "REJECTED";

export const LEAD_STATUSES: LeadStatus[] = [
  "NEW",
  "ASSIGNED",
  "CONTACTED",
  "QUALIFIED",
  "PROPOSAL_SENT",
  "NEGOTIATION",
  "WON",
  "LOST",
  "PRE_SALES_ASSIGNED",
  "SALES_ASSIGNED",
  "REJECTED",
];

/** Freely draggable on the Lead Pipeline board — Qualify/Reject are gated actions, not drag targets. */
export const LEAD_BOARD_STATUSES: LeadStatus[] = ["NEW", "CONTACTED"];

/** "PRE_SALES_ASSIGNED" -> "Pre Sales Assigned". Shared by status badges and timeline action labels. */
export function titleCaseFromConstant(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/** Presentation label for a raw backend status value, e.g. "PRE_SALES_ASSIGNED" -> "Pre Sales Assigned". */
export function formatLeadStatus(status: string): string {
  return titleCaseFromConstant(status);
}

/** The real qualify() action sets status to SALES_ASSIGNED, not the enum's own QUALIFIED value — both read as "qualified" for UI gating (e.g. eligible to become an Opportunity). */
export function isQualifiedLeadStatus(status: LeadStatus): boolean {
  return status === "QUALIFIED" || status === "SALES_ASSIGNED";
}

// Frontend-only lead-scoring heuristic for presentation/prioritization.
// No backend equivalent — never treat as authoritative.
export type LeadScore = "Hot" | "Warm" | "Cold";

// VERIFIED: lead creation requires a valid sourceId referencing an existing
// LeadSource record (name, description?). Mirrors the lead-sources module.
//
// `category` is MOCK/UI-ONLY: the verified LeadSource model exposes only
// name/description — there is no confirmed source-type/category field.
// It exists here purely to power source-type filtering and visual grouping
// in the UI; do not treat it as a backend field until confirmed.
export interface LeadSourceRecord {
  id: ID;
  name: string;
  description?: string;
  category?: string;
}

// MOCK/UI-ONLY presentation context requested for the Lead workspace
// (product interest, free-text remarks, city). None of these exist on the
// verified CreateLeadDto/UpdateLeadDto (docs/backend-ui-contract.md §3).
// They are kept in this separate, clearly-named block — never flattened
// into the DTO-mirroring fields below — so Phase B integration cannot
// silently start sending them to a real endpoint. If Phase B needs to
// persist them, that requires a confirmed backend field/endpoint first;
// until then, values entered here are local-only and will not survive a
// switch to the real repository.
export interface LeadUIContext {
  productInterest?: string;
  remarks?: string;
  city?: string;
}

// VERIFIED: LeadFollowup { id, leadId, followupDate, remarks?, status,
// completedAt?, completedById?, createdAt, updatedAt }. completedByName is
// denormalized for display — the real complete/reschedule/cancel/list
// responses include a selected `completedBy` user, not a raw scalar field.
// See docs/backend-ui-contract.md §5.
export type LeadFollowupStatus = "PENDING" | "COMPLETED" | "CANCELLED";

export interface LeadFollowup {
  id: ID;
  leadId: ID;
  followupDate: string; // ISO 8601
  remarks?: string;
  status: LeadFollowupStatus;
  completedAt?: string | null;
  completedByName?: string;
  createdAt: string;
  updatedAt: string;
}

// Minimal real-user shape needed to populate the Assign/Qualify dropdowns —
// see AssignLeadDialog/QualifyLeadDialog. Sourced from GET /users (outside
// the RevenueOS module; no RevenueOS-scoped assignable-user lookup is
// confirmed — see docs/backend-ui-contract.md §21 and the Stage 2A report).
export interface AssignableUser {
  id: ID;
  name: string;
}

// Minimal option shapes needed to populate the real Quotation creation form's
// Inventory Item / Seller GST / Buyer GST pickers — CreateQuotationDto
// requires all three ids, and none have a RevenueOS-scoped lookup, so these
// are sourced from GET /inventory (OperationsOS), GET /company-gst and
// GET /customer-gst (ComplianceOS/RevenueOS) respectively — same "least
// invasive real option" precedent as AssignableUser/GET /users. See
// docs/backend-ui-contract.md §8, §21 and the Stage 2C report.
export interface InventoryItemOption {
  id: ID;
  name: string;
}

export interface GstRegistrationOption {
  id: ID;
  label: string;
  stateCode: string;
}

// VERIFIED CreateLeadDto: leadCode?, customerName, companyName?, email?,
// phone, alternatePhone?, sourceId. See docs/backend-ui-contract.md §3.
export interface Lead {
  id: ID;
  customerName: string;
  companyName?: string;
  email?: string;
  phone: string;
  alternatePhone?: string;
  sourceId: ID;
  sourceName: string; // denormalized — VERIFIED: lead list/detail includes the source relation
  status: LeadStatus;
  /** Frontend-only heuristic with no backend basis at all — leave unset for real leads rather than fabricate it. */
  score?: LeadScore;
  // Unset until the dedicated Assign action fires (AssignLeadDto / PRE_SALES_ASSIGNED).
  assignedToId?: ID;
  assignedToName?: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  lastActivityAt: string; // ISO 8601
  /** MOCK/UI-ONLY — see LeadUIContext. Not part of the verified Lead contract. */
  uiContext?: LeadUIContext;
  /** VERIFIED: both lead list and lead detail embed the followups relation. */
  followups?: LeadFollowup[];
  /** VERIFIED: lead detail (not list) embeds the LeadNote relation; there is no create endpoint for it yet. */
  notes?: LeadNoteEntry[];
}

// VERIFIED: LeadNote { id, leadId, note, createdAt } — Lead-scoped only, and
// read-only from the frontend: no backend endpoint creates one. See
// docs/backend-ui-contract.md §20.
export interface LeadNoteEntry {
  id: ID;
  leadId: ID;
  note: string;
  createdAt: string;
}

export interface LeadTimelineEntry {
  id: ID;
  leadId: ID;
  icon: string; // maps to an icon key in the icon set
  title: string;
  detail: string;
  actorName: string;
  occurredAt: string; // ISO 8601
}

// UI ASSUMPTION — carried over from the prototype. The VERIFIED
// CreateCustomerDto (customerCode, customerName, panNumber?, email?,
// phone?, customerType?) has no status field at all, so this is not a
// case of "unconfirmed enum values" like Lead/Opportunity/Quotation —
// there is currently no backend account-health concept to mirror. Kept as
// a frontend-only presentation label until a real field is confirmed; do
// not treat these four values as backend-verified. See
// docs/backend-ui-contract.md §6.
export type CustomerStatus = "Active" | "At Risk" | "New" | "Churned";

// VERIFIED: CustomerGSTRegistration — GET /customers nests this array as
// `gstRegistrations`; a flat GET /customer-gst also exists (already
// consumed read-only as the Buyer GST dropdown lookup — see
// GstRegistrationOption/IBuyerGstRepository). A customer can have multiple
// registrations, and the backend does NOT enforce exactly one `isDefault`
// per customer (confirmed by reading customer-gst.service.ts directly — no
// other registration is unset when a new default is created), so more than
// one may legitimately show isDefault: true; never silently correct that.
// No GSTIN format/checksum validation exists either. POST /customer-gst is
// currently broken for every payload — see the Stage 2H report.
export interface CustomerGstRegistration {
  id: ID;
  customerId: ID;
  gstin: string;
  legalName: string;
  tradeName?: string;
  branchName?: string;
  stateCode: string;
  stateName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  pincode: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: ID;
  // VERIFIED CreateCustomerDto/Customer model fields — see CreateCustomerInput.
  // customerName was renamed from the prototype's plain `name` to match the
  // DTO's own field name and the already-committed CustomerSortField literal.
  customerName: string;
  customerCode: string;
  panNumber?: string;
  email?: string;
  phone?: string;
  customerType?: string;
  isActive: boolean;
  // VERIFIED: populated only via the POST /vendors (isCustomer: true)
  // auto-link path, never via direct customer creation — see the Stage 2H
  // report. Not a real Prisma relation on either side (linkedVendorId is a
  // bare string, not a foreign key).
  isVendor: boolean;
  linkedVendorId?: ID;
  gstRegistrations: CustomerGstRegistration[];
  createdAt: string;
  updatedAt: string;
  // MOCK/UI-ONLY presentation fields below — carried over from the
  // prototype, with NO basis in the real Customer model at all (confirmed
  // by reading the Prisma schema directly — see the Stage 2H report).
  // Always present for a mock customer; always undefined for a real one —
  // never synthesized or defaulted for real customers, since a placeholder
  // value would misrepresent verified backend truth. The create form no
  // longer collects any of these, since CreateCustomerInput doesn't accept
  // them; MockCustomerRepository.create() still defaults them for new mock
  // customers only, to keep the existing mock-mode UI working.
  industry?: string;
  city?: string;
  ownerId?: ID;
  ownerName?: string;
  lifetimeValue?: number; // INR
  openOrders?: number;
  status?: CustomerStatus;
  customerSince?: string; // ISO 8601 — the "Customer Since" label mock mode shows
  // @backend-verify: is contactsCount derived server-side or computed
  // client-side from the Contacts collection? Currently computed client-side.
  originLeadId?: ID;
}

export type ContactType = "Decision Maker" | "Champion" | "Influencer";

export interface Contact {
  id: ID;
  name: string;
  title: string;
  companyName: string; // denormalized for display
  companyId?: ID; // links to Customer or Lead — @backend-verify: relationship model
  type: ContactType;
  email: string;
  phone: string;
  lastContactedAt: string | null; // ISO 8601
  ownerId: ID;
  ownerName: string;
}

export type ActivityType =
  | "Call"
  | "Email"
  | "Meeting"
  | "WhatsApp"
  | "Quotation"
  | "Stage Change"
  | "Note";

// VERIFIED: the backend confirms LeadNote (leadId, note, createdAt) —
// Lead-scoped only. "Customer" and "Opportunity" as linkable record types
// are UI ASSUMPTIONS carried over from the prototype / added for this
// refinement; no generic polymorphic note/activity relation is confirmed
// for Customer or Opportunity yet. See docs/backend-ui-contract.md §20.
export type RelatedRecordType = "Lead" | "Customer" | "Opportunity";

export interface Activity {
  id: ID;
  type: ActivityType;
  relatedType: RelatedRecordType;
  relatedId: ID;
  relatedName: string; // denormalized for display
  ownerName: string;
  occurredAt: string; // ISO 8601
  note: string;
}

export type TaskPriority = "High" | "Medium" | "Low";

export interface Task {
  id: ID;
  title: string;
  dueAt: string | null; // ISO 8601, null = no due date
  priority: TaskPriority;
  linkedType: RelatedRecordType;
  linkedId: ID;
  linkedName: string;
  assigneeName: string;
  done: boolean;
  createdAt: string;
}

export interface Note {
  id: ID;
  text: string;
  linkedType: RelatedRecordType;
  linkedId: ID;
  linkedName: string;
  authorName: string;
  createdAt: string;
  pinned: boolean;
}

// VERIFIED: the backend's own Opportunity.status is a plain String
// defaulting to "OPEN", with no enum and no mutation endpoint anywhere in
// the codebase — it never changes. `stage` below is therefore a client-side
// pipeline concept only, held in the browser (see realOpportunityRepository),
// not a projection of that backend field. See docs/backend-ui-contract.md §7, §17.
export type OpportunityStage =
  | "Qualified"
  | "Proposal"
  | "Negotiation"
  | "Won"
  | "Lost";

export const OPPORTUNITY_STAGES: OpportunityStage[] = [
  "Qualified",
  "Proposal",
  "Negotiation",
  "Won",
  "Lost",
];

/** Linear happy-path order for the lifecycle stepper — "Lost" is a terminal flag, not a step. */
export const OPPORTUNITY_STEPS: OpportunityStage[] = ["Qualified", "Proposal", "Negotiation", "Won"];

// VERIFIED CreateOpportunityDto: leadId, title, expectedValue, probability,
// expectedCloseDate. Creation writes OPPORTUNITY_CREATED to the lead
// timeline. See docs/backend-ui-contract.md §7.
export interface Opportunity {
  id: ID;
  leadId: ID;
  title: string;
  customerName: string; // denormalized from the linked lead, for display/grouping only
  stage: OpportunityStage;
  expectedValue: number; // INR. @backend-verify: currency + unit.
  probability: number; // 0-100
  expectedCloseDate: string; // ISO 8601
  ownerName: string;
  createdAt: string; // ISO 8601
}

// VERIFIED: Quotation.status is a plain backend String (@default("DRAFT")),
// no Prisma enum. create() sets DRAFT, revise() sets REVISED, approve() sets
// APPROVED — confirmed by reading quotations.service.ts directly. convert()
// (POST /:id/convert) creates a SalesOrder record but never writes CONVERTED
// (or any other value) back onto the Quotation itself — that status value is
// never actually reachable through any real backend code path, even though
// it's part of the master plan's documented workflow terminology. See
// docs/backend-ui-contract.md §8, Stage 2C report.
export type QuotationStatus = "DRAFT" | "REVISED" | "APPROVED" | "CONVERTED";

export const QUOTATION_STATUSES: QuotationStatus[] = ["DRAFT", "REVISED", "APPROVED", "CONVERTED"];

export function formatQuotationStatus(status: string): string {
  return titleCaseFromConstant(status);
}

// MOCK/UI-ONLY: the backend confirms a `revise` operation exists, but no
// persisted multi-version history is confirmed — this models a V1/V2/V3
// revision trail for the UI only. A real integration may return a single
// current amount with no history, or a differently-shaped history; treat
// this shape as presentation-only until a real endpoint is confirmed.
export interface QuotationRevision {
  version: number;
  amount: number;
  createdAt: string;
  note?: string;
}

export interface Quotation {
  id: ID;
  /** quotationCode from the backend, which no verified code path ever sets — falls back to a short id reference (`#XXXXXXXX`), never a fabricated sequential number. */
  quoteNo: string;
  customerId?: ID;
  customerName: string;
  opportunityId?: ID;
  opportunityName: string;
  /** Canonical headline amount — totalAmount for a real quotation, the user-entered estimate for mock. */
  amount: number;
  status: QuotationStatus;
  /** MOCK/UI-ONLY — no backend field. Always null for a real quotation. */
  validUntil: string | null; // ISO 8601
  ownerName: string;
  createdAt: string;
  /** MOCK/UI-ONLY current revision number — see QuotationRevision. Always 1 for a real quotation (no persisted version history). */
  version: number;
  /** MOCK/UI-ONLY revision trail — see QuotationRevision. Always empty for a real quotation. */
  revisions: QuotationRevision[];
  /** VERIFIED real fields below — backend-computed, undefined for mock quotations. See docs/backend-ui-contract.md §8. */
  quoteDate?: string;
  quantity?: number;
  unitPrice?: number;
  taxableAmount?: number;
  gstPercent?: number;
  gstAmount?: number;
  totalAmount?: number;
  taxType?: string;
  placeOfSupply?: string;
}

// VERIFIED: ProformaInvoice.customerStatus is a plain backend String
// (@default("PENDING")), no Prisma enum. create() leaves it at PENDING;
// approve() (PATCH /:id/approve) is the only mutation and sets APPROVED.
// No other status value is ever written by any backend code path — see
// proforma-invoices.service.ts.
export type ProformaInvoiceStatus = "PENDING" | "APPROVED";

export const PROFORMA_INVOICE_STATUSES: ProformaInvoiceStatus[] = ["PENDING", "APPROVED"];

export function formatProformaInvoiceStatus(status: string): string {
  return titleCaseFromConstant(status);
}

// VERIFIED CreateProformaInvoiceDto: quotationId, issueDate, totalAmount,
// validityDate?, remarks?. totalAmount is NOT backend-computed here (unlike
// Quotation, which derives it from HSN/GST) — the backend stores exactly
// whatever number is sent. See docs/backend-ui-contract.md §9.
export interface ProformaInvoice {
  id: ID;
  /** proformaNumber from the backend, never set by any verified code path — falls back to a short id reference, never a fabricated sequential number. */
  proformaNumber: string;
  quotationId: ID;
  quoteNo: string; // denormalized from the linked quotation, for display
  customerName: string; // denormalized via quotation -> opportunity -> lead
  opportunityId?: ID;
  opportunityName: string;
  issueDate: string;
  totalAmount: number;
  status: ProformaInvoiceStatus;
  validityDate: string | null;
  remarks?: string;
  ownerName: string;
  createdAt: string;
}

// VERIFIED: SalesOrder.status is a plain backend String (@default("OPEN")),
// no Prisma enum — same pattern as Quotation/ProformaInvoice. The RevenueOS
// Sales Orders controller (sales-orders.controller.ts) only ever writes two
// values: "OPEN" (via quotations.service.ts convertToSalesOrder(), and the
// AdminOS Workflow Executor's unrelated QUOTATION_APPROVED trigger) and
// "PENDING_STORE_APPROVAL" (via sales-orders.service.ts create(), the direct
// POST /sales-orders path from an approved Proforma Invoice). Other values
// observed in real data (e.g. "READY_FOR_INVOICING") are written exclusively
// by unrelated OperationsOS (Dispatch Orders) and AdminOS (Workflow
// Executor) modules — there is no RevenueOS-scoped endpoint that transitions
// a Sales Order's status, so this stays a plain string rather than a closed
// union, and no frontend action is offered for those other values. See the
// Stage 2E report.
export function formatSalesOrderStatus(status: string): string {
  return titleCaseFromConstant(status);
}

// VERIFIED CreateSalesOrderDto: proformaInvoiceId, orderDate, totalAmount,
// inventoryItemId, orderQty, sellerGstId, buyerGstId — see
// CreateSalesOrderInput. A Sales Order can also be created without any of
// those fields via POST /quotations/:id/convert (quotationId only) — the
// two backend creation paths are independent and never cross-reference each
// other, so a given Sales Order carries either quotationId or
// proformaInvoiceId (rarely both meaningfully linked at once). customerName/
// opportunityName/ownerName/quoteNo/proformaNumber are always denormalized
// from whichever linked Quotation/Proforma Invoice is resolvable. See the
// Stage 2E report.
export interface SalesOrder {
  id: ID;
  /** salesOrderCode from the backend — null for both verified RevenueOS creation paths; falls back to a short id reference, never a fabricated sequence number. */
  salesOrderCode: string;
  orderDate: string;
  totalAmount: number;
  status: string;
  quotationId?: ID;
  quoteNo?: string;
  proformaInvoiceId?: ID;
  proformaNumber?: string;
  opportunityId?: ID;
  opportunityName?: string;
  customerName: string;
  ownerName: string;
  sellerGstId?: ID;
  buyerGstId?: ID;
  placeOfSupply?: string;
  taxType?: string;
  inventoryItemId?: ID;
  createdAt: string;
}

// VERIFIED: DispatchOrder is an OperationsOS resource (dispatch-orders
// module), not RevenueOS — read-only here, the same "least invasive real
// option" precedent as InventoryItemOption/GstRegistrationOption, because
// CreateSalesInvoiceDto requires a real dispatchOrderId and there is no
// Dispatch Order management UI in this app. Only DISPATCHED orders whose own
// salesOrderId matches the Sales Order being invoiced are ever offered — the
// backend itself does NOT cross-check that dispatchOrderId and salesOrderId
// on a Sales Invoice actually belong together (confirmed by reading
// sales-invoices.service.ts directly), so this is a frontend safeguard on
// top of real data, not a claimed backend rule. See the Stage 2F report.
export interface DispatchOrderOption {
  id: ID;
  /** dispatchOrderNo from the backend — falls back to a short id reference, same pattern as every other document number here. */
  dispatchOrderNo: string;
  status: string;
  salesOrderId?: ID;
  dispatchDate?: string | null;
}

// VERIFIED: SalesInvoice.status is a plain backend String (@default("DRAFT")
// in the Prisma schema), but the only RevenueOS-scoped write path
// (sales-invoices.service.ts create()) always sets it to "POSTED" — DRAFT is
// never written by this controller. A DRAFT-status record was observed in
// real data with null dispatchOrderId/customerName, which the live DTO's
// required fields (with a global whitelist/forbidNonWhitelisted
// ValidationPipe) could not have produced — it predates this endpoint or was
// seeded directly, not a reachable state through this app. paymentStatus is
// a separate, real field (PENDING/PAID observed) driven by the
// AccountsReceivable side effect — shown as read-only information; building
// payment collection actions is out of Stage 2F's scope. See the Stage 2F report.
export function formatSalesInvoiceStatus(status: string): string {
  return titleCaseFromConstant(status);
}

// Mirrors the VERIFIED CreateSalesInvoiceDto: salesOrderId, dispatchOrderId,
// invoiceDate, customerName, remarks?. taxableAmount/gstAmount/cgstAmount/
// sgstAmount/igstAmount/totalAmount are entirely backend-computed (a flat
// 18% GST assumption applied to the Sales Order's own totalAmount,
// regardless of the item's real HSN rate — confirmed by reading
// sales-invoices.service.ts directly) — never sent or estimated by the
// frontend. invoiceNumber is never set by this controller (unlike a
// different, unrelated FinanceOS sales-invoices module that generates one
// via DocumentNumberGeneratorService — that module exists in source but is
// NOT imported into AppModule, so it is dead code with no live route; the
// only reachable `POST /sales-invoices` is the RevenueOS one). See the
// Stage 2F report.
export interface SalesInvoice {
  id: ID;
  /** invoiceNumber from the backend — never set by the live endpoint; falls back to a short id reference, never a fabricated sequence number. */
  invoiceNumber: string;
  salesOrderId: ID;
  salesOrderCode?: string;
  quotationId?: ID;
  quoteNo?: string;
  proformaInvoiceId?: ID;
  proformaNumber?: string;
  opportunityId?: ID;
  opportunityName?: string;
  dispatchOrderId?: ID;
  dispatchOrderNo?: string;
  dispatchStatus?: string;
  customerName: string;
  ownerName: string;
  invoiceDate: string;
  taxableAmount: number;
  gstAmount: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  totalAmount: number;
  status: string;
  paymentStatus?: string;
  remarks?: string;
  createdAt: string;
}

// VERIFIED: AccountsReceivable.paymentStatus is a plain backend String
// (@default("PENDING")). Reachable values, confirmed by reading every write
// site directly: PENDING (default, on creation alongside a Sales Invoice),
// PARTIAL/PAID (payment-collections.service.ts, the live POST
// /payment-collections path), WRITTEN_OFF (bad-debt-writeoff.service.ts —
// not integrated this stage, see the Stage 2G report). This is the ONLY
// authoritative payment status in the app. SalesInvoice.paymentStatus is
// never updated by any live code path and must never be used instead —
// confirmed empirically: real PAID and WRITTEN_OFF AccountsReceivable
// records still show their linked SalesInvoice.paymentStatus stuck at
// PENDING. See the Stage 2G report.
export function formatAccountsReceivableStatus(status: string): string {
  return titleCaseFromConstant(status);
}

// VERIFIED: GET /accounts-receivable nests the raw SalesInvoice (customerName,
// invoiceNumber). No GET /:id exists — see IAccountsReceivableRepository.
// outstandingAmount is the amount at creation time (unaffected by payments);
// paidAmount/balanceAmount are the live, backend-maintained figures. The
// backend does NOT clamp balanceAmount at zero on overpayment — a negative
// balanceAmount is real backend output, not a frontend bug, and must be
// shown honestly rather than clamped client-side. See the Stage 2G report.
export interface AccountsReceivable {
  id: ID;
  salesInvoiceId: ID;
  invoiceNumber?: string;
  customerName?: string;
  dueDate: string;
  outstandingAmount: number;
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: string;
  createdAt: string;
}

// The synchronous response body of POST /payment-collections is the ONLY
// place a PaymentCollection's own id is ever available — it cannot be
// looked up afterward through any endpoint. Kept as its own type (rather
// than folded into AccountsReceivable) to make that ephemerality explicit:
// a value of this shape is only ever held transiently in component state
// right after a successful payment, never persisted/refetched.
export interface PaymentCollectionRecord {
  id: ID;
  accountsReceivableId: ID;
  paymentDate: string;
  amount: number;
  paymentMode: string;
  referenceNumber?: string;
  remarks?: string;
  createdAt: string;
}

export interface RecordPaymentResult {
  paymentRecord: PaymentCollectionRecord;
  /** Re-fetch AccountsReceivable via getBySalesInvoiceId() after this for the display-authoritative copy — this one has no nested salesInvoice (see realPaymentCollectionRepository.ts). */
  updatedReceivable: AccountsReceivable;
}

// VERIFIED: GET /customer-statements/:customerName derives entirely from
// CustomerLedger rows for that customer — the same real ledger every Sales
// Invoice/Payment Collection/Credit Note/Debit Note writes to. Entries have
// NO PaymentCollection id and no structured payment-mode field — payment
// mode only ever appears inside the free-text `remarks` (e.g. "Payment
// received UTR10001"). Do not present these as PaymentCollection records;
// present as ledger/statement history only. See the Stage 2G report.
export interface CustomerStatementEntry {
  id: ID;
  customerName: string;
  salesInvoiceId: ID;
  debitAmount: number;
  creditAmount: number;
  balanceAmount: number;
  entryDate: string;
  remarks?: string;
  createdAt: string;
}

export interface CustomerStatement {
  customerName: string;
  openingBalance: number;
  closingBalance: number;
  entries: CustomerStatementEntry[];
}

// VERIFIED: POST /payment-links/:salesInvoiceId/generate. The one real
// PaymentGatewayConfig row in the backend is inactive, so the live response
// today is always the MANUAL branch (bank transfer details) — but the
// service code supports an ONLINE branch too if an active gateway ever
// exists, so `mode` is read from the real response rather than assumed.
// `paymentLink` in ONLINE mode is a synthetic URL the backend constructs
// (`https://pay.{gateway}.com/{invoiceId}`), not a real payment gateway
// integration — see the Stage 2G report.
export interface PaymentLinkResult {
  mode: string;
  amount: number;
  gateway?: string;
  paymentLink?: string;
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  ifscCode?: string;
  upiId?: string;
}

// VERIFIED: POST /receipt-vouchers/:paymentCollectionId/generate — only
// reachable immediately after recording a payment, using the id from that
// payment's own response (see PaymentCollectionRecord). GET
// /receipt-pdf/:receiptVoucherId exists but writes a PDF to the backend's
// own server filesystem and returns a local file path, not a downloadable
// response — there is no way for this frontend to retrieve or display that
// PDF, so it is not called. See the Stage 2G report.
export interface ReceiptVoucher {
  id: ID;
  receiptNumber?: string;
  paymentCollectionId: ID;
  receiptDate: string;
  amountReceived: number;
  paymentMode: string;
  referenceNo?: string;
  remarks?: string;
  createdAt: string;
}

export type NotificationIcon =
  | "funnel"
  | "file"
  | "checksq"
  | "user"
  | "cash"
  | "alert"
  | "check"
  | "cal";

export interface AppNotification {
  id: ID;
  icon: NotificationIcon;
  text: string;
  occurredAt: string; // ISO 8601
  unread: boolean;
}
