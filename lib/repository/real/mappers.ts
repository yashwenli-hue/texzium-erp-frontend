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
  ProformaInvoice,
  ProformaInvoiceStatus,
  SalesOrder,
  SalesInvoice,
  DispatchOrderOption,
  AccountsReceivable,
  PaymentCollectionRecord,
  CustomerStatement,
  ReceiptVoucher,
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

export interface BackendProformaInvoice {
  id: string;
  proformaNumber?: string | null;
  quotationId: string;
  issueDate: string;
  totalAmount: number;
  customerStatus: string;
  validityDate?: string | null;
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
    // No verified code path ever sets proformaNumber — fall back to a
    // short, honestly-labeled id reference rather than fabricating one.
    proformaNumber: raw.proformaNumber || `#${raw.id.slice(0, 8).toUpperCase()}`,
    quotationId: raw.quotationId,
    quoteNo: q?.quoteNo ?? "—",
    customerName: q?.customerName ?? "—",
    opportunityId: q?.opportunityId,
    opportunityName: q?.opportunityName ?? "—",
    issueDate: raw.issueDate,
    totalAmount: raw.totalAmount,
    status: raw.customerStatus as ProformaInvoiceStatus,
    validityDate: raw.validityDate ?? null,
    remarks: raw.remarks ?? undefined,
    ownerName: q?.ownerName ?? "Unassigned",
    createdAt: raw.createdAt,
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

export interface BackendDispatchOrder {
  id: string;
  dispatchOrderNo?: string | null;
  status: string;
  salesOrderId?: string | null;
  dispatchDate?: string | null;
}

export function mapDispatchOrderOption(raw: BackendDispatchOrder): DispatchOrderOption {
  return {
    id: raw.id,
    dispatchOrderNo: raw.dispatchOrderNo || `#${raw.id.slice(0, 8).toUpperCase()}`,
    status: raw.status,
    salesOrderId: raw.salesOrderId ?? undefined,
    dispatchDate: raw.dispatchDate ?? undefined,
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
  /** GET /sales-invoices nests the raw SalesOrder (never Quotation/Proforma) and the raw DispatchOrder. */
  salesOrder?: { id: string } | null;
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
    // No verified code path ever sets invoiceNumber on the live endpoint —
    // fall back to a short, honestly-labeled id reference rather than
    // fabricating a sequence number.
    invoiceNumber: raw.invoiceNumber || `#${raw.id.slice(0, 8).toUpperCase()}`,
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
    customerName: raw.customerName || so?.customerName || "—",
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
  };
}

export interface BackendCustomerStatementEntry {
  id: string;
  customerName: string;
  salesInvoiceId: string;
  debitAmount: number;
  creditAmount: number;
  balanceAmount: number;
  entryDate: string;
  remarks?: string | null;
  createdAt: string;
}

export interface BackendCustomerStatement {
  customerName: string;
  openingBalance: number;
  closingBalance: number;
  entries: BackendCustomerStatementEntry[];
}

export function mapCustomerStatement(raw: BackendCustomerStatement): CustomerStatement {
  return {
    customerName: raw.customerName,
    openingBalance: raw.openingBalance,
    closingBalance: raw.closingBalance,
    entries: raw.entries.map((e) => ({
      id: e.id,
      customerName: e.customerName,
      salesInvoiceId: e.salesInvoiceId,
      debitAmount: e.debitAmount,
      creditAmount: e.creditAmount,
      balanceAmount: e.balanceAmount,
      entryDate: e.entryDate,
      remarks: e.remarks ?? undefined,
      createdAt: e.createdAt,
    })),
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
