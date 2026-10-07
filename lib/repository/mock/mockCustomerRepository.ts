import { ID, ListQuery, Page } from "../../types/common";
import { Customer, CustomerDuplicateCheck, CustomerEvent, CustomerOverview } from "../../types/domain";
import {
  CreateCustomerInput,
  CustomerDuplicateQuery,
  CustomerSortField,
  ICustomerRepository,
  UpdateCustomerInput,
} from "../interfaces";
import { db } from "./db";
import { delay, applyListQuery } from "./queryUtils";
import { mockId } from "./entityStore";
import {
  findMockMatches,
  nextMockCustomerCode,
  recordMockCustomerEvent,
  requireMockCustomer,
  saveMockCustomer,
} from "./customerRules";
import { isProformaExpired } from "../shared/proformaLifecycle";
import {
  CUSTOMER_ALREADY_ACTIVE_MESSAGE,
  CUSTOMER_ALREADY_INACTIVE_MESSAGE,
  CUSTOMER_INACTIVE_EDIT_MESSAGE,
  CUSTOMER_REASON_MAX_LENGTH,
  CustomerConflictError,
  PAN_MISMATCHES_GST_MESSAGE,
  cleanCustomerText,
  duplicateNameMessage,
  duplicatePanMessage,
  gstinMatchesPan,
  normalizeCustomerName,
  normalizeEmail,
  normalizePan,
  quotingBlockers,
  sortRegistrations,
  validateCustomerFields,
} from "../shared/customerLifecycle";
import { roundMoney } from "../shared/quotationLifecycle";

const SEARCHABLE: (keyof Customer)[] = ["customerName", "customerCode", "email", "phone", "panNumber"];

/** What an edit may change; the same five fields as the backend. */
const EDITABLE = ["customerName", "customerType", "panNumber", "email", "phone"] as const;

const sum = (values: number[]) => roundMoney(values.reduce((t, v) => t + v, 0));

/**
 * The in-memory customer master. It follows the backend's rules and wording
 * (customer-master.service.ts): a server-style code, no second customer with the
 * same PAN or (case- and spacing-insensitive) name, a reason to deactivate, no
 * edit while inactive, a PAN that must agree with the active GSTINs, and a
 * history entry for every change.
 */
export class MockCustomerRepository implements ICustomerRepository {
  async list(query?: ListQuery<CustomerSortField>): Promise<Page<Customer>> {
    const all = db.customers.getAll().map((c) => ({ ...c, gstRegistrations: sortRegistrations(c.gstRegistrations) }));
    return delay(applyListQuery(all, query, SEARCHABLE));
  }

  async getById(id: ID): Promise<Customer | null> {
    const c = db.customers.getById(id);
    return delay(c ? { ...c, gstRegistrations: sortRegistrations(c.gstRegistrations) } : null);
  }

  async create(input: CreateCustomerInput): Promise<Customer> {
    const first = Object.values(validateCustomerFields(input))[0];
    if (first) throw new Error(first);

    const name = input.customerName.trim();
    const pan = input.panNumber?.trim() ? normalizePan(input.panNumber) : undefined;
    this.assertNoDuplicate({ name, pan });

    const now = new Date().toISOString();
    const customer: Customer = {
      id: mockId("C"),
      customerCode: nextMockCustomerCode(),
      customerName: name,
      customerType: input.customerType?.trim() || undefined,
      panNumber: pan,
      email: input.email?.trim() ? normalizeEmail(input.email) : undefined,
      phone: input.phone?.trim() || undefined,
      isActive: true,
      isVendor: false,
      gstRegistrations: [],
      createdAt: now,
      updatedAt: now,
    };
    db.customers.add(customer);
    recordMockCustomerEvent({ customerId: customer.id, action: "CUSTOMER_CREATED", toStatus: "ACTIVE" });
    return delay(customer);
  }

