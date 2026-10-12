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

// Which statuses Assign, Qualify and Reject may start from. These mirror the
// backend's lead-transitions.ts, which enforces them (409 otherwise); here they only
// decide which buttons are enabled and what the hint says.
//   before qualification   NEW, ASSIGNED, CONTACTED, PRE_SALES_ASSIGNED
//   qualified / in sales   QUALIFIED, SALES_ASSIGNED, PROPOSAL_SENT, NEGOTIATION
//   closed                 WON, LOST, REJECTED
export const LEAD_BEFORE_QUALIFICATION_STATUSES: LeadStatus[] = ["NEW", "ASSIGNED", "CONTACTED", "PRE_SALES_ASSIGNED"];
export const LEAD_CLOSED_STATUSES: LeadStatus[] = ["WON", "LOST", "REJECTED"];

/** Assign → Pre Sales Assigned (from Pre Sales Assigned only to a different user). */
export function canAssignLeadFrom(status: LeadStatus): boolean {
  return LEAD_BEFORE_QUALIFICATION_STATUSES.includes(status);
}

/** Qualify → Sales Assigned. */
export function canQualifyLeadFrom(status: LeadStatus): boolean {
  return LEAD_BEFORE_QUALIFICATION_STATUSES.includes(status);
}

/** Reject → Rejected, from anything that is not closed. */
export function canRejectLeadFrom(status: LeadStatus): boolean {
  return !LEAD_CLOSED_STATUSES.includes(status);
}

/** Why an assignment action is not available for this status (the same wording as the backend), or undefined. */
export function leadActionBlockedReason(action: "assign" | "qualify" | "reject", status: LeadStatus): string | undefined {
  const label = formatLeadStatus(status);
  const closed = LEAD_CLOSED_STATUSES.includes(status);
  if (action === "assign" && !canAssignLeadFrom(status)) {
    return closed
      ? `This lead is closed (${label}), so it cannot be assigned to pre-sales.`
      : `This lead has already been qualified (${label}), so it cannot be assigned to pre-sales.`;
  }
  if (action === "qualify" && !canQualifyLeadFrom(status)) {
    return closed ? `This lead is closed (${label}), so it cannot be qualified.` : `This lead has already been qualified (${label}).`;
  }
  if (action === "reject" && !canRejectLeadFrom(status)) {
    return status === "REJECTED" ? "This lead has already been rejected." : `This lead is closed (${label}), so it cannot be rejected.`;
  }
  return undefined;
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
// (product interest, free-text remarks). Neither exists on the
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
  /** Only an active user can take a lead (the backend refuses INACTIVE and SUSPENDED users). Inactive users are still listed so their names resolve. */
  active: boolean;
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
  /** VERIFIED: GET /inventory already returns these — surfaced read-only to inform item selection. Undefined only if a source (e.g. mock) doesn't model them. */
  stockQty?: number;
  availableQty?: number;
}

export interface GstRegistrationOption {
  id: ID;
  label: string;
  stateCode: string;
  /** VERIFIED: GET /company-gst and GET /customer-gst already return both — the backend itself does not filter or validate on either at selection time (confirmed by reading quotations.service.ts), so this is surfaced purely to let the picker warn/disable rather than to enforce a rule the backend doesn't. */
  isActive: boolean;
  isDefault: boolean;
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
  /**
   * VERIFIED: Lead.isActive. Deactivation is the safe way to remove an
   * erroneous, duplicate, junk, test, or otherwise invalid lead from active
   * sales without deleting its historical record. It is not a substitute for
   * correcting valid lead information (use Edit for that). An inactive lead is
   * hidden from normal lists and takes no sales writes until reactivated.
   */
  isActive: boolean;
  /** Describe the CURRENT deactivation; all cleared when the lead is reactivated. */
  deactivatedAt?: string; // ISO 8601
  deactivatedById?: ID;
  /** From the safe { id, fullName } the backend returns; absent if that user no longer exists. */
  deactivatedByName?: string;
  deactivationReason?: string;
  /** Frontend-only heuristic with no backend basis at all — leave unset for real leads rather than fabricate it. */
  score?: LeadScore;
  // Unset until the dedicated Assign action fires (AssignLeadDto / PRE_SALES_ASSIGNED).
  assignedToId?: ID;
  assignedToName?: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  lastActivityAt: string; // ISO 8601
  /**
   * VERIFIED (backend CP1): where the lead is. All three are absent for a lead recorded
   * without a location (every lead that existed before, and those the WhatsApp bot or a
   * webhook creates). country is ISO 3166-1 alpha-2 ("IN" is domestic); state is a state
   * or union territory of India and only exists when country is "IN"; city is free text.
   */
  country?: string;
  state?: string;
  city?: string;
  /** MOCK/UI-ONLY — see LeadUIContext. Not part of the verified Lead contract. */
  uiContext?: LeadUIContext;
  /** VERIFIED: both lead list and lead detail embed the followups relation. */
  followups?: LeadFollowup[];
  /** VERIFIED: lead detail embeds the LeadNote relation (imported requirement text). Read-only. */
  notes?: LeadNoteEntry[];
  /** VERIFIED: lead detail embeds the LeadTimeline relation, newest first. */
  timelines?: LeadTimelineEntry[];
}

