import {
  Lead,
  LeadFollowup,
  LeadFollowupStatus,
  LeadNoteEntry,
  LeadSourceRecord,
  LeadStatus,
  LeadTimelineEntry,
  LeadTimelineSource,
  LeadActivityType,
  AssignableUser,
  Opportunity,
  OpportunityStage,
  Quotation,
  DocumentLine,
  QuotationEvent,
  ProformaEvent,
  QuotationStatus,
  ProformaInvoice,
  ProformaInvoiceStatus,
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
  PaymentCollection,
  PaymentCollectionDetail,
  InvoiceCollections,
  CustomerStatement,
  ReceiptVoucher,
  Customer,
  CustomerDuplicateCheck,
  CustomerEvent,
  CustomerGstRegistration,
  CustomerMatchReason,
  CustomerOverview,
  CustomerTotals,
  QuotingBlocker,
  SalesRevenueSummary,
  CollectionsSummary,
  CollectionsAging,
  CollectionsEfficiency,
  CollectionsRecoveryRate,
  InventoryItemOption,
  GstRegistrationOption,
  AppNotification,
  titleCaseFromConstant,
  leadActivityMeta,
  isOpportunityStage,
  CustomerDuplicateMatch,
  CustomerMatchStrength,
} from "../../types/domain";
import { isProformaExpired } from "../shared/proformaLifecycle";
import { outcomeOfLastCall } from "../shared/leadSearch";

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
  status?: string;
  [key: string]: unknown; // e.g. passwordHash — never read past id/fullName/status below.
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
  /** Absent on responses from a backend that predates attributed activity. */
  source?: LeadTimelineSource;
  activityType?: LeadActivityType | null;
  /** The remark a person wrote on the event (stage move, status move, unassign, rejection, reopening); null otherwise. */
  userRemark?: string | null;
  /** VERIFIED (lifecycle v2): a CALL's outcome. */
  outcome?: "CONNECTED" | "NOT_CONNECTED" | null;
  actorId?: string | null;
  /** Selected as { id, fullName } only — never a full User row. */
  actor?: { id: string; fullName?: string | null } | null;
  occurredAt?: string;
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
  /** Absent on a backend that predates lead deactivation: such leads are all active. */
  isActive?: boolean;
  deactivatedAt?: string | null;
  deactivatedById?: string | null;
  /** Selected as { id, fullName } only. */
  deactivatedBy?: { id: string; fullName?: string | null } | null;
  deactivationReason?: string | null;
  /** Absent on a backend that predates lead location, and null on a lead recorded without one. */
  country?: string | null;
  state?: string | null;
  city?: string | null;
  createdAt: string;
  updatedAt: string;
  notes?: BackendLeadNote[];
  timelines?: BackendLeadTimeline[];
  followups?: BackendLeadFollowup[];
  /** Lead.inventoryItemId's item, selected as { id, sku, productName, category }; absent on older backends. */
  inventoryItem?: { id: string; sku?: string | null; productName: string; category?: string | null } | null;
  /** GET /leads/search rows only. */
  presales?: Array<{ id: string; fullName: string | null }>;
  salesOwner?: { id: string; fullName: string | null } | null;
  lastCallOutcome?: string | null;
  /** GET /leads and GET /leads/:id include the lead's opportunities (plain rows). */
  opportunities?: Array<Pick<BackendOpportunity, "id" | "title" | "status" | "expectedValue" | "probability" | "createdAt">>;
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
  customerId?: string | null;
  customer?: { id: string; customerCode: string; customerName: string; isActive: boolean } | null;
  lead?: BackendLead | null;
}

/**
 * Opportunity.status is the stage, one of exactly five values. Anything else
 * (for example a row that still reads OPEN because the stage migration has not
 * been applied) is a contract problem, so it surfaces as a clear error and is
 * never shown as if it were a real stage.
 */
export function mapOpportunityStage(status: string): OpportunityStage {
  if (isOpportunityStage(status)) return status;
  throw new Error(
    `An opportunity has an unrecognised stage ("${status}"). Ask an administrator to check that the opportunity stage update has been applied.`
  );
}

export function mapLeadSource(raw: BackendLeadSource): LeadSourceRecord {
  return { id: raw.id, name: raw.name, description: raw.description ?? undefined };
}

export function mapAssignableUser(raw: BackendUser): AssignableUser {
  // GET /users returns status ACTIVE | INACTIVE | SUSPENDED; a row without one is
  // offered (the backend still decides).
  return { id: raw.id, name: raw.fullName || raw.email || raw.id, active: raw.status === undefined || raw.status === "ACTIVE" };
}

export function mapLeadNote(raw: BackendLeadNote): LeadNoteEntry {
  return { id: raw.id, leadId: raw.leadId, note: raw.note, createdAt: raw.createdAt };
}

const TIMELINE_ICON_BY_ACTION: Record<string, string> = {
  LEAD_CREATED: "funnel",
  LEAD_UPDATED: "pulse",
  PRE_SALES_ASSIGNED: "user",
  LEAD_UNASSIGNED: "user",
  LEAD_QUALIFIED: "check",
  LEAD_REJECTED: "close",
  LEAD_REOPENED: "restore",
  STATUS_UPDATED: "pulse",
  FOLLOWUP_CREATED: "cal",
  FOLLOWUP_COMPLETED: "checksq",
  FOLLOWUP_RESCHEDULED: "clock",
  FOLLOWUP_CANCELLED: "close",
  OPPORTUNITY_CREATED: "brief",
  OPPORTUNITY_STAGE_CHANGED: "pulse",
  LEAD_DEACTIVATED: "alert",
  LEAD_REACTIVATED: "check",
  LEAD_RESTORED: "restore",
  LEAD_DUPLICATE_REMOVED: "trash",
  LEAD_DUPLICATE_RESTORED: "restore",
  CONTENT_SHARED: "share",
};

/**
 * Maps a real LeadTimeline row into the shape the Lead timeline UI renders.
 *
 * SYSTEM rows (and every pre-attribution historical row, which the backend
 * migration marks SYSTEM) keep the action-code presentation. Most have no actor;
 * lifecycle events performed by a person (LEAD_DEACTIVATED, LEAD_REACTIVATED)
 * carry one, shown as "by <name>". They are still system events, never
 * employee activity.
 * EMPLOYEE rows are typed activity: the title is the activity type, the detail
 * is the employee's remarks, and the actor is the selected { id, fullName }.
 * An EMPLOYEE row can legitimately have no actor (the author's account was
 * later deleted) — that renders as an unattributed entry, never a made-up name.
 */
