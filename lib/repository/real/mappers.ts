import {
  Lead,
  LeadFollowup,
  LeadFollowupStatus,
  LeadNoteEntry,
  LeadSourceRecord,
  LeadStatus,
  LeadTimelineEntry,
  AssignableUser,
  Opportunity,
  Quotation,
  QuotationStatus,
  InventoryItemOption,
  GstRegistrationOption,
  titleCaseFromConstant,
} from "../../types/domain";

/**
 * Raw shapes as the backend actually returns them (Stage 2A discovery
 * report / docs/backend-ui-contract.md). Deliberately loose (fields
 * optional/unknown where the backend's own typing is loose) — these map
 * verified backend field names into the frontend's own domain types, never
 * the other way around.
 */
export interface BackendUser {
  id: string;
  fullName?: string;
  email?: string;
  [key: string]: unknown; // e.g. passwordHash — never read past id/fullName below.
}

export interface BackendLeadSource {
  id: string;
  name: string;
  description?: string | null;
}

export interface BackendLeadNote {
  id: string;
  leadId: string;
  note: string;
  createdAt: string;
}

export interface BackendLeadTimeline {
  id: string;
  leadId: string;
  action: string;
  remarks?: string | null;
  createdAt: string;
}

export interface BackendLeadFollowup {
  id: string;
  leadId: string;
  followupDate: string;
  remarks?: string | null;
  status: LeadFollowupStatus;
  completedAt?: string | null;
  completedById?: string | null;
  completedBy?: BackendUser | null;
  createdAt: string;
  updatedAt: string;
}

export interface BackendLead {
  id: string;
  customerName: string;
  companyName?: string | null;
  email?: string | null;
  phone: string;
  alternatePhone?: string | null;
  sourceId: string;
  source?: BackendLeadSource | null;
  status: string;
  assignedToId?: string | null;
  assignedTo?: BackendUser | null;
  createdAt: string;
  updatedAt: string;
  notes?: BackendLeadNote[];
  timelines?: BackendLeadTimeline[];
  followups?: BackendLeadFollowup[];
}

export interface BackendOpportunity {
  id: string;
  opportunityCode?: string | null;
  leadId: string;
  title: string;
  expectedValue: number;
  probability: number;
  expectedCloseDate: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
  lead?: { id: string; customerName: string; assignedToId?: string | null } | null;
}

export function mapLeadSource(raw: BackendLeadSource): LeadSourceRecord {
  return { id: raw.id, name: raw.name, description: raw.description ?? undefined };
}

export function mapAssignableUser(raw: BackendUser): AssignableUser {
  return { id: raw.id, name: raw.fullName || raw.email || raw.id };
}

export function mapLeadNote(raw: BackendLeadNote): LeadNoteEntry {
  return { id: raw.id, leadId: raw.leadId, note: raw.note, createdAt: raw.createdAt };
}

const TIMELINE_ICON_BY_ACTION: Record<string, string> = {
  LEAD_CREATED: "funnel",
  LEAD_UPDATED: "pulse",
  PRE_SALES_ASSIGNED: "user",
  LEAD_QUALIFIED: "check",
  LEAD_REJECTED: "close",
  STATUS_UPDATED: "pulse",
  FOLLOWUP_CREATED: "cal",
  FOLLOWUP_COMPLETED: "checksq",
  FOLLOWUP_RESCHEDULED: "clock",
  FOLLOWUP_CANCELLED: "close",
  OPPORTUNITY_CREATED: "brief",
};

/**
 * Maps the real LeadTimeline { action, remarks?, createdAt } into the shape
 * the existing Lead Detail timeline UI already renders. actorName is left
 * empty — the backend timeline entry has no actor/user relation at all
 * (confirmed against leadTimeline.create() call sites) — never fabricate a
 * name for it.
 */
export function mapLeadTimeline(raw: BackendLeadTimeline): LeadTimelineEntry {
  return {
    id: raw.id,
    leadId: raw.leadId,
    icon: TIMELINE_ICON_BY_ACTION[raw.action] ?? "pulse",
    title: titleCaseFromConstant(raw.action),
    detail: raw.remarks ?? "",
    actorName: "",
    occurredAt: raw.createdAt,
  };
}