  async update(id: ID, input: UpdateCustomerInput): Promise<Customer> {
    const first = Object.values(
      validateCustomerFields({ customerName: input.customerName ?? "x", customerType: input.customerType ?? "", panNumber: input.panNumber ?? "", email: input.email ?? "", phone: input.phone ?? "" })
    )[0];
    if (first) throw new Error(first);

    const current = requireMockCustomer(id);
    if (!current.isActive) throw new CustomerConflictError(CUSTOMER_INACTIVE_EDIT_MESSAGE, "CUSTOMER_INACTIVE");

    const normalized: Record<(typeof EDITABLE)[number], string | null | undefined> = {
      customerName: input.customerName === undefined ? undefined : input.customerName.trim(),
      customerType: input.customerType === undefined ? undefined : input.customerType?.trim() || null,
      panNumber: input.panNumber === undefined ? undefined : input.panNumber?.trim() ? normalizePan(input.panNumber) : null,
      email: input.email === undefined ? undefined : input.email?.trim() ? normalizeEmail(input.email) : null,
      phone: input.phone === undefined ? undefined : input.phone?.trim() || null,
    };

    const changes: NonNullable<CustomerEvent["changes"]> = {};
    for (const key of EDITABLE) {
      const next = normalized[key];
      if (next === undefined) continue;
      const before = (current[key] as string | undefined) ?? null;
      if (next !== before) changes[key] = { from: before, to: next };
    }
    if (Object.keys(changes).length === 0) return delay(current);

    const newName = changes.customerName?.to ?? undefined;
    const newPan = changes.panNumber?.to ?? undefined;
    if (newName || newPan) this.assertNoDuplicate({ name: newName ?? undefined, pan: newPan ?? undefined, excludeId: id });

    if (newPan && current.gstRegistrations.some((g) => g.isActive && !gstinMatchesPan(g.gstin, newPan))) {
      throw new CustomerConflictError(PAN_MISMATCHES_GST_MESSAGE, "PAN_MISMATCHES_GST");
    }

    const patch: Partial<Customer> = {};
    for (const key of EDITABLE) {
      if (changes[key]) (patch as Record<string, unknown>)[key] = changes[key]!.to ?? undefined;
    }
    const saved = saveMockCustomer(id, patch);
    recordMockCustomerEvent({ customerId: id, action: "CUSTOMER_UPDATED", fromStatus: "ACTIVE", toStatus: "ACTIVE", changes });
    return delay(saved);
  }

  async deactivate(id: ID, reason: string): Promise<Customer> {
    const clean = cleanCustomerText(reason, CUSTOMER_REASON_MAX_LENGTH, true, "A reason");
    const current = requireMockCustomer(id);
    if (!current.isActive) throw new CustomerConflictError(CUSTOMER_ALREADY_INACTIVE_MESSAGE, "ALREADY_INACTIVE");
    const saved = saveMockCustomer(id, {
      isActive: false,
      deactivatedAt: new Date().toISOString(),
      deactivatedById: "U1",
      deactivatedByName: "You",
      deactivationReason: clean,
    });
    recordMockCustomerEvent({ customerId: id, action: "CUSTOMER_DEACTIVATED", fromStatus: "ACTIVE", toStatus: "INACTIVE", remarks: clean });
    return delay(saved);
  }

  async reactivate(id: ID, remarks?: string): Promise<Customer> {
    const note = cleanCustomerText(remarks, CUSTOMER_REASON_MAX_LENGTH, false, "Remarks");
    const current = requireMockCustomer(id);
    if (current.isActive) throw new CustomerConflictError(CUSTOMER_ALREADY_ACTIVE_MESSAGE, "ALREADY_ACTIVE");
    const saved = saveMockCustomer(id, {
      isActive: true,
      deactivatedAt: undefined,
      deactivatedById: undefined,
      deactivatedByName: undefined,
      deactivationReason: undefined,
    });
    recordMockCustomerEvent({ customerId: id, action: "CUSTOMER_REACTIVATED", fromStatus: "INACTIVE", toStatus: "ACTIVE", remarks: note });
    return delay(saved);
  }