export function mapLeadTimeline(raw: BackendLeadTimeline): LeadTimelineEntry {
  const occurredAt = raw.occurredAt ?? raw.createdAt;

  if (raw.source === "EMPLOYEE") {
    const meta = leadActivityMeta(raw.activityType ?? "OTHER");
    return {
      id: raw.id,
      leadId: raw.leadId,
      source: "EMPLOYEE",
      activityType: raw.activityType ?? "OTHER",
      icon: meta.icon,
      title: meta.label,
      detail: raw.remarks ?? "",
      ...(raw.outcome ? { outcome: raw.outcome } : {}),
      actorName: raw.actor?.fullName ?? "",
      actorId: raw.actor?.id ?? undefined,
      occurredAt,
      recordedAt: raw.createdAt,
    };
  }

  return {
    id: raw.id,
    leadId: raw.leadId,
    source: "SYSTEM",
    icon: TIMELINE_ICON_BY_ACTION[raw.action] ?? "pulse",
    title: titleCaseFromConstant(raw.action),
    detail: raw.remarks ?? "",
    // Only a remark with something in it; the system sentence above is never touched.
    userRemark: raw.userRemark && raw.userRemark.trim() !== "" ? raw.userRemark : undefined,
    actorName: raw.actor?.fullName ?? "",
    actorId: raw.actor?.id ?? undefined,
    occurredAt,
    recordedAt: raw.createdAt,
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
    isActive: raw.isActive ?? true,
    deactivatedAt: raw.deactivatedAt ?? undefined,
    deactivatedById: raw.deactivatedById ?? undefined,
    deactivatedByName: raw.deactivatedBy?.fullName ?? undefined,
    deactivationReason: raw.deactivationReason ?? undefined,
    country: raw.country ?? undefined,
    state: raw.state ?? undefined,
    city: raw.city ?? undefined,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    lastActivityAt: raw.updatedAt,
    ...(raw.presales ? { presales: raw.presales.map((p) => ({ id: p.id, name: p.fullName ?? "Former user" })) } : {}),
    ...(raw.salesOwner ? { salesOwnerId: raw.salesOwner.id, salesOwnerName: raw.salesOwner.fullName ?? "Former user" } : {}),
    ...(raw.lastCallOutcome !== undefined ? { lastCallOutcome: outcomeOfLastCall(raw.lastCallOutcome) } : {}),
    ...(raw.inventoryItem ? { product: mapLeadProduct(raw.inventoryItem) } : {}),
    followups: raw.followups?.map(mapLeadFollowup),
    // A row with an unrecognised stage is left out here (the Opportunities page reports it);
    // one bad row must not hide the whole lead list.
    opportunities: raw.opportunities?.flatMap((o) =>
      isOpportunityStage(o.status)
        ? [{ id: o.id, title: o.title, stage: o.status, expectedValue: Number(o.expectedValue) || 0, probability: Number(o.probability) || 0, createdAt: o.createdAt }]
        : []
    ),
    notes: raw.notes?.map(mapLeadNote),
    timelines: raw.timelines?.map(mapLeadTimeline),
  };
}

export interface BackendInventoryItem {
  id: string;
  productName: string;
  sku?: string;
  stockQty?: number;
  availableQty?: number;
}

/** An enquiry's product, named like the product pickers ("Needle Loom 100 (NL-100)"). */
export function mapLeadProduct(raw: NonNullable<BackendLead["inventoryItem"]>): { id: string; name: string; category: string | null } {
  return { id: raw.id, name: raw.sku ? `${raw.productName} (${raw.sku})` : raw.productName, category: raw.category ?? null };
}

export function mapInventoryItem(raw: BackendInventoryItem): InventoryItemOption {
  return {
    id: raw.id,
    name: raw.sku ? `${raw.productName} (${raw.sku})` : raw.productName,
    stockQty: raw.stockQty,
    availableQty: raw.availableQty,
  };
}

export interface BackendGstRegistration {
  id: string;
  gstin: string;
  legalName: string;
  branchName?: string | null;
  stateCode: string;
  isDefault: boolean;
  isActive: boolean;
}

/** Shared shape/label rule for both GET /company-gst (seller) and GET /customer-gst (buyer) — identically-shaped GST registration records. */
export function mapGstRegistration(raw: BackendGstRegistration): GstRegistrationOption {
  return {
    id: raw.id,
    label: raw.branchName ? `${raw.legalName} — ${raw.gstin} (${raw.branchName})` : `${raw.legalName} — ${raw.gstin}`,
    stateCode: raw.stateCode,
    isActive: raw.isActive,
    isDefault: raw.isDefault,
  };
}

/** VERIFIED: QuotationLine / ProformaInvoiceLine (backend migration 20261015_quotation_proforma_lines.sql). */
export interface BackendDocumentLine {
  id: string;
  lineNumber: number;
  inventoryItemId?: string | null;
  description: string;
  hsnCode?: string | null;
  quantity: number;
  unitRate: number;
  taxableAmount: number;
  gstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  gstAmount: number;
  totalAmount: number;
}

export function mapDocumentLine(raw: BackendDocumentLine): DocumentLine {
  return {
    lineNumber: raw.lineNumber,
    description: raw.description,
    hsnCode: raw.hsnCode ?? undefined,
    quantity: raw.quantity,
    unitRate: raw.unitRate,
    taxableAmount: raw.taxableAmount,
    gstRate: raw.gstRate,
    cgstAmount: raw.cgstAmount,
    sgstAmount: raw.sgstAmount,
    igstAmount: raw.igstAmount,
    gstAmount: raw.gstAmount,
    totalAmount: raw.totalAmount,
  };
}

/** VERIFIED: SalesInvoiceItem. Items of invoices issued before 2026-10-15 have no line number, description, HSN, rate or split. */
export interface BackendSalesInvoiceItem {
  id: string;
  productId: string;
  quantity: number;
  rate: number;
  taxableAmount: number;
  gstAmount: number;
  totalAmount: number;
  lineNumber?: number | null;
  description?: string | null;
  hsnCode?: string | null;
  gstRate?: number | null;
  cgstAmount?: number | null;
  sgstAmount?: number | null;
  igstAmount?: number | null;
}