export function mapLeadFollowup(raw: BackendLeadFollowup): LeadFollowup {
  return {
    id: raw.id,
    leadId: raw.leadId,
    followupDate: raw.followupDate,
    remarks: raw.remarks ?? undefined,
    status: raw.status,
    completedAt: raw.completedAt ?? null,
    completedByName: raw.completedBy?.fullName ?? undefined,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

export function mapLead(raw: BackendLead): Lead {
  return {
    id: raw.id,
    customerName: raw.customerName,
    companyName: raw.companyName ?? undefined,
    email: raw.email ?? undefined,
    phone: raw.phone,
    alternatePhone: raw.alternatePhone ?? undefined,
    sourceId: raw.sourceId ?? raw.source?.id ?? "",
    sourceName: raw.source?.name ?? "Unknown source",
    status: raw.status as LeadStatus,
    assignedToId: raw.assignedToId ?? undefined,
    assignedToName: raw.assignedTo?.fullName ?? undefined,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    lastActivityAt: raw.updatedAt,
    followups: raw.followups?.map(mapLeadFollowup),
    notes: raw.notes?.map(mapLeadNote),
  };
}

export interface BackendInventoryItem {
  id: string;
  productName: string;
  sku?: string;
}

export function mapInventoryItem(raw: BackendInventoryItem): InventoryItemOption {
  return { id: raw.id, name: raw.sku ? `${raw.productName} (${raw.sku})` : raw.productName };
}

export interface BackendGstRegistration {
  id: string;
  gstin: string;
  legalName: string;
  branchName?: string | null;
  stateCode: string;
}

/** Shared shape/label rule for both GET /company-gst (seller) and GET /customer-gst (buyer) — identically-shaped GST registration records. */
export function mapGstRegistration(raw: BackendGstRegistration): GstRegistrationOption {
  return {
    id: raw.id,
    label: raw.branchName ? `${raw.legalName} — ${raw.gstin} (${raw.branchName})` : `${raw.legalName} — ${raw.gstin}`,
    stateCode: raw.stateCode,
  };
}

export interface BackendQuotation {
  id: string;
  quotationCode?: string | null;
  opportunityId: string;
  quoteDate: string;
  quantity?: number;
  unitPrice?: number;
  sellerGstId?: string | null;
  buyerGstId?: string | null;
  placeOfSupply?: string | null;
  taxType?: string | null;
  taxableAmount: number;
  gstPercent: number;
  gstAmount: number;
  totalAmount: number;
  status: string;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Maps a real Quotation, cross-referencing an already-resolved Opportunity
 * map for customerName/opportunityName/ownerName — GET /quotations only
 * nests the raw Opportunity (no customerName field exists on it directly;
 * that's a frontend-derived field from the linked Lead), so the caller
 * supplies the same fully-resolved Opportunity list the Opportunities
 * screen itself uses. See docs/backend-ui-contract.md §8.
 */
export function mapQuotation(raw: BackendQuotation, opportunityById: Map<string, Opportunity>): Quotation {
  const opp = opportunityById.get(raw.opportunityId);
  return {
    id: raw.id,
    // No verified code path ever sets quotationCode — fall back to a short,
    // honestly-labeled id reference rather than fabricating a sequence number.
    quoteNo: raw.quotationCode || `#${raw.id.slice(0, 8).toUpperCase()}`,
    customerName: opp?.customerName ?? "—",
    opportunityId: raw.opportunityId,
    opportunityName: opp?.title ?? "—",
    amount: raw.totalAmount,
    status: raw.status as QuotationStatus,
    validUntil: null,
    ownerName: opp?.ownerName ?? "Unassigned",
    createdAt: raw.createdAt,
    version: 1,
    revisions: [],
    quoteDate: raw.quoteDate,
    quantity: raw.quantity,
    unitPrice: raw.unitPrice,
    taxableAmount: raw.taxableAmount,
    gstPercent: raw.gstPercent,
    gstAmount: raw.gstAmount,
    totalAmount: raw.totalAmount,
    taxType: raw.taxType ?? undefined,
    placeOfSupply: raw.placeOfSupply ?? undefined,
  };
}