// VERIFIED: LeadNote { id, leadId, note, createdAt } — written only by the
// lead-import webhook (the inbound "requirement" text). Read-only here: employee
// remarks are recorded as LeadTimeline activity, not as LeadNote.
export interface LeadNoteEntry {
  id: ID;
  leadId: ID;
  note: string;
  createdAt: string;
}

// VERIFIED: LeadTimeline.source. SYSTEM entries are lifecycle events written by
// trusted backend workflows (created, assigned, qualified, follow-up events…).
// EMPLOYEE entries are sales work logged by a user via POST /leads/:id/activities.
export type LeadTimelineSource = "SYSTEM" | "EMPLOYEE";

// VERIFIED: LeadActivityType enum. Follow-up scheduling is NOT an activity type —
// it stays in LeadFollowup.
export type LeadActivityType = "NOTE" | "CALL" | "MEETING" | "EMAIL" | "WHATSAPP" | "REQUIREMENT" | "OTHER";

export const LEAD_ACTIVITY_REMARKS_MAX_LENGTH = 2000;

export const LEAD_ACTIVITY_TYPES: { value: LeadActivityType; label: string; icon: string }[] = [
  { value: "CALL", label: "Call", icon: "phone" },
  { value: "MEETING", label: "Meeting", icon: "cal" },
  { value: "EMAIL", label: "Email", icon: "mail" },
  { value: "WHATSAPP", label: "WhatsApp", icon: "wa" },
  { value: "REQUIREMENT", label: "Requirement", icon: "file" },
  { value: "NOTE", label: "Note", icon: "notepad" },
  { value: "OTHER", label: "Other", icon: "pulse" },
];

export function leadActivityMeta(type: LeadActivityType) {
  return LEAD_ACTIVITY_TYPES.find((t) => t.value === type) ?? LEAD_ACTIVITY_TYPES[LEAD_ACTIVITY_TYPES.length - 1];
}

export interface LeadTimelineEntry {
  id: ID;
  leadId: ID;
  source: LeadTimelineSource;
  /** Set only on EMPLOYEE entries. */
  activityType?: LeadActivityType;
  icon: string; // maps to an icon key in the icon set
  title: string;
  detail: string;
  /** What the person who performed the action wrote about it (today: the remark on a stage move). Apart from `detail`, which is the system's own sentence. Absent on every event recorded without one. */
  userRemark?: string;
  /** Empty for system events, and for employee entries whose author was not recorded. */
  actorName: string;
  actorId?: ID;
  occurredAt: string; // ISO 8601 — when it happened (employee entries may be back-dated)
  /** ISO 8601 — when it was recorded. Differs from occurredAt for back-dated entries. */
  recordedAt?: string;
}

// VERIFIED (backend commits bb9f81f, 70a8609, 7c10ab0 - Customer Management V1).
//
// A Customer is the commercial identity of the party RevenueOS sells to. It is
// active or inactive (`isActive`; deactivation needs a reason, and an inactive
// customer takes no new quotation, Proforma, Sales Order, opportunity link or GST
// registration while everything it already has stays readable). Its code is
// assigned by the server (CUST-000001, ...) and never changes. A customer has
// GST registrations; one of the active ones is its default. A deal belongs to a
// customer through Opportunity.customerId, and the quotation, Proforma and Sales
// Order under it take their customer from there. See
// lib/repository/shared/customerLifecycle.ts.
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
  /** At most one active registration of a customer is its default. */
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: ID;
  customerName: string;
  /** Server-assigned (CUST-000001) for customers created through the API; older ones keep the code they were given. */
  customerCode: string;
  panNumber?: string;
  email?: string;
  phone?: string;
  customerType?: string;
  isActive: boolean;
  /**
   * Not reliable: the vendor flow sets linkedVendorId but never sets this flag,
   * so "is also a vendor" is read from `linkedVendorId`.
   */
  isVendor: boolean;
  linkedVendorId?: ID;
  /** Default registration first. */
  gstRegistrations: CustomerGstRegistration[];
  /** Set while the customer is inactive: when, by whom and why. */
  deactivatedAt?: string;
  deactivatedById?: ID;
  deactivatedByName?: string;
  deactivationReason?: string;
  createdAt: string;
  updatedAt: string;
}

/** The customer fields an opportunity carries when it is linked to one. */
export interface OpportunityCustomer {
  id: ID;
  customerCode: string;
  customerName: string;
  isActive: boolean;
}

export const CUSTOMER_EVENT_ACTIONS = [
  "CUSTOMER_CREATED",
  "CUSTOMER_UPDATED",
  "CUSTOMER_DEACTIVATED",
  "CUSTOMER_REACTIVATED",
  "GST_ADDED",
  "GST_UPDATED",
  "GST_DEACTIVATED",
  "GST_REACTIVATED",
  "GST_DEFAULT_CHANGED",
  "OPPORTUNITY_LINKED",
  "OPPORTUNITY_UNLINKED",
] as const;