  async listEvents(id: ID): Promise<CustomerEvent[]> {
    requireMockCustomer(id);
    // Newest first; events recorded in the same millisecond keep their real order (the later one first).
    const events = db.customerEvents
      .getAll()
      .map((e, index) => ({ e, index }))
      .filter(({ e }) => e.customerId === id)
      .sort((a, b) => (a.e.occurredAt === b.e.occurredAt ? a.index - b.index : a.e.occurredAt < b.e.occurredAt ? 1 : -1))
      .map(({ e }) => e);
    return delay(events);
  }

  async getOverview(id: ID): Promise<CustomerOverview> {
    const customer = requireMockCustomer(id);

    const opportunities = db.opportunities.getAll().filter((o) => o.customerId === id);
    const oppIds = new Set(opportunities.map((o) => o.id));
    const quotations = db.quotations.getAll().filter((q) => q.opportunityId && oppIds.has(q.opportunityId));
    const quotationIds = new Set(quotations.map((q) => q.id));
    const proformas = db.proformaInvoices.getAll().filter((p) => quotationIds.has(p.quotationId));
    const proformaIds = new Set(proformas.map((p) => p.id));
    const orders = db.salesOrders.getAll().filter((o) => (o.quotationId && quotationIds.has(o.quotationId)) || (o.proformaInvoiceId && proformaIds.has(o.proformaInvoiceId)));
    const orderIds = new Set(orders.map((o) => o.id));
    const invoices = db.salesInvoices.getAll().filter((i) => orderIds.has(i.salesOrderId));

    const invoiceViews = invoices.map((i) => ({
      id: i.id,
      invoiceNumber: i.invoiceNumber,
      salesOrderId: i.salesOrderId,
      invoiceDate: i.invoiceDate,
      status: i.status,
      paymentStatus: i.paymentStatus ?? "PENDING",
      totalAmount: i.totalAmount,
      receivables: db.accountsReceivable
        .getAll()
        .filter((r) => r.salesInvoiceId === i.id)
        .map((r) => ({ id: r.id, dueDate: r.dueDate, outstandingAmount: r.outstandingAmount, paidAmount: r.paidAmount, balanceAmount: r.balanceAmount, paymentStatus: r.paymentStatus })),
    }));
    const posted = invoiceViews.filter((i) => i.status !== "DRAFT");
    const receivables = posted.flatMap((i) => i.receivables);

    const nameKey = normalizeCustomerName(customer.customerName);
    const legacyMatches = db.opportunities
      .getAll()
      .filter((o) => !o.customerId)
      .map((o) => ({ o, lead: db.leads.getById(o.leadId) }))
      .filter(({ lead }) => lead && (normalizeCustomerName(lead.customerName) === nameKey || (lead.companyName && normalizeCustomerName(lead.companyName) === nameKey)))
      .map(({ o, lead }) => ({
        id: o.id,
        title: o.title,
        stage: o.stage,
        leadName: lead!.customerName,
        leadCompany: lead!.companyName,
        quotationCount: db.quotations.getAll().filter((q) => q.opportunityId === o.id).length,
        matchedBy: (normalizeCustomerName(lead!.customerName) === nameKey ? "LEAD_NAME" : "LEAD_COMPANY") as "LEAD_NAME" | "LEAD_COMPANY",
      }));

    const blockers = quotingBlockers(customer);
    return delay({
      customer,
      quotingReadiness: { ready: blockers.length === 0, reasons: blockers },
      opportunities: opportunities.map((o) => ({
        id: o.id,
        title: o.title,
        stage: o.stage,
        expectedValue: o.expectedValue,
        probability: o.probability,
        expectedCloseDate: o.expectedCloseDate,
        createdAt: o.createdAt,
        leadId: o.leadId,
        leadName: o.customerName,
      })),
      quotations: quotations.map((q) => ({
        id: q.id,
        quotationCode: q.quoteNo,
        opportunityId: q.opportunityId!,
        quoteDate: q.quoteDate ?? q.createdAt,
        status: q.status,
        taxableAmount: q.taxableAmount ?? 0,
        gstAmount: q.gstAmount ?? 0,
        totalAmount: q.totalAmount ?? q.amount,
        buyerGstId: q.buyerGstId,
        createdAt: q.createdAt,
      })),
      proformas: proformas.map((p) => ({
        id: p.id,
        proformaNumber: p.proformaNumber,
        quotationId: p.quotationId,
        issueDate: p.issueDate,
        status: p.status,
        totalAmount: p.totalAmount,
        validityDate: p.validityDate,
        isExpired: isProformaExpired(p.validityDate),
        createdAt: p.createdAt,
      })),
      salesOrders: orders.map((o) => ({
        id: o.id,
        salesOrderCode: o.salesOrderCode,
        orderDate: o.orderDate,
        status: o.status,
        totalAmount: o.totalAmount,
        quotationId: o.quotationId,
        proformaInvoiceId: o.proformaInvoiceId,
        createdAt: o.createdAt,
      })),
      invoices: invoiceViews,
      totals: {
        counts: { opportunities: opportunities.length, quotations: quotations.length, proformas: proformas.length, salesOrders: orders.length, invoices: invoices.length },
        approvedQuotationValue: sum(quotations.filter((q) => q.status === "APPROVED").map((q) => q.totalAmount ?? q.amount)),
        orderedValue: sum(orders.filter((o) => o.status !== "CANCELLED").map((o) => o.totalAmount)),
        invoicedValue: sum(posted.map((i) => i.totalAmount)),
        collectedValue: sum(receivables.map((r) => r.paidAmount)),
        outstandingValue: sum(receivables.filter((r) => r.paymentStatus !== "WRITTEN_OFF").map((r) => r.balanceAmount)),
      },
      legacyMatches,
    });
  }

