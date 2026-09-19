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

// UI ASSUMPTION: verified timeline actions include LEAD_QUALIFIED and
// LEAD_REJECTED as distinct, permission-gated events (leads.qualify /
// leads.reject) separate from ordinary status movement — so "Qualified" and
// "Rejected" are reachable only through the dedicated Qualify/Reject actions,
// never a casual drag on the pipeline board. Exact backend enum values are
// NOT confirmed; see docs/backend-ui-contract.md §3, §21.
export type LeadStatus = "New" | "Contacted" | "Qualified" | "Rejected";

export const LEAD_STATUSES: LeadStatus[] = ["New", "Contacted", "Qualified", "Rejected"];

/** Freely draggable on the Lead Pipeline board — Qualified/Rejected are gated actions, not drag targets. */
export const LEAD_BOARD_STATUSES: LeadStatus[] = ["New", "Contacted"];

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
  score: LeadScore;
  // Unset until the dedicated Assign action fires (AssignLeadDto / PRE_SALES_ASSIGNED).
  assignedToId?: ID;
  assignedToName?: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  lastActivityAt: string; // ISO 8601
  /** MOCK/UI-ONLY — see LeadUIContext. Not part of the verified Lead contract. */
  uiContext?: LeadUIContext;
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

export interface Customer {
  id: ID;
  name: string;
  industry: string;
  city: string;
  ownerId: ID;
  ownerName: string;
  lifetimeValue: number; // INR
  openOrders: number;
  status: CustomerStatus;
  customerSince: string; // ISO 8601
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

// UI ASSUMPTION: not a confirmed backend enum. VERIFIED is only that an
// Opportunity carries expectedValue/probability/expectedCloseDate and a
// backend-owned status; see docs/backend-ui-contract.md §7, §21.
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

// VERIFIED status values, corrected from the prototype's invented
// Sent/Viewed/Accepted/Rejected/Expired: the backend confirms quotations
// start at DRAFT, `revise` sets REVISED, `approve` sets APPROVED, and
// `convert` creates a SalesOrder (modeled here as CONVERTED, though no
// quotation is seeded in that state since Sales Orders don't exist in the
// frontend yet). See docs/backend-ui-contract.md §8.
export type QuotationStatus = "Draft" | "Revised" | "Approved" | "Converted";

export const QUOTATION_STATUSES: QuotationStatus[] = ["Draft", "Revised", "Approved", "Converted"];

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
  quoteNo: string;
  customerId?: ID;
  customerName: string;
  opportunityId?: ID;
  opportunityName: string;
  amount: number;
  status: QuotationStatus;
  validUntil: string | null; // ISO 8601
  ownerName: string;
  createdAt: string;
  /** MOCK/UI-ONLY current revision number — see QuotationRevision. */
  version: number;
  /** MOCK/UI-ONLY revision trail — see QuotationRevision. */
  revisions: QuotationRevision[];
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