const CUSTOMER_EVENT_LABEL: Record<string, string> = {
  CUSTOMER_CREATED: "Customer created",
  CUSTOMER_UPDATED: "Details updated",
  CUSTOMER_DEACTIVATED: "Deactivated",
  CUSTOMER_REACTIVATED: "Reactivated",
  GST_ADDED: "GST registration added",
  GST_UPDATED: "GST registration updated",
  GST_DEACTIVATED: "GST registration deactivated",
  GST_REACTIVATED: "GST registration reactivated",
  GST_DEFAULT_CHANGED: "Default GST registration changed",
  OPPORTUNITY_LINKED: "Opportunity linked",
  OPPORTUNITY_UNLINKED: "Opportunity unlinked",
};

export function formatCustomerEventAction(action: string): string {
  return CUSTOMER_EVENT_LABEL[action] ?? titleCaseFromConstant(action);
}

/**
 * One entry of a customer's history (GET /customers/:id/events, permission
 * customers.view): created, details changed, deactivated or reactivated, a GST
 * registration added, edited, deactivated, reactivated or made the default, an
 * opportunity linked or unlinked. Customers created before the history existed
 * have none until their next change.
 */
export interface CustomerEvent {
  id: ID;
  customerId: ID;
  action: string;
  fromStatus?: string;
  toStatus?: string;
  /** For a deactivation, the mandatory reason. */
  remarks?: string;
  /** For an edit: each field that changed. For a default change: defaultGstin. */
  changes?: Record<string, { from: string | null; to: string | null }>;
  /** The registration a GST event is about. */
  gstRegistration?: { id: ID; gstin: string; branchName?: string; legalName?: string };
  /** The opportunity a link event is about (its title is in `remarks`). */
  opportunityId?: ID;
  /** Empty when the actor's account no longer exists. */
  actorName: string;
  actorId?: ID;
  occurredAt: string;
}

export type CustomerMatchReason = "PAN" | "NAME" | "PHONE" | "EMAIL";

export interface CustomerDuplicateMatch {
  id: ID;
  customerCode: string;
  customerName: string;
  isActive: boolean;
  reasons: CustomerMatchReason[];
}

/** What GET /customers/duplicate-check found: PAN and name matches are refused by the backend, phone and email only warn. */
export interface CustomerDuplicateCheck {
  blocking: CustomerDuplicateMatch[];
  warnings: CustomerDuplicateMatch[];
}

export type QuotingBlocker = "CUSTOMER_INACTIVE" | "NO_ACTIVE_GST";

export interface CustomerOverviewOpportunity {
  id: ID;
  opportunityCode?: string;
  title: string;
  stage: string;
  expectedValue: number;
  probability: number;
  expectedCloseDate: string;
  createdAt: string;
  leadId: ID;
  leadName: string;
}

export interface CustomerOverviewQuotation {
  id: ID;
  quotationCode?: string;
  opportunityId: ID;
  quoteDate: string;
  status: string;
  taxableAmount: number;
  gstAmount: number;
  totalAmount: number;
  buyerGstId?: ID;
  createdAt: string;
}

export interface CustomerOverviewProforma {
  id: ID;
  proformaNumber?: string;
  quotationId: ID;
  issueDate: string;
  status: string;
  totalAmount: number;
  validityDate: string | null;
  isExpired: boolean;
  createdAt: string;
}

export interface CustomerOverviewOrder {
  id: ID;
  salesOrderCode?: string;
  orderDate: string;
  status: string;
  totalAmount: number;
  quotationId?: ID;
  proformaInvoiceId?: ID;
  createdAt: string;
}

/** FinanceOS data, read-only and as FinanceOS recorded it. */
export interface CustomerOverviewReceivable {
  id: ID;
  dueDate: string;
  outstandingAmount: number;
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: string;
}

export interface CustomerOverviewInvoice {
  id: ID;
  invoiceNumber?: string;
  salesOrderId: ID;
  invoiceDate: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  receivables: CustomerOverviewReceivable[];
}

/** An opportunity that is not linked to any customer but whose lead carries this customer's name: a guess, for a person to confirm by linking. */
export interface CustomerLegacyMatch {
  id: ID;
  title: string;
  stage: string;
  leadName: string;
  leadCompany?: string;
  quotationCount: number;
  matchedBy: "LEAD_NAME" | "LEAD_COMPANY";
}

export interface CustomerTotals {
  counts: { opportunities: number; quotations: number; proformas: number; salesOrders: number; invoices: number };
  /** APPROVED quotations. */
  approvedQuotationValue: number;
  /** Sales Orders that are not cancelled. */
  orderedValue: number;
  /** Invoices that are not drafts. */
  invoicedValue: number;
  /** Receivables of those invoices, as FinanceOS recorded them. */
  collectedValue: number;
  /** The same, leaving out written-off receivables. */
  outstandingValue: number;
}

/**
 * GET /customers/:id/overview (customers.view): the customer's whole
 * quote-to-cash chain, followed by id (customer -> opportunities -> quotations
 * -> proformas -> orders -> invoices -> receivables). Invoices and receivables
 * are FinanceOS data. Opportunities that are not linked to the customer are
 * never in it, however much their lead looks like the customer.
 */
