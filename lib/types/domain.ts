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