  async duplicateCheck(query: CustomerDuplicateQuery): Promise<CustomerDuplicateCheck> {
    const probe = {
      name: query.customerName?.trim() || undefined,
      pan: query.panNumber?.trim() || undefined,
      phone: query.phone?.trim() || undefined,
      email: query.email?.trim() || undefined,
      excludeId: query.excludeCustomerId,
    };
    if (!probe.name && !probe.pan && !probe.phone && !probe.email) return delay({ blocking: [], warnings: [] });
    const matches = findMockMatches(probe);
    const view = (m: (typeof matches)[number]) => ({
      id: m.customer.id,
      customerCode: m.customer.customerCode,
      customerName: m.customer.customerName,
      isActive: m.customer.isActive,
      reasons: m.reasons,
    });
    return delay({
      blocking: matches.filter((m) => m.reasons.includes("PAN") || m.reasons.includes("NAME")).map(view),
      warnings: matches.filter((m) => !m.reasons.includes("PAN") && !m.reasons.includes("NAME")).map(view),
    });
  }

  /** PAN is checked before name: it is the stronger identity. */
  private assertNoDuplicate(probe: { name?: string; pan?: string; excludeId?: string }) {
    const matches = findMockMatches(probe);
    const byPan = matches.find((m) => m.reasons.includes("PAN"));
    if (byPan) {
      throw new CustomerConflictError(duplicatePanMessage(byPan.customer.customerName, byPan.customer.customerCode), "DUPLICATE_PAN", {
        id: byPan.customer.id,
        customerCode: byPan.customer.customerCode,
        customerName: byPan.customer.customerName,
        isActive: byPan.customer.isActive,
      });
    }
    const byName = matches.find((m) => m.reasons.includes("NAME"));
    if (byName) {
      throw new CustomerConflictError(duplicateNameMessage(byName.customer.customerName, byName.customer.customerCode), "DUPLICATE_NAME", {
        id: byName.customer.id,
        customerCode: byName.customer.customerCode,
        customerName: byName.customer.customerName,
        isActive: byName.customer.isActive,
      });
    }
  }
}