export interface CustomerOverview {
  customer: Customer;
  quotingReadiness: { ready: boolean; reasons: QuotingBlocker[] };
  opportunities: CustomerOverviewOpportunity[];
  quotations: CustomerOverviewQuotation[];
  proformas: CustomerOverviewProforma[];
  salesOrders: CustomerOverviewOrder[];
  invoices: CustomerOverviewInvoice[];
  totals: CustomerTotals;
  legacyMatches: CustomerLegacyMatch[];
  /**
   * Set (by withoutCollections) when the signed-in user may see the customer but not its
   * collections: the receivables and the money figures have been taken out, and nothing
   * built from this overview may say anything about what was collected or is owed.
   */
  collectionsHidden?: boolean;
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

// VERIFIED (backend 933231a): Opportunity.status holds the stage, one of
// exactly these five raw values, and PATCH /opportunities/:id/stage is the only
// way to change it. `stage` below is that stored value as it comes back from
// the backend; the backend is the authority and the frontend keeps no stage of
// its own. Display labels come from formatOpportunityStage(). The move rules
// live in lib/repository/shared/opportunityStage.ts.
export type OpportunityStage =
  | "QUALIFIED"
  | "PROPOSAL"
  | "NEGOTIATION"
  | "WON"
  | "LOST";

export const OPPORTUNITY_STAGES: OpportunityStage[] = [
  "QUALIFIED",
  "PROPOSAL",
  "NEGOTIATION",
  "WON",
  "LOST",
];

/** Linear happy-path order for the lifecycle stepper — "Lost" is a terminal flag, not a step. */
export const OPPORTUNITY_STEPS: OpportunityStage[] = ["QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON"];

/** Presentation label for a raw stage value, e.g. "NEGOTIATION" -> "Negotiation". */
export function formatOpportunityStage(stage: string): string {
  return titleCaseFromConstant(stage);
}

export function isOpportunityStage(value: string): value is OpportunityStage {
  return (OPPORTUNITY_STAGES as string[]).includes(value);
}

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
  /** The customer this deal is for. Absent for a legacy opportunity that has not been linked to one. */
  customerId?: ID;
  customer?: OpportunityCustomer;
  /** Present only when loaded via GET /opportunities/:id, which embeds the lead. */
  lead?: Lead;
}

// VERIFIED (backend commit 1246647, Quotation Lifecycle V1): Quotation.status is
// a plain backend String with four values. A quotation is created DRAFT; revise
// moves it to REVISED (from DRAFT, REVISED, or an APPROVED one that nothing has
// been built on); approve moves a DRAFT or REVISED one to APPROVED; reject moves
// a DRAFT or REVISED one to REJECTED, which is final. There is no EXPIRED and no
// CONVERTED status: a quotation never converts into a Sales Order directly (the
// old POST /:id/convert route is retired) and "has a Sales Order" is read from
// the Sales Order itself. See lib/repository/shared/quotationLifecycle.ts.
export type QuotationStatus = "DRAFT" | "REVISED" | "APPROVED" | "REJECTED";

export const QUOTATION_STATUSES: QuotationStatus[] = ["DRAFT", "REVISED", "APPROVED", "REJECTED"];

export function formatQuotationStatus(status: string): string {
  return titleCaseFromConstant(status);
}

/**
 * One priced line of a quotation, Proforma Invoice or sales invoice, exactly as
 * the backend stored it (VERIFIED: QuotationLine, ProformaInvoiceLine and the
 * line columns of SalesInvoiceItem, backend migrations 2026-10-15). The backend
 * works out every amount (taxable = quantity x rate to the paisa, GST at the
 * HSN rate, its CGST/SGST or IGST split); the frontend only shows them. Records
 * created before lines were stored have none.
 */
export interface DocumentLine {
  lineNumber: number;
  description: string;
  hsnCode?: string;
  quantity: number;
  unitRate: number;
  taxableAmount: number;
  gstRate?: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  gstAmount: number;
  totalAmount: number;
}

export interface Quotation {
  id: ID;
  /** quotationCode from the backend (QT24/26-27/00001 for quotations created since numbering); older ones fall back to a short id reference (`#XXXXXXXX`), never a fabricated sequential number. */
  quoteNo: string;
  /** True when the backend gave the quotation a number. */
  numbered?: boolean;
  /** Its priced line(s); empty for a quotation stored before lines existed. */
  lines?: DocumentLine[];
  customerId?: ID;
  customerName: string;
  opportunityId?: ID;
  opportunityName: string;
  /** Canonical headline amount: the quotation's total (taxable amount + GST). */
  amount: number;
  status: QuotationStatus;
  ownerName: string;
  createdAt: string;
  /** Amounts: backend-computed (the mock follows the same rules with a stand-in GST rate). The backend is authoritative. */
  quoteDate?: string;
  quantity?: number;
  unitPrice?: number;
  taxableAmount?: number;
  gstPercent?: number;
  gstAmount?: number;
  totalAmount?: number;
  taxType?: string;
  placeOfSupply?: string;
  /** The GST registrations the quotation was made with. Older quotations may have none. */
  buyerGstId?: ID;
  sellerGstId?: ID;
}

