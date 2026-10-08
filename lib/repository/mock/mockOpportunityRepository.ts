import { ID, ListQuery, Page } from "../../types/common";
import { Opportunity, OpportunityStage, formatOpportunityStage, isQualifiedLeadStatus } from "../../types/domain";
import {
  IOpportunityRepository,
  CreateOpportunityInput,
  OpportunitySortField,
} from "../interfaces";
import { db } from "./db";
import { delay, applyListQuery } from "./queryUtils";
import { mockId } from "./entityStore";
import { assertMockLeadActive } from "./leadGuards";
import { recordMockCustomerEvent } from "./customerRules";
import {
  CUSTOMER_INACTIVE_LINK_MESSAGE,
  CUSTOMER_NOT_FOUND_MESSAGE,
  CustomerConflictError,
  OPPORTUNITY_CUSTOMER_LOCKED_MESSAGE,
  OPPORTUNITY_GST_OF_ANOTHER_CUSTOMER_MESSAGE,
} from "../shared/customerLifecycle";
import {
  OpportunityStageConflictError,
  normalizeStageRemark,
  opportunityStageConflictMessage,
  stageRemarkProblem,
  validateOpportunityStageMove,
} from "../shared/opportunityStage";

const SEARCHABLE: (keyof Opportunity)[] = ["title", "customerName", "ownerName"];

export class MockOpportunityRepository implements IOpportunityRepository {
  async list(query?: ListQuery<OpportunitySortField>): Promise<Page<Opportunity>> {
    return delay(applyListQuery(db.opportunities.getAll(), query, SEARCHABLE));
  }

  async getById(id: ID): Promise<Opportunity | null> {
    return delay(db.opportunities.getById(id) ?? null);
  }

  async create(input: CreateOpportunityInput): Promise<Opportunity> {
    const lead = db.leads.getById(input.leadId);
    if (!lead) throw new Error(`Lead ${input.leadId} not found`);
    assertMockLeadActive(input.leadId);
    if (!isQualifiedLeadStatus(lead.status)) {
      throw new Error("Only a qualified lead can become an opportunity");
    }
    const customer = input.customerId ? this.activeCustomerForLink(input.customerId) : undefined;
    const now = new Date().toISOString();
    const opp: Opportunity = {
      id: mockId("O"),
      leadId: input.leadId,
      title: input.title,
      customerName: lead.customerName,
      stage: "QUALIFIED",
      expectedValue: input.expectedValue,
      probability: input.probability,
      expectedCloseDate: input.expectedCloseDate,
      ownerName: lead.assignedToName ?? "Unassigned",
      createdAt: now,
      customerId: customer?.id,
      customer: customer ? { id: customer.id, customerCode: customer.customerCode, customerName: customer.customerName, isActive: customer.isActive } : undefined,
    };
    db.opportunities.add(opp);
    if (customer) recordMockCustomerEvent({ customerId: customer.id, action: "OPPORTUNITY_LINKED", opportunityId: opp.id, remarks: input.title });
    db.leadTimeline.add({
      source: "SYSTEM",
      id: mockId("T"),
      leadId: input.leadId,
      icon: "brief",
      title: `OPPORTUNITY_CREATED — ${input.title}`,
      detail: "",
      actorName: "You",
      occurredAt: now,
    });
    return delay(opp);
  }

  /** Same rules and wording as the backend: rule check, then missing/inactive checks, then the stage the caller saw must still be current. */
  async updateStage(id: ID, fromStage: OpportunityStage, toStage: OpportunityStage, remarks?: string): Promise<Opportunity> {
    validateOpportunityStageMove(fromStage, toStage);
    const problem = stageRemarkProblem(remarks);
    if (problem) throw new Error(problem);
    const remark = normalizeStageRemark(remarks);

    const current = db.opportunities.getById(id);
    if (!current) throw new Error("Opportunity not found.");
    assertMockLeadActive(current.leadId);
    if (current.stage !== fromStage) {
      throw new OpportunityStageConflictError(opportunityStageConflictMessage(current.stage));
    }

    const updated = db.opportunities.update(id, { stage: toStage });
    if (!updated) throw new Error("Opportunity not found.");
    db.leadTimeline.add({
      source: "SYSTEM",
      id: mockId("T"),
      leadId: current.leadId,
      icon: "pulse",
      title: "Opportunity Stage Changed",
      detail: `Opportunity "${current.title}": ${formatOpportunityStage(fromStage)} → ${formatOpportunityStage(toStage)}`,
      ...(remark === undefined ? {} : { userRemark: remark }),
      actorName: "You",
      actorId: "mock-user",
      occurredAt: new Date().toISOString(),
    });
    return delay(updated);
  }