export function mapSalesInvoiceItem(raw: BackendSalesInvoiceItem, index: number): DocumentLine {
  return {
    lineNumber: raw.lineNumber ?? index + 1,
    description: raw.description ?? "Item recorded without a description",
    hsnCode: raw.hsnCode ?? undefined,
    quantity: raw.quantity,
    unitRate: raw.rate,
    taxableAmount: raw.taxableAmount,
    gstRate: raw.gstRate ?? undefined,
    cgstAmount: raw.cgstAmount ?? 0,
    sgstAmount: raw.sgstAmount ?? 0,
    igstAmount: raw.igstAmount ?? 0,
    gstAmount: raw.gstAmount,
    totalAmount: raw.totalAmount,
  };
}

export interface BackendQuotation {
  id: string;
  quotationCode?: string | null;
  lines?: BackendDocumentLine[];
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
    // Quotations created since numbering carry their number; older ones fall
    // back to a short, honestly-labeled id reference, never a made-up number.
    quoteNo: raw.quotationCode || `#${raw.id.slice(0, 8).toUpperCase()}`,
    numbered: !!raw.quotationCode,
    lines: (raw.lines ?? []).map(mapDocumentLine),
    customerName: opp?.customerName ?? "—",
    opportunityId: raw.opportunityId,
    opportunityName: opp?.title ?? "—",
    amount: raw.totalAmount,
    status: raw.status as QuotationStatus,
    ownerName: opp?.ownerName ?? "Unassigned",
    createdAt: raw.createdAt,
    quoteDate: raw.quoteDate,
    quantity: raw.quantity,
    unitPrice: raw.unitPrice,
    taxableAmount: raw.taxableAmount,
    gstPercent: raw.gstPercent,
    gstAmount: raw.gstAmount,
    totalAmount: raw.totalAmount,
    taxType: raw.taxType ?? undefined,
    placeOfSupply: raw.placeOfSupply ?? undefined,
    buyerGstId: raw.buyerGstId ?? undefined,
    sellerGstId: raw.sellerGstId ?? undefined,
  };
}

export interface BackendQuotationEvent {
  id: string;
  quotationId: string;
  action: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  remarks?: string | null;
  previousTaxableAmount?: number | null;
  newTaxableAmount?: number | null;
  previousTotalAmount?: number | null;
  newTotalAmount?: number | null;
  actorId?: string | null;
  /** Exposed as { id, fullName } only. Null when the actor's account no longer exists. */
  actor?: { id: string; fullName: string } | null;
  occurredAt: string;
  createdAt: string;
}

export function mapQuotationEvent(raw: BackendQuotationEvent): QuotationEvent {
  return {
    id: raw.id,
    quotationId: raw.quotationId,
    action: raw.action,
    fromStatus: raw.fromStatus ?? undefined,
    toStatus: raw.toStatus ?? undefined,
    remarks: raw.remarks ?? undefined,
    previousTaxableAmount: raw.previousTaxableAmount ?? undefined,
    newTaxableAmount: raw.newTaxableAmount ?? undefined,
    previousTotalAmount: raw.previousTotalAmount ?? undefined,
    newTotalAmount: raw.newTotalAmount ?? undefined,
    actorName: raw.actor?.fullName ?? "",
    actorId: raw.actor?.id ?? raw.actorId ?? undefined,
    occurredAt: raw.occurredAt ?? raw.createdAt,
  };
}