/**
 * One entry of a Quotation's lifecycle history (GET /quotations/:id/events,
 * permission quotations.view). Only lifecycle actions are recorded: creation,
 * revision, approval and rejection. A quotation that existed before the
 * lifecycle was introduced has no entries for what happened earlier.
 */
export interface QuotationEvent {
  id: ID;
  quotationId: ID;
  /** QUOTATION_CREATED, QUOTATION_REVISED, QUOTATION_APPROVED or QUOTATION_REJECTED */
  action: string;
  fromStatus?: string;
  toStatus?: string;
  /** A revision's or approval's optional remarks; for a rejection, the mandatory reason. */
  remarks?: string;
  /** Amounts before/after. Present on a revision (both) and on creation (new only). */
  previousTaxableAmount?: number;
  newTaxableAmount?: number;
  previousTotalAmount?: number;
  newTotalAmount?: number;
  /** Empty when the actor's account no longer exists. */
  actorName: string;
  actorId?: ID;
  occurredAt: string;
}

const QUOTATION_EVENT_LABEL: Record<string, string> = {
  QUOTATION_CREATED: "Quotation created",
  QUOTATION_REVISED: "Revised",
  QUOTATION_APPROVED: "Approved",
  QUOTATION_REJECTED: "Rejected",
};

export function formatQuotationEventAction(action: string): string {
  return QUOTATION_EVENT_LABEL[action] ?? titleCaseFromConstant(action);
}

// VERIFIED (backend commit 1d0b1dc, Proforma Lifecycle V1): the status lives on
// ProformaInvoice.customerStatus, a plain backend String with three values. A
// Proforma is created PENDING from an APPROVED quotation; approve moves a
// PENDING one to APPROVED; cancel moves a PENDING or APPROVED one to CANCELLED,
// which is final. Expiry is not a status: a Proforma with a validity date is
// valid through the end of that day (UTC) and expired afterwards, which the
// backend reports as `isExpired`. See lib/repository/shared/proformaLifecycle.ts.
export type ProformaInvoiceStatus = "PENDING" | "APPROVED" | "CANCELLED";

export const PROFORMA_INVOICE_STATUSES: ProformaInvoiceStatus[] = ["PENDING", "APPROVED", "CANCELLED"];

export function formatProformaInvoiceStatus(status: string): string {
  return titleCaseFromConstant(status);
}

// The total is never entered: the backend derives it from the APPROVED
// quotation (an optional client total is only checked against it).
export interface ProformaInvoice {
  id: ID;
  /** proformaNumber from the backend (PI24/26-27/00001 since numbering); older ones fall back to a short id reference, never a fabricated sequential number. */
  proformaNumber: string;
  numbered?: boolean;
  /** The copy of its quotation's lines taken when it was created; empty for older ones. */
  lines?: DocumentLine[];
  quotationId: ID;
  quoteNo: string; // denormalized from the linked quotation, for display
  customerName: string; // denormalized via quotation -> opportunity -> lead
  opportunityId?: ID;
  opportunityName: string;
  issueDate: string;
  totalAmount: number;
  status: ProformaInvoiceStatus;
  validityDate: string | null;
  /** Derived by the backend from validityDate (valid through the end of that day, UTC). Never stored. */
  isExpired: boolean;
  remarks?: string;
  ownerName: string;
  createdAt: string;
}

/**
 * One entry of a Proforma Invoice's lifecycle history
 * (GET /proforma-invoices/:id/events, permission proformas.view): creation,
 * approval and cancellation. A Proforma that existed before the lifecycle was
 * introduced has no entries for what happened earlier.
 */
export interface ProformaEvent {
  id: ID;
  proformaInvoiceId: ID;
  /** PROFORMA_CREATED, PROFORMA_APPROVED or PROFORMA_CANCELLED */
  action: string;
  fromStatus?: string;
  toStatus?: string;
  /** An approval's optional remarks; for a cancellation, the mandatory reason. */
  remarks?: string;
  actorName: string;
  actorId?: ID;
  occurredAt: string;
}

const PROFORMA_EVENT_LABEL: Record<string, string> = {
  PROFORMA_CREATED: "Proforma created",
  PROFORMA_APPROVED: "Approved",
  PROFORMA_CANCELLED: "Cancelled",
};

export function formatProformaEventAction(action: string): string {
  return PROFORMA_EVENT_LABEL[action] ?? titleCaseFromConstant(action);
}

// VERIFIED: SalesOrder.status is a plain backend String (@default("OPEN")),
// no Prisma enum — same pattern as Quotation/ProformaInvoice. Since backend
// commit 1d0b1dc a Sales Order is created in exactly one way, POST /sales-orders
// from an approved Proforma Invoice, which starts it at PENDING_STORE_APPROVAL.
// "OPEN" survives only on orders created earlier by the retired quotation
// conversion and workflow trigger (legacy rows; they are never repaired).
// RevenueOS moves an order through its pre-dispatch lifecycle:
// PENDING_STORE_APPROVAL -> PENDING_ACCOUNTS_APPROVAL (an advance receipt is
// verified) -> READY_FOR_DISPATCH_ORDER (Accounts commercial approval), and can
// cancel it — see lib/repository/shared/salesOrderLifecycle.ts. Other values
// observed in real data (e.g. "READY_FOR_INVOICING", "DISPATCH_ORDER_CREATED")
// are written by OperationsOS, so this stays a plain string rather than a
// closed union, and no frontend action is offered for those values.
export function formatSalesOrderStatus(status: string): string {
  return titleCaseFromConstant(status);
}