  /**
   * The same rules as the backend (opportunities.service.ts linkCustomer): the
   * lead and the new customer must be active; an opportunity that has a customer
   * and a quotation keeps its customer; one with no customer can be given one
   * even if it already has documents, unless one of them uses another customer's
   * GST registration. Linking the customer it already has changes nothing.
   */
  async linkCustomer(id: ID, customerId: ID | null): Promise<Opportunity> {
    const current = db.opportunities.getById(id);
    if (!current) throw new Error("Opportunity not found.");
    assertMockLeadActive(current.leadId);

    const from = current.customerId ?? null;
    if (from === customerId) return delay(current);

    const quotations = db.quotations.getAll().filter((q) => q.opportunityId === id);
    if (from && quotations.length > 0) throw new CustomerConflictError(OPPORTUNITY_CUSTOMER_LOCKED_MESSAGE, "OPPORTUNITY_CUSTOMER_LOCKED");

    if (customerId && this.usesRegistrationOfAnotherCustomer(id, customerId)) {
      throw new CustomerConflictError(OPPORTUNITY_GST_OF_ANOTHER_CUSTOMER_MESSAGE, "OPPORTUNITY_GST_OF_ANOTHER_CUSTOMER");
    }
    const customer = customerId ? this.activeCustomerForLink(customerId) : undefined;

    const updated = db.opportunities.update(id, {
      customerId: customer?.id,
      customer: customer ? { id: customer.id, customerCode: customer.customerCode, customerName: customer.customerName, isActive: customer.isActive } : undefined,
    });
    if (!updated) throw new Error("Opportunity not found.");

    const label = (cid: string) => {
      const c = db.customers.getById(cid);
      return c ? `${c.customerName} (${c.customerCode})` : cid;
    };
    const [action, detail] = !from
      ? ["OPPORTUNITY_CUSTOMER_LINKED", `Opportunity "${current.title}": customer set to ${label(customerId!)}`]
      : !customerId
      ? ["OPPORTUNITY_CUSTOMER_UNLINKED", `Opportunity "${current.title}": customer ${label(from)} removed`]
      : ["OPPORTUNITY_CUSTOMER_CHANGED", `Opportunity "${current.title}": customer ${label(from)} → ${label(customerId)}`];
    db.leadTimeline.add({
      source: "SYSTEM",
      id: mockId("T"),
      leadId: current.leadId,
      icon: "brief",
      title: action,
      detail,
      actorName: "You",
      actorId: "mock-user",
      occurredAt: new Date().toISOString(),
    });
    if (from) recordMockCustomerEvent({ customerId: from, action: "OPPORTUNITY_UNLINKED", opportunityId: id, remarks: current.title });
    if (customerId) recordMockCustomerEvent({ customerId, action: "OPPORTUNITY_LINKED", opportunityId: id, remarks: current.title });
    return delay(updated);
  }

  private activeCustomerForLink(customerId: ID) {
    const customer = db.customers.getById(customerId);
    if (!customer) throw new Error(CUSTOMER_NOT_FOUND_MESSAGE);
    if (!customer.isActive) throw new CustomerConflictError(CUSTOMER_INACTIVE_LINK_MESSAGE, "CUSTOMER_INACTIVE");
    return customer;
  }

  /** Does a quotation under the opportunity, or an order made from one, use a buyer registration that is not this customer's? */
  private usesRegistrationOfAnotherCustomer(opportunityId: ID, customerId: ID): boolean {
    const quotations = db.quotations.getAll().filter((q) => q.opportunityId === opportunityId);
    const quotationIds = new Set(quotations.map((q) => q.id));
    const proformaIds = new Set(db.proformaInvoices.getAll().filter((p) => quotationIds.has(p.quotationId)).map((p) => p.id));
    const orders = db.salesOrders.getAll().filter((o) => (o.quotationId && quotationIds.has(o.quotationId)) || (o.proformaInvoiceId && proformaIds.has(o.proformaInvoiceId)));
    const ids = [...quotations.map((q) => q.buyerGstId), ...orders.map((o) => o.buyerGstId)].filter((x): x is string => !!x);
    const owner = new Map<string, string>();
    for (const c of db.customers.getAll()) for (const g of c.gstRegistrations) owner.set(g.id, c.id);
    return ids.some((gid) => owner.get(gid) !== undefined && owner.get(gid) !== customerId);
  }
}