export interface BackendProformaInvoice {
  id: string;
  proformaNumber?: string | null;
  lines?: BackendDocumentLine[];
  quotationId: string;
  issueDate: string;
  totalAmount: number;
  customerStatus: string;
  validityDate?: string | null;
  /** Derived by the backend from validityDate (valid through the end of that day, UTC). */
  isExpired?: boolean;
  remarks?: string | null;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Cross-references an already-resolved Quotation map (the same fully
 * enriched Quotation objects the Quotations screen itself uses) to fill in
 * customerName/opportunityName/ownerName — GET /proforma-invoices only
 * nests the raw Quotation (no customerName field exists on it directly).
 * See docs/backend-ui-contract.md §9.
 */
export function mapProformaInvoice(raw: BackendProformaInvoice, quotationById: Map<string, Quotation>): ProformaInvoice {
  const q = quotationById.get(raw.quotationId);
  return {
    id: raw.id,
    // Numbered since 2026-10-15; older ones fall back to a short,
    // honestly-labeled id reference rather than a made-up number.
    proformaNumber: raw.proformaNumber || `#${raw.id.slice(0, 8).toUpperCase()}`,
    numbered: !!raw.proformaNumber,
    lines: (raw.lines ?? []).map(mapDocumentLine),
    quotationId: raw.quotationId,
    quoteNo: q?.quoteNo ?? "—",
    customerName: q?.customerName ?? "—",
    opportunityId: q?.opportunityId,
    opportunityName: q?.opportunityName ?? "—",
    issueDate: raw.issueDate,
    totalAmount: raw.totalAmount,
    status: raw.customerStatus as ProformaInvoiceStatus,
    validityDate: raw.validityDate ?? null,
    // The backend reports expiry. A response that predates it (a Sales Order's
    // nested Proforma carries none) is judged by the same rule.
    isExpired: raw.isExpired ?? isProformaExpired(raw.validityDate),
    remarks: raw.remarks ?? undefined,
    ownerName: q?.ownerName ?? "Unassigned",
    createdAt: raw.createdAt,
  };
}

export interface BackendProformaEvent {
  id: string;
  proformaInvoiceId: string;
  action: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  remarks?: string | null;
  actorId?: string | null;
  /** Exposed as { id, fullName } only. Null when the actor's account no longer exists. */
  actor?: { id: string; fullName: string } | null;
  occurredAt: string;
  createdAt: string;
}

export function mapProformaEvent(raw: BackendProformaEvent): ProformaEvent {
  return {
    id: raw.id,
    proformaInvoiceId: raw.proformaInvoiceId,
    action: raw.action,
    fromStatus: raw.fromStatus ?? undefined,
    toStatus: raw.toStatus ?? undefined,
    remarks: raw.remarks ?? undefined,
    actorName: raw.actor?.fullName ?? "",
    actorId: raw.actor?.id ?? raw.actorId ?? undefined,
    occurredAt: raw.occurredAt ?? raw.createdAt,
  };
}

export interface BackendSalesOrder {
  id: string;
  salesOrderCode?: string | null;
  orderDate: string;
  totalAmount: number;
  status: string;
  sellerGstId?: string | null;
  buyerGstId?: string | null;
  placeOfSupply?: string | null;
  taxType?: string | null;
  inventoryItemId?: string | null;
  proformaInvoiceId?: string | null;
  quotationId?: string | null;
  createdAt: string;
  updatedAt?: string;
  /** GET /sales-orders nests the raw ProformaInvoice only — never the Quotation, even for orders created via Quotation conversion. */
  proformaInvoice?: BackendProformaInvoice | null;
}

/**
 * Cross-references an already-resolved Quotation map (the same fully
 * enriched Quotation objects the Quotations screen itself uses) to fill in
 * customerName/opportunityName/ownerName. A Sales Order links to a
 * Quotation either directly (raw.quotationId, set by the
 * POST /quotations/:id/convert path) or indirectly through its nested
 * Proforma Invoice's own quotationId (set by the direct POST /sales-orders
 * path) — both are resolved the same way here. See the Stage 2E report.
 */
export function mapSalesOrder(raw: BackendSalesOrder, quotationById: Map<string, Quotation>): SalesOrder {
  const linkedQuotationId = raw.quotationId ?? raw.proformaInvoice?.quotationId ?? undefined;
  const q = linkedQuotationId ? quotationById.get(linkedQuotationId) : undefined;
  return {
    id: raw.id,
    // No verified code path ever sets salesOrderCode (the one observed
    // real value comes from the unrelated AdminOS Workflow Executor, not
    // this controller) — fall back to a short, honestly-labeled id
    // reference rather than fabricating a sequence number.
    salesOrderCode: raw.salesOrderCode || `#${raw.id.slice(0, 8).toUpperCase()}`,
    orderDate: raw.orderDate,
    totalAmount: raw.totalAmount,
    status: raw.status,
    quotationId: raw.quotationId ?? undefined,
    quoteNo: q?.quoteNo,
    proformaInvoiceId: raw.proformaInvoiceId ?? undefined,
    proformaNumber: raw.proformaInvoice
      ? raw.proformaInvoice.proformaNumber || `#${raw.proformaInvoice.id.slice(0, 8).toUpperCase()}`
      : undefined,
    opportunityId: q?.opportunityId,
    opportunityName: q?.opportunityName ?? "—",
    customerName: q?.customerName ?? "—",
    ownerName: q?.ownerName ?? "Unassigned",
    sellerGstId: raw.sellerGstId ?? undefined,
    buyerGstId: raw.buyerGstId ?? undefined,
    placeOfSupply: raw.placeOfSupply ?? undefined,
    taxType: raw.taxType ?? undefined,
    inventoryItemId: raw.inventoryItemId ?? undefined,
    createdAt: raw.createdAt,
  };
}

export interface BackendSalesOrderPaymentTerm {
  id: string;
  salesOrderId: string;
  paymentType: string;
  advanceAmount: number;
  balanceAmount: number;
  creditDays?: number | null;
  dueDate?: string | null;
  remarks?: string | null;
  createdAt: string;
}

export function mapSalesOrderPaymentTerm(raw: BackendSalesOrderPaymentTerm): SalesOrderPaymentTerm {
  return {
    id: raw.id,
    salesOrderId: raw.salesOrderId,
    paymentType: raw.paymentType,
    advanceAmount: raw.advanceAmount,
    balanceAmount: raw.balanceAmount,
    creditDays: raw.creditDays ?? undefined,
    dueDate: raw.dueDate ?? undefined,
    remarks: raw.remarks ?? undefined,
    createdAt: raw.createdAt,
  };
}

export interface BackendSalesOrderAdvanceReceipt {
  id: string;
  salesOrderId: string;
  receiptDate: string;
  amountReceived: number;
  paymentMode: string;
  referenceNo?: string | null;
  remarks?: string | null;
  verificationStatus: string;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
  createdAt: string;
}

export function mapSalesOrderAdvanceReceipt(raw: BackendSalesOrderAdvanceReceipt): SalesOrderAdvanceReceipt {
  return {
    id: raw.id,
    salesOrderId: raw.salesOrderId,
    receiptDate: raw.receiptDate,
    amountReceived: raw.amountReceived,
    paymentMode: raw.paymentMode,
    referenceNo: raw.referenceNo ?? undefined,
    remarks: raw.remarks ?? undefined,
    verificationStatus: raw.verificationStatus,
    verifiedBy: raw.verifiedBy ?? undefined,
    verifiedAt: raw.verifiedAt ?? undefined,
    createdAt: raw.createdAt,
  };
}

export interface BackendAccountsCommercialApproval {
  id: string;
  salesOrderId: string;
  approvedBy: string;
  remarks?: string | null;
  status?: string;
  createdAt: string;
}

export function mapSalesOrderCommercialApproval(raw: BackendAccountsCommercialApproval): SalesOrderCommercialApproval {
  return {
    id: raw.id,
    salesOrderId: raw.salesOrderId,
    approvedBy: raw.approvedBy,
    remarks: raw.remarks ?? undefined,
    // A row written before approvals had a status (or by hand) counts as in force, as the backend's own default does.
    status: raw.status ?? "APPROVED",
    createdAt: raw.createdAt,
  };
}

export interface BackendSalesOrderEvent {
  id: string;
  salesOrderId: string;
  action: string;
  result?: string | null;
  fromStatus?: string | null;
  toStatus?: string | null;
  referenceId?: string | null;
  remarks?: string | null;
  actorId?: string | null;
  /** Exposed as { id, fullName } only. Null when the actor's account no longer exists. */
  actor?: { id: string; fullName: string } | null;
  occurredAt: string;
  createdAt: string;
}

export function mapSalesOrderEvent(raw: BackendSalesOrderEvent): SalesOrderEvent {
  return {
    id: raw.id,
    salesOrderId: raw.salesOrderId,
    action: raw.action,
    result: raw.result ?? undefined,
    fromStatus: raw.fromStatus ?? undefined,
    toStatus: raw.toStatus ?? undefined,
    referenceId: raw.referenceId ?? undefined,
    remarks: raw.remarks ?? undefined,
    actorName: raw.actor?.fullName ?? "",
    actorId: raw.actor?.id ?? raw.actorId ?? undefined,
    occurredAt: raw.occurredAt ?? raw.createdAt,
  };
}

export interface BackendDispatchOrder {
  id: string;
  dispatchOrderNo?: string | null;
  status: string;
  salesOrderId?: string | null;
  dispatchDate?: string | null;
  transportName?: string | null;
  vehicleNumber?: string | null;
  driverName?: string | null;
  lrNumber?: string | null;
  destination?: string | null;
  expectedDelivery?: string | null;
}

export function mapDispatchOrderOption(raw: BackendDispatchOrder): DispatchOrderOption {
  return {
    id: raw.id,
    dispatchOrderNo: raw.dispatchOrderNo || `#${raw.id.slice(0, 8).toUpperCase()}`,
    status: raw.status,
    salesOrderId: raw.salesOrderId ?? undefined,
    dispatchDate: raw.dispatchDate ?? undefined,
    transportName: raw.transportName ?? undefined,
    vehicleNumber: raw.vehicleNumber ?? undefined,
    driverName: raw.driverName ?? undefined,
    lrNumber: raw.lrNumber ?? undefined,
    destination: raw.destination ?? undefined,
    expectedDelivery: raw.expectedDelivery ?? undefined,
  };
}

export interface BackendSalesInvoice {
  id: string;
  salesOrderId: string;
  invoiceNumber?: string | null;
  invoiceDate: string;
  taxableAmount: number;
  gstAmount: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  totalAmount: number;
  paymentStatus?: string;
  status: string;
  dispatchOrderId?: string | null;
  customerName?: string | null;
  remarks?: string | null;
  createdAt: string;
  updatedAt?: string;
  /** GET /sales-invoices nests the raw SalesOrder (never Quotation/Proforma), the raw DispatchOrder and the invoice's items. */
  salesOrder?: { id: string } | null;
  SalesInvoiceItem?: BackendSalesInvoiceItem[];
  dispatchOrder?: BackendDispatchOrder | null;
}

/**
 * Cross-references an already-resolved SalesOrder map (the same fully
 * enriched SalesOrder objects the Sales Orders screen itself uses) to fill
 * in customerName/opportunityName/quoteNo/proformaNumber/ownerName — those
 * all flow through the linked Sales Order, exactly like every other
 * denormalization in this app. The Sales Invoice's own customerName field is
 * preferred when present (it's captured directly at invoice creation time),
 * falling back to the linked Sales Order's resolved customerName for older/
 * incomplete records. dispatchOrderNo/dispatchStatus come straight from the
 * nested DispatchOrder GET /sales-invoices already includes — no separate
 * Dispatch Order repository call needed here. See the Stage 2F report.
 */
export function mapSalesInvoice(raw: BackendSalesInvoice, salesOrderById: Map<string, SalesOrder>): SalesInvoice {
  const so = salesOrderById.get(raw.salesOrderId);
  return {
    id: raw.id,
    // Invoices issued since numbering carry their number; older ones fall
    // back to a short, honestly-labeled id reference, never a made-up number.
    invoiceNumber: raw.invoiceNumber || `#${raw.id.slice(0, 8).toUpperCase()}`,
    numbered: !!raw.invoiceNumber,
    items: (raw.SalesInvoiceItem ?? []).map(mapSalesInvoiceItem),
    salesOrderId: raw.salesOrderId,
    salesOrderCode: so?.salesOrderCode,
    quotationId: so?.quotationId,
    quoteNo: so?.quoteNo,
    proformaInvoiceId: so?.proformaInvoiceId,
    proformaNumber: so?.proformaNumber,
    opportunityId: so?.opportunityId,
    opportunityName: so?.opportunityName,
    dispatchOrderId: raw.dispatchOrderId ?? undefined,
    dispatchOrderNo: raw.dispatchOrder
      ? raw.dispatchOrder.dispatchOrderNo || `#${raw.dispatchOrder.id.slice(0, 8).toUpperCase()}`
      : undefined,
    dispatchStatus: raw.dispatchOrder?.status,
    dispatchTransportName: raw.dispatchOrder?.transportName ?? undefined,
    dispatchVehicleNumber: raw.dispatchOrder?.vehicleNumber ?? undefined,
    dispatchDriverName: raw.dispatchOrder?.driverName ?? undefined,
    dispatchLrNumber: raw.dispatchOrder?.lrNumber ?? undefined,
    dispatchDestination: raw.dispatchOrder?.destination ?? undefined,
    dispatchExpectedDelivery: raw.dispatchOrder?.expectedDelivery ?? undefined,
    customerName: raw.customerName || so?.customerName || "—",
    // What the invoice itself says, kept apart from the display fallback above.
    invoiceCustomerName: raw.customerName && raw.customerName.trim() !== "" ? raw.customerName : undefined,
    ownerName: so?.ownerName ?? "Unassigned",
    invoiceDate: raw.invoiceDate,
    taxableAmount: raw.taxableAmount,
    gstAmount: raw.gstAmount,
    cgstAmount: raw.cgstAmount,
    sgstAmount: raw.sgstAmount,
    igstAmount: raw.igstAmount,
    totalAmount: raw.totalAmount,
    status: raw.status,
    paymentStatus: raw.paymentStatus,
    remarks: raw.remarks ?? undefined,
    createdAt: raw.createdAt,
  };
}

export interface BackendAccountsReceivable {
  id: string;
  salesInvoiceId: string;
  dueDate: string;
  outstandingAmount: number;
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: string;
  createdAt: string;
  updatedAt?: string;
  /** Only present on GET /accounts-receivable — the POST /payment-collections response's updatedReceivable has no nested salesInvoice. */
  salesInvoice?: { id: string; invoiceNumber?: string | null; customerName?: string | null } | null;
}

export function mapAccountsReceivable(raw: BackendAccountsReceivable): AccountsReceivable {
  return {
    id: raw.id,
    salesInvoiceId: raw.salesInvoiceId,
    invoiceNumber: raw.salesInvoice
      ? raw.salesInvoice.invoiceNumber || `#${raw.salesInvoice.id.slice(0, 8).toUpperCase()}`
      : undefined,
    customerName: raw.salesInvoice?.customerName ?? undefined,
    dueDate: raw.dueDate,
    outstandingAmount: raw.outstandingAmount,
    paidAmount: raw.paidAmount,
    balanceAmount: raw.balanceAmount,
    paymentStatus: raw.paymentStatus,
    createdAt: raw.createdAt,
  };
}

export interface BackendPaymentCollectionRecord {
  id: string;
  accountsReceivableId: string;
  paymentDate: string;
  amount: number;
  paymentMode: string;
  referenceNumber?: string | null;
  remarks?: string | null;
  createdAt: string;
  /** Null on collections recorded before the recorder was kept. */
  recordedById?: string | null;
  recordedBy?: { id: string; fullName: string } | null;
}

export function mapPaymentCollectionRecord(raw: BackendPaymentCollectionRecord): PaymentCollectionRecord {
  return {
    id: raw.id,
    accountsReceivableId: raw.accountsReceivableId,
    paymentDate: raw.paymentDate,
    amount: raw.amount,
    paymentMode: raw.paymentMode,
    referenceNumber: raw.referenceNumber ?? undefined,
    remarks: raw.remarks ?? undefined,
    createdAt: raw.createdAt,
    recordedById: raw.recordedById ?? raw.recordedBy?.id ?? undefined,
    recordedByName: raw.recordedBy?.fullName ?? undefined,
  };
}

export interface BackendPaymentCollectionEvent {
  id: string;
  paymentCollectionId: string;
  accountsReceivableId: string;
  salesInvoiceId: string;
  action: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  fromStatus?: string | null;
  toStatus?: string | null;
  remarks?: string | null;
  actorId: string;
  actor?: { id: string; fullName: string } | null;
  occurredAt: string;
  createdAt?: string;
}

export function mapPaymentCollectionEvent(raw: BackendPaymentCollectionEvent): PaymentCollectionEvent {
  return {
    id: raw.id,
    paymentCollectionId: raw.paymentCollectionId,
    accountsReceivableId: raw.accountsReceivableId,
    salesInvoiceId: raw.salesInvoiceId,
    action: raw.action,
    amount: raw.amount,
    balanceBefore: raw.balanceBefore,
    balanceAfter: raw.balanceAfter,
    fromStatus: raw.fromStatus ?? undefined,
    toStatus: raw.toStatus ?? undefined,
    remarks: raw.remarks ?? undefined,
    actorId: raw.actorId,
    actorName: raw.actor?.fullName ?? "",
    occurredAt: raw.occurredAt,
  };
}

interface BackendCollectionInvoice {
  id: string;
  invoiceNumber?: string | null;
  customerName?: string | null;
}

/** GET /payment-collections and /:id: the collection with its receivable (and that receivable's invoice) nested. */
export interface BackendPaymentCollection extends BackendPaymentCollectionRecord {
  accountsReceivable: {
    id: string;
    salesInvoiceId: string;
    balanceAmount: number;
    paymentStatus: string;
    salesInvoice?: BackendCollectionInvoice | null;
  };
}

export function mapPaymentCollection(raw: BackendPaymentCollection): PaymentCollection {
  const invoice = raw.accountsReceivable.salesInvoice;
  return {
    ...mapPaymentCollectionRecord(raw),
    salesInvoiceId: raw.accountsReceivable.salesInvoiceId,
    invoiceNumber: invoice ? invoice.invoiceNumber || `#${invoice.id.slice(0, 8).toUpperCase()}` : undefined,
    customerName: invoice?.customerName ?? undefined,
    receivableStatus: raw.accountsReceivable.paymentStatus,
    receivableBalance: raw.accountsReceivable.balanceAmount,
  };
}

export interface BackendPaymentCollectionDetail extends BackendPaymentCollection {
  events: BackendPaymentCollectionEvent[];
}

export function mapPaymentCollectionDetail(raw: BackendPaymentCollectionDetail): PaymentCollectionDetail {
  return { ...mapPaymentCollection(raw), events: (raw.events ?? []).map(mapPaymentCollectionEvent) };
}

export interface BackendInvoiceCollections {
  receivable: BackendAccountsReceivable;
  collections: BackendPaymentCollectionRecord[];
  events: BackendPaymentCollectionEvent[];
}

export function mapInvoiceCollections(raw: BackendInvoiceCollections): InvoiceCollections {
  return {
    receivable: mapAccountsReceivable(raw.receivable),
    collections: raw.collections.map(mapPaymentCollectionRecord),
    events: raw.events.map(mapPaymentCollectionEvent),
  };
}

export interface BackendCustomerStatementLine {
  id: string;
  entryDate: string;
  salesInvoiceId: string;
  invoiceNumber: string | null;
  debit: number;
  credit: number;
  runningBalance: number;
  remarks: string | null;
}

export interface BackendCustomerStatement {
  customer: { id: string; customerCode: string; customerName: string; isActive: boolean };
  period: { from: string | null; to: string | null };
  currency: "INR";
  openingBalance: number;
  totalDebits: number;
  totalCredits: number;
  closingBalance: number;
  entries: BackendCustomerStatementLine[];
  coverage: { postedInvoicesWithoutLedgerEntries: number; unlinkedLegacyMatches: number };
  generatedAt: string;
}

export function mapCustomerStatement(raw: BackendCustomerStatement): CustomerStatement {
  return {
    customer: { id: raw.customer.id, customerCode: raw.customer.customerCode, customerName: raw.customer.customerName, isActive: raw.customer.isActive },
    period: { from: raw.period.from, to: raw.period.to },
    currency: "INR",
    openingBalance: raw.openingBalance,
    totalDebits: raw.totalDebits,
    totalCredits: raw.totalCredits,
    closingBalance: raw.closingBalance,
    entries: raw.entries.map((e) => ({
      id: e.id,
      entryDate: e.entryDate,
      salesInvoiceId: e.salesInvoiceId,
      invoiceNumber: e.invoiceNumber ?? undefined,
      debit: e.debit,
      credit: e.credit,
      runningBalance: e.runningBalance,
      remarks: e.remarks ?? undefined,
    })),
    coverage: {
      postedInvoicesWithoutLedgerEntries: raw.coverage.postedInvoicesWithoutLedgerEntries,
      unlinkedLegacyMatches: raw.coverage.unlinkedLegacyMatches,
    },
    generatedAt: raw.generatedAt,
  };
}

export interface BackendReceiptVoucher {
  id: string;
  receiptNumber?: string | null;
  paymentCollectionId: string;
  receiptDate: string;
  amountReceived: number;
  paymentMode: string;
  referenceNo?: string | null;
  remarks?: string | null;
  createdAt: string;
}

export function mapReceiptVoucher(raw: BackendReceiptVoucher): ReceiptVoucher {
  return {
    id: raw.id,
    receiptNumber: raw.receiptNumber ?? undefined,
    paymentCollectionId: raw.paymentCollectionId,
    receiptDate: raw.receiptDate,
    amountReceived: raw.amountReceived,
    paymentMode: raw.paymentMode,
    referenceNo: raw.referenceNo ?? undefined,
    remarks: raw.remarks ?? undefined,
    createdAt: raw.createdAt,
  };
}

export interface BackendCustomerGstRegistration {
  id: string;
  customerId: string;
  gstin: string;
  legalName: string;
  tradeName?: string | null;
  branchName?: string | null;
  stateCode: string;
  stateName: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  pincode: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function mapCustomerGstRegistration(raw: BackendCustomerGstRegistration): CustomerGstRegistration {
  return {
    id: raw.id,
    customerId: raw.customerId,
    gstin: raw.gstin,
    legalName: raw.legalName,
    tradeName: raw.tradeName ?? undefined,
    branchName: raw.branchName ?? undefined,
    stateCode: raw.stateCode,
    stateName: raw.stateName,
    addressLine1: raw.addressLine1,
    addressLine2: raw.addressLine2 ?? undefined,
    city: raw.city,
    pincode: raw.pincode,
    isDefault: raw.isDefault,
    isActive: raw.isActive,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

export interface BackendCustomer {
  id: string;
  customerCode: string;
  customerName: string;
  panNumber?: string | null;
  email?: string | null;
  phone?: string | null;
  customerType?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  isVendor: boolean;
  linkedVendorId?: string | null;
  deactivatedAt?: string | null;
  deactivatedById?: string | null;
  deactivationReason?: string | null;
  /** Only id and name of whoever deactivated it. */
  deactivatedBy?: { id: string; fullName?: string | null } | null;
  /** Default first. */
  gstRegistrations?: BackendCustomerGstRegistration[];
}

/**
 * Maps a real Customer record field-for-field against the VERIFIED Prisma
 * model and the V1 API (GET /customers, GET /customers/:id, and the create /
 * edit / deactivate / reactivate responses, which all return the customer with
 * its registrations).
 */
export function mapCustomer(raw: BackendCustomer): Customer {
  return {
    id: raw.id,
    customerName: raw.customerName,
    customerCode: raw.customerCode,
    panNumber: raw.panNumber ?? undefined,
    email: raw.email ?? undefined,
    phone: raw.phone ?? undefined,
    customerType: raw.customerType ?? undefined,
    isActive: raw.isActive,
    isVendor: raw.isVendor,
    linkedVendorId: raw.linkedVendorId ?? undefined,
    gstRegistrations: (raw.gstRegistrations ?? []).map(mapCustomerGstRegistration),
    deactivatedAt: raw.deactivatedAt ?? undefined,
    deactivatedById: raw.deactivatedById ?? undefined,
    deactivatedByName: raw.deactivatedBy?.fullName ?? undefined,
    deactivationReason: raw.deactivationReason ?? undefined,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

export interface BackendCustomerEvent {
  id: string;
  customerId: string;
  action: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  remarks?: string | null;
  changes?: Record<string, { from: string | null; to: string | null }> | null;
  gstRegistrationId?: string | null;
  gstRegistration?: { id: string; gstin: string; branchName?: string | null; legalName?: string | null } | null;
  opportunityId?: string | null;
  actorId?: string | null;
  actor?: { id: string; fullName?: string | null } | null;
  occurredAt: string;
  createdAt: string;
}

export function mapCustomerEvent(raw: BackendCustomerEvent): CustomerEvent {
  return {
    id: raw.id,
    customerId: raw.customerId,
    action: raw.action,
    fromStatus: raw.fromStatus ?? undefined,
    toStatus: raw.toStatus ?? undefined,
    remarks: raw.remarks ?? undefined,
    changes: raw.changes ?? undefined,
    gstRegistration: raw.gstRegistration
      ? {
          id: raw.gstRegistration.id,
          gstin: raw.gstRegistration.gstin,
          branchName: raw.gstRegistration.branchName ?? undefined,
          legalName: raw.gstRegistration.legalName ?? undefined,
        }
      : undefined,
    opportunityId: raw.opportunityId ?? undefined,
    actorName: raw.actor?.fullName ?? "",
    actorId: raw.actorId ?? undefined,
    occurredAt: raw.occurredAt,
  };
}

export interface BackendDuplicateMatch {
  id: string | null;
  customerCode: string | null;
  customerName: string | null;
  isActive: boolean | null;
  reasons: string[];
  strength?: string;
  hidden?: boolean;
  /** Who looks after it (D3): { id, fullName } of active salespeople, newest deal first. */
  mappedTo?: Array<{ id: string; fullName: string | null }>;
  createdBy?: { id: string; fullName: string | null } | null;
  salesperson?: CustomerDuplicateMatch["salesperson"];
}

export function mapDuplicateCheck(raw: { blocking: BackendDuplicateMatch[]; warnings: BackendDuplicateMatch[] }): CustomerDuplicateCheck {
  const one = (m: BackendDuplicateMatch): CustomerDuplicateMatch => ({
    id: m.id ?? "",
    customerCode: m.customerCode ?? "",
    customerName: m.customerName ?? "",
    isActive: m.isActive ?? true,
    reasons: m.reasons.filter((r): r is CustomerMatchReason => ["GSTIN", "PAN", "NAME", "PHONE", "EMAIL"].includes(r)),
    ...(m.strength === "EXACT" || m.strength === "STRONG" || m.strength === "POSSIBLE" ? { strength: m.strength as CustomerMatchStrength } : {}),
    ...(m.hidden ? { hidden: true } : {}),
    ...(Array.isArray(m.mappedTo) ? { mappedTo: m.mappedTo } : {}),
    ...(m.createdBy !== undefined && !m.hidden ? { createdBy: m.createdBy } : {}),
    ...(m.salesperson ? { salesperson: m.salesperson } : {}),
  });
  return { blocking: raw.blocking.map(one), warnings: raw.warnings.map(one) };
}

export interface BackendCustomerOverview {
  customer: BackendCustomer;
  quotingReadiness: { ready: boolean; reasons: string[] };
  opportunities: Array<{
    id: string;
    opportunityCode?: string | null;
    title: string;
    status: string;
    expectedValue: number;
    probability: number;
    expectedCloseDate: string;
    createdAt: string;
    lead?: { id: string; customerName: string; companyName?: string | null } | null;
  }>;
  quotations: Array<{
    id: string;
    quotationCode?: string | null;
    opportunityId: string;
    quoteDate: string;
    status: string;
    taxableAmount: number;
    gstAmount: number;
    totalAmount: number;
    buyerGstId?: string | null;
    createdAt: string;
  }>;
  proformas: Array<{
    id: string;
    proformaNumber?: string | null;
    quotationId: string;
    issueDate: string;
    customerStatus: string;
    totalAmount: number;
    validityDate?: string | null;
    isExpired: boolean;
    createdAt: string;
  }>;
  salesOrders: Array<{
    id: string;
    salesOrderCode?: string | null;
    orderDate: string;
    status: string;
    totalAmount: number;
    quotationId?: string | null;
    proformaInvoiceId?: string | null;
    createdAt: string;
  }>;
  invoices: Array<{
    id: string;
    invoiceNumber?: string | null;
    salesOrderId: string;
    invoiceDate: string;
    status: string;
    paymentStatus: string;
    totalAmount: number;
    receivables: Array<{ id: string; dueDate: string; outstandingAmount: number; paidAmount: number; balanceAmount: number; paymentStatus: string }>;
  }>;
  totals: CustomerTotals;
  legacyMatches: Array<{
    id: string;
    title: string;
    status: string;
    leadName: string;
    leadCompany?: string | null;
    quotationCount: number;
    matchedBy: string;
  }>;
}

export function mapCustomerOverview(raw: BackendCustomerOverview): CustomerOverview {
  const blockers = raw.quotingReadiness.reasons.filter((r): r is QuotingBlocker => r === "CUSTOMER_INACTIVE" || r === "NO_ACTIVE_GST");
  return {
    customer: mapCustomer(raw.customer),
    quotingReadiness: { ready: raw.quotingReadiness.ready, reasons: blockers },
    opportunities: raw.opportunities.map((o) => ({
      id: o.id,
      opportunityCode: o.opportunityCode ?? undefined,
      title: o.title,
      stage: o.status,
      expectedValue: o.expectedValue,
      probability: o.probability,
      expectedCloseDate: o.expectedCloseDate,
      createdAt: o.createdAt,
      leadId: o.lead?.id ?? "",
      leadName: o.lead?.customerName ?? "—",
    })),
    quotations: raw.quotations.map((q) => ({
      id: q.id,
      quotationCode: q.quotationCode ?? undefined,
      opportunityId: q.opportunityId,
      quoteDate: q.quoteDate,
      status: q.status,
      taxableAmount: q.taxableAmount,
      gstAmount: q.gstAmount,
      totalAmount: q.totalAmount,
      buyerGstId: q.buyerGstId ?? undefined,
      createdAt: q.createdAt,
    })),
    proformas: raw.proformas.map((p) => ({
      id: p.id,
      proformaNumber: p.proformaNumber ?? undefined,
      quotationId: p.quotationId,
      issueDate: p.issueDate,
      status: p.customerStatus,
      totalAmount: p.totalAmount,
      validityDate: p.validityDate ?? null,
      isExpired: p.isExpired,
      createdAt: p.createdAt,
    })),
    salesOrders: raw.salesOrders.map((o) => ({
      id: o.id,
      salesOrderCode: o.salesOrderCode ?? undefined,
      orderDate: o.orderDate,
      status: o.status,
      totalAmount: o.totalAmount,
      quotationId: o.quotationId ?? undefined,
      proformaInvoiceId: o.proformaInvoiceId ?? undefined,
      createdAt: o.createdAt,
    })),
    invoices: raw.invoices.map((i) => ({
      id: i.id,
      invoiceNumber: i.invoiceNumber ?? undefined,
      salesOrderId: i.salesOrderId,
      invoiceDate: i.invoiceDate,
      status: i.status,
      paymentStatus: i.paymentStatus,
      totalAmount: i.totalAmount,
      receivables: i.receivables,
    })),
    totals: raw.totals,
    legacyMatches: raw.legacyMatches.map((m) => ({
      id: m.id,
      title: m.title,
      stage: m.status,
      leadName: m.leadName,
      leadCompany: m.leadCompany ?? undefined,
      quotationCount: m.quotationCount,
      matchedBy: m.matchedBy === "LEAD_COMPANY" ? "LEAD_COMPANY" : "LEAD_NAME",
    })),
  };
}

// Stage 2I — Dashboard & Analytics. These four response shapes already
// match their domain types field-for-field; mapped explicitly anyway (not
// passed through as-is) so a future backend field rename is caught by the
// compiler here rather than silently flowing into the UI.

export interface BackendSalesRevenueSummary {
  totalRevenue: number;
  taxableRevenue: number;
  totalTax: number;
}

export function mapSalesRevenueSummary(raw: BackendSalesRevenueSummary): SalesRevenueSummary {
  return { totalRevenue: raw.totalRevenue, taxableRevenue: raw.taxableRevenue, totalTax: raw.totalTax };
}

export interface BackendCollectionsSummary {
  totalInvoices: number;
  totalOutstanding: number;
  totalCollected: number;
}

export function mapCollectionsSummary(raw: BackendCollectionsSummary): CollectionsSummary {
  return { totalInvoices: raw.totalInvoices, totalOutstanding: raw.totalOutstanding, totalCollected: raw.totalCollected };
}

export interface BackendCollectionsAging {
  days0to30: number;
  days31to60: number;
  days61to90: number;
  above90: number;
}

export function mapCollectionsAging(raw: BackendCollectionsAging): CollectionsAging {
  return { days0to30: raw.days0to30, days31to60: raw.days31to60, days61to90: raw.days61to90, above90: raw.above90 };
}

export interface BackendCollectionsEfficiency {
  total: number;
  paid: number;
  partial: number;
  pending: number;
  writtenOff: number;
}

export function mapCollectionsEfficiency(raw: BackendCollectionsEfficiency): CollectionsEfficiency {
  return { total: raw.total, paid: raw.paid, partial: raw.partial, pending: raw.pending, writtenOff: raw.writtenOff };
}

export interface BackendCollectionsRecoveryRate {
  totalInvoiceValue: number;
  totalCollected: number;
  recoveryRate: string;
}

export function mapCollectionsRecoveryRate(raw: BackendCollectionsRecoveryRate): CollectionsRecoveryRate {
  return { totalInvoiceValue: raw.totalInvoiceValue, totalCollected: raw.totalCollected, recoveryRate: raw.recoveryRate };
}

export interface BackendNotification {
  id: string;
  title?: string | null;
  message?: string | null;
  isRead: boolean;
  createdAt: string;
  userId?: string | null;
}

/**
 * VERIFIED: GET /notifications (core/notifications module). No per-category
 * icon concept exists backend-side — every real notification maps to the
 * generic "bell" icon (see NotificationIcon) rather than guessing a specific
 * one from category/priority/referenceType. `text` prefers the longer
 * `message` field over the shorter `title`, matching how mock notifications'
 * own `text` field reads (a full sentence, not a headline).
 */
export function mapNotification(raw: BackendNotification): AppNotification {
  return {
    id: raw.id,
    icon: "bell",
    text: raw.message || raw.title || "Notification",
    occurredAt: raw.createdAt,
    unread: !raw.isRead,
  };
}