// VERIFIED CreateSalesOrderDto: proformaInvoiceId, orderDate,
// inventoryItemId, orderQty, sellerGstId, buyerGstId — see
// CreateSalesOrderInput. The order's total is NOT sent: the backend takes it
// from the approved Proforma Invoice's totalAmount. An order created through
// that route carries proformaInvoiceId (and, resolved through the Proforma, its
// quotation); a legacy order created by the retired conversion carries
// quotationId only. customerName/opportunityName/ownerName/quoteNo/
// proformaNumber are always denormalized from whichever linked Quotation/
// Proforma Invoice is resolvable.
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

// ---------------------------------------------------------------------------
// Sales Order commercial workflow (backend commits 1aa1a6c + 85c3666).
// Payment types, modes and verification outcomes mirror the backend's accepted
// values (and the Prisma enums PaymentType / PaymentMode).
// ---------------------------------------------------------------------------
export const SALES_ORDER_PAYMENT_TYPES = ["FULL_ADVANCE", "PARTIAL_ADVANCE", "CREDIT"] as const;
export type SalesOrderPaymentType = (typeof SALES_ORDER_PAYMENT_TYPES)[number];

export const SALES_ORDER_PAYMENT_MODES = ["CASH", "CHEQUE", "BANK_TRANSFER", "RTGS", "NEFT", "IMPS", "UPI"] as const;
export type SalesOrderPaymentMode = (typeof SALES_ORDER_PAYMENT_MODES)[number];

/** The only outcomes a verification can have. A receipt starts PENDING. */
export const ADVANCE_RECEIPT_OUTCOMES = ["VERIFIED", "REJECTED"] as const;
export type AdvanceReceiptOutcome = (typeof ADVANCE_RECEIPT_OUTCOMES)[number];

export function formatPaymentType(value: string): string {
  return titleCaseFromConstant(value);
}

export function formatPaymentMode(value: string): string {
  return titleCaseFromConstant(value);
}

export interface SalesOrderPaymentTerm {
  id: ID;
  salesOrderId: ID;
  paymentType: string;
  advanceAmount: number;
  balanceAmount: number;
  creditDays?: number;
  dueDate?: string;
  remarks?: string;
  createdAt: string;
}

export interface SalesOrderAdvanceReceipt {
  id: ID;
  salesOrderId: ID;
  receiptDate: string;
  amountReceived: number;
  paymentMode: string;
  referenceNo?: string;
  remarks?: string;
  /** PENDING until verified; then VERIFIED or REJECTED. */
  verificationStatus: string;
  /** Legacy display name the backend fills from the signed-in user. Not the actor of record (that is the lifecycle event's actor). */
  verifiedBy?: string;
  verifiedAt?: string;
  createdAt: string;
}

export interface SalesOrderCommercialApproval {
  id: ID;
  salesOrderId: ID;
  /** Legacy display name the backend fills from the signed-in user. Not the actor of record. */
  approvedBy: string;
  remarks?: string;
  /** APPROVED while in force; RETRACTED once it was undone (the row is kept, a later approval is a new row). */
  status: string;
  createdAt: string;
}

/**
 * One row of a Sales Order's lifecycle (audit) history: who verified, rejected
 * or approved, with what result. Separate from general notes. The backend
 * writes these only for advance verification, rejection and accounts approval
 * (not for order creation, payment terms or receipt entry).
 */
export interface SalesOrderEvent {
  id: ID;
  salesOrderId: ID;
  /**
   * ADVANCE_RECEIPT_VERIFIED, ADVANCE_RECEIPT_REJECTED, ACCOUNTS_APPROVED,
   * ADVANCE_RECEIPT_VERIFICATION_RETRACTED, ACCOUNTS_APPROVAL_RETRACTED or SALES_ORDER_CANCELLED
   */
  action: string;
  /** VERIFIED, REJECTED, APPROVED, RETRACTED or CANCELLED */
  result?: string;
  fromStatus?: string;
  toStatus?: string;
  /** The receipt or approval the event is about; none for a cancellation. */
  referenceId?: ID;
  /** For a retraction or cancellation this is the mandatory reason. */
  remarks?: string;
  /** From the event's actor { id, fullName }; empty when the account no longer exists. */
  actorName: string;
  actorId?: ID;
  occurredAt: string;
}

const SALES_ORDER_EVENT_LABEL: Record<string, string> = {
  ADVANCE_RECEIPT_VERIFIED: "Advance receipt verified",
  ADVANCE_RECEIPT_REJECTED: "Advance receipt rejected",
  ACCOUNTS_APPROVED: "Accounts commercial approval given",
  ADVANCE_RECEIPT_VERIFICATION_RETRACTED: "Advance verification retracted",
  ACCOUNTS_APPROVAL_RETRACTED: "Accounts approval retracted",
  SALES_ORDER_CANCELLED: "Sales Order cancelled",
};

export function formatSalesOrderEventAction(action: string): string {
  return SALES_ORDER_EVENT_LABEL[action] ?? titleCaseFromConstant(action);
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
  /** VERIFIED: GET /dispatch-orders already returns these logistics fields — surfaced read-only, never editable here (no Dispatch Order management UI exists, only visibility). Frequently null on real records that haven't reached that stage of logistics prep yet. */
  transportName?: string | null;
  vehicleNumber?: string | null;
  driverName?: string | null;
  lrNumber?: string | null;
  destination?: string | null;
  expectedDelivery?: string | null;
}

// DispatchOrder.status is an open-ended OperationsOS-owned backend string —
// only LOGISTICS_PREPARING and DISPATCHED are ever offered/observed through
// this app's own read paths, shown honestly via the neutral fallback tint
// for anything else rather than styled as if this screen recognizes it.
export function formatDispatchOrderStatus(status: string): string {
  return titleCaseFromConstant(status);
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
  /** invoiceNumber from the backend (SI24/26-27/00001 for invoices issued since numbering); older ones fall back to a short id reference, never a fabricated sequence number. */
  invoiceNumber: string;
  /** True when the backend numbered the invoice: only then can it be printed as a tax invoice. */
  numbered?: boolean;
  /** The priced lines it was issued with (with HSN); empty for older invoices. */
  items?: DocumentLine[];
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
  /** VERIFIED: GET /sales-invoices already nests these on the linked DispatchOrder — same read-only logistics visibility as DispatchOrderOption, surfaced here so the invoice detail page doesn't need a separate Dispatch Order fetch. */
  dispatchTransportName?: string | null;
  dispatchVehicleNumber?: string | null;
  dispatchDriverName?: string | null;
  dispatchLrNumber?: string | null;
  dispatchDestination?: string | null;
  dispatchExpectedDelivery?: string | null;
  /** For display: the invoice's own name, else the Sales Order's, else "—". Do not use it to say what the invoice says. */
  customerName: string;
  /**
   * What the invoice record itself says: the backend's customerName, untouched by any fallback,
   * and undefined when it is blank. This is the name the customer ledger is keyed by, so it is the
   * only one that may be shown as "Name on invoice" or checked for "no customer name".
   */
  invoiceCustomerName?: string;
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

// VERIFIED (backend, Payment Collection V1): a payment received against one
// receivable. Written only by POST /payment-collections, in one transaction with
// the receivable update, the customer-ledger credit and an event. `recordedBy*` is
// the signed-in user who recorded it; it is absent on collections recorded before
// the recorder was kept. `paymentMode` is one of PAYMENT_MODES on new collections;
// older ones keep whatever text they were saved with (for example "Bank Transfer").
export interface PaymentCollectionRecord {
  id: ID;
  accountsReceivableId: ID;
  paymentDate: string;
  amount: number;
  paymentMode: string;
  referenceNumber?: string;
  remarks?: string;
  createdAt: string;
  recordedById?: ID;
  recordedByName?: string;
}

// What happened to a payment collection: who, when, and what it did to the
// receivable. The amount, balances and statuses are snapshots taken in the same
// transaction as the change. Collections recorded before events existed have none.
export type PaymentCollectionEventAction = "PAYMENT_RECORDED";

export interface PaymentCollectionEvent {
  id: ID;
  paymentCollectionId: ID;
  accountsReceivableId: ID;
  salesInvoiceId: ID;
  action: PaymentCollectionEventAction | string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  fromStatus?: string;
  toStatus?: string;
  remarks?: string;
  actorId: ID;
  actorName: string;
  occurredAt: string;
}

// A collection as GET /payment-collections returns it: with its receivable's
// current figures and the invoice it was collected against.
export interface PaymentCollection extends PaymentCollectionRecord {
  salesInvoiceId: ID;
  invoiceNumber?: string;
  customerName?: string;
  /** The receivable's figures NOW, not at the time of this payment. */
  receivableStatus?: string;
  receivableBalance?: number;
}

export interface PaymentCollectionDetail extends PaymentCollection {
  events: PaymentCollectionEvent[];
}

// GET /payment-collections/invoices/:salesInvoiceId: one invoice's receivable with
// every payment collected against it and the events behind them.
export interface InvoiceCollections {
  receivable: AccountsReceivable;
  collections: PaymentCollectionRecord[];
  events: PaymentCollectionEvent[];
}

export interface RecordPaymentResult {
  paymentRecord: PaymentCollectionRecord;
  /** Carries no nested invoice; read GET /payment-collections/invoices/:id for the display copy. */
  updatedReceivable: AccountsReceivable;
  event: PaymentCollectionEvent;
}

// One CustomerLedger row as stored — the ledger every Sales Invoice, Payment
// Collection, Credit Note and Debit Note writes to (the mock ledger keeps rows in this
// shape). Entries have NO PaymentCollection id and no structured payment-mode field —
// payment mode only ever appears inside the free-text `remarks` (e.g. "Payment received
// UTR10001"). Do not present these as PaymentCollection records; present as ledger /
// statement history only. See the Stage 2G report.
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

/** A statement period: calendar days (YYYY-MM-DD), both inclusive; absent = open-ended. */
export interface StatementPeriod {
  from?: string;
  to?: string;
}

/** One line of a ledger statement: the stored remarks as recorded, the balance recomputed. */
export interface CustomerLedgerStatementLine {
  id: ID;
  entryDate: string;
  salesInvoiceId: ID;
  invoiceNumber?: string;
  debit: number;
  credit: number;
  runningBalance: number;
  remarks?: string;
}

// VERIFIED: GET /customers/:id/statement (collections.view). The customer's
// CustomerLedger rows, found by id through the same chain as the customer overview
// (customer -> linked opportunities -> quotations -> proformas -> sales orders ->
// invoices), never by name. Balances come from debits and credits (positive = owed by
// the customer); ledger-derived only, never mixed with receivables. Rows of
// opportunities not linked to the customer are left out and counted in coverage.
export interface CustomerStatement {
  customer: Pick<Customer, "id" | "customerCode" | "customerName" | "isActive">;
  period: { from: string | null; to: string | null };
  currency: "INR";
  openingBalance: number;
  totalDebits: number;
  totalCredits: number;
  closingBalance: number;
  entries: CustomerLedgerStatementLine[];
  coverage: { postedInvoicesWithoutLedgerEntries: number; unlinkedLegacyMatches: number };
  generatedAt: string;
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

// The company document profile (VERIFIED: GET/PUT /document-profile and
// PUT/DELETE /document-profile/logo, permission documents.profile.manage):
// what the company prints on its documents besides its master data. Every
// field may be empty; an empty field is simply not printed.
export interface DocumentProfile {
  company: {
    id: ID;
    companyCode: string;
    companyName: string;
    panNumber: string;
    cinNumber?: string;
    email?: string;
    phone?: string;
    website?: string;
  };
  registrations: Array<{ id: ID; gstin: string; legalName: string; tradeName?: string; stateCode: string; stateName: string; isDefault: boolean; isActive: boolean }>;
  profile: DocumentProfileFields & { logo: { mimeType: string; base64: string } | null; updatedAt?: string };
}

export interface DocumentProfileFields {
  registeredOfficeAddress: string | null;
  bankAccountName: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankIfsc: string | null;
  bankBranch: string | null;
  upiId: string | null;
  quotationTerms: string | null;
  proformaTerms: string | null;
  invoiceTerms: string | null;
  receiptNote: string | null;
  signatoryName: string | null;
  signatoryDesignation: string | null;
}

// VERIFIED: POST /receipt-vouchers/:paymentCollectionId/generate
// (collections.record) gives a payment its receipt; a payment has at most one
// and asking again returns it. GET /receipt-vouchers?salesInvoiceId= and GET
// /receipt-vouchers/:id/document.pdf (collections.view) list an invoice's
// receipts and download one, built in memory.
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
  | "cal"
  // Generic fallback for real backend-sourced notifications — the live
  // core/notifications module has no per-category icon concept, only a
  // category/priority/referenceType string trio that doesn't map cleanly
  // onto the specific icons above without guessing at meaning the backend
  // doesn't actually convey.
  | "bell";

export interface AppNotification {
  id: ID;
  icon: NotificationIcon;
  text: string;
  occurredAt: string; // ISO 8601
  unread: boolean;
}

// ============================================================================
// STAGE 2I — DASHBOARD & ANALYTICS
// ============================================================================
// VERIFIED: GET /sales-reports/revenue-summary sums every SalesInvoice,
// all-time — no date-range parameter exists on this or any other analytics
// endpoint in this backend. Do not present this as period-scoped (e.g. "this
// month") unless it is genuinely recomputed client-side from fetched
// records with real createdAt values. See the Stage 2I report.
export interface SalesRevenueSummary {
  totalRevenue: number;
  taxableRevenue: number;
  totalTax: number;
}

// VERIFIED: GET /collections-dashboard/summary — sums the authoritative
// AccountsReceivable.balanceAmount/paidAmount fields directly (same rule
// established in Stage 2G: AccountsReceivable is authoritative for payment
// state, never SalesInvoice.paymentStatus).
export interface CollectionsSummary {
  totalInvoices: number;
  totalOutstanding: number;
  totalCollected: number;
}

// VERIFIED: GET /collections-dashboard/aging — buckets AccountsReceivable
// balances by days past their dueDate. No above-90 sub-buckets.
export interface CollectionsAging {
  days0to30: number;
  days31to60: number;
  days61to90: number;
  above90: number;
}

// VERIFIED: GET /collections-dashboard/efficiency — counts AccountsReceivable
// rows by their authoritative paymentStatus (PENDING/PARTIAL/PAID/WRITTEN_OFF
// — see AccountsReceivable). This is the real AR status distribution.
export interface CollectionsEfficiency {
  total: number;
  paid: number;
  partial: number;
  pending: number;
  writtenOff: number;
}

// VERIFIED: GET /collections-dashboard/recovery-rate.
export interface CollectionsRecoveryRate {
  totalInvoiceValue: number;
  totalCollected: number;
  recoveryRate: string; // backend returns a formatted "NN.NN%" string, not a number
}
