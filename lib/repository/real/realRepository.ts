import { RealLeadBantRepository } from "./realLeadBantRepository";
import { RealAccessRepository } from "./realAccessRepository";
import { RevenueOSRepository } from "../interfaces";
import { RealContentRepository } from "./realContentRepository";
import { RealLeadRepository } from "./realLeadRepository";
import { RealLeadSourceRepository } from "./realLeadSourceRepository";
import { RealOpportunityRepository } from "./realOpportunityRepository";
import { RealLeadFollowupRepository } from "./realLeadFollowupRepository";
import { RealUserRepository } from "./realUserRepository";
import { RealQuotationRepository } from "./realQuotationRepository";
import { RealProformaInvoiceRepository } from "./realProformaInvoiceRepository";
import { RealSalesOrderRepository } from "./realSalesOrderRepository";
import { RealSalesOrderCommercialRepository } from "./realSalesOrderCommercialRepository";
import { RealSalesInvoiceRepository } from "./realSalesInvoiceRepository";
import { RealDispatchOrderRepository } from "./realDispatchOrderRepository";
import { RealAccountsReceivableRepository } from "./realAccountsReceivableRepository";
import { RealPaymentCollectionRepository } from "./realPaymentCollectionRepository";
import { RealCustomerStatementRepository } from "./realCustomerStatementRepository";
import { RealPaymentLinkRepository } from "./realPaymentLinkRepository";
import { RealDocumentProfileRepository } from "./realDocumentProfileRepository";
import { RealReceiptVoucherRepository } from "./realReceiptVoucherRepository";
import { RealSalesReportsRepository } from "./realSalesReportsRepository";
import { RealCollectionsDashboardRepository } from "./realCollectionsDashboardRepository";
import { RealInventoryItemRepository } from "./realInventoryItemRepository";
import { RealSellerGstRepository } from "./realSellerGstRepository";
import { RealBuyerGstRepository } from "./realBuyerGstRepository";
import { RealCustomerRepository } from "./realCustomerRepository";
import { RealCustomerGstRepository } from "./realCustomerGstRepository";
import { RealSearchRepository } from "./realSearchRepository";
import { RealNotificationRepository } from "./realNotificationRepository";
import { RealDataDeletionRepository } from "./realDataDeletionRepository";
import { MockContactRepository } from "../mock/mockContactRepository";
import { MockActivityRepository } from "../mock/mockActivityRepository";
import { MockTaskRepository } from "../mock/mockTaskRepository";
import { MockNoteRepository } from "../mock/mockNoteRepository";

/**
 * Stage 2A wired up Leads and Opportunities; Stage 2C adds Quotations
 * (+ their supporting Inventory Item / Seller GST / Buyer GST master-data
 * lookups); Stage 2H added the Customer Master read; Customer Management V1
 * adds the governed Customer and GST registration writes, the customer overview
 * and the opportunity link (see RealCustomerRepository) against the real backend. Search aggregates the same already-real list() calls
 * (no dedicated backend search endpoint exists — see RealSearchRepository).
 * Notifications is a real, fully wired backend module too (see
 * RealNotificationRepository) — it was left on the mock implementation here
 * by mistake in earlier stages, not because no backend exists for it.
 * Contacts, Activities, Tasks and Notes genuinely have no backend
 * counterpart at all (confirmed) and remain on the mock implementation —
 * same pattern as createMockRepository(), just per-entity.
 */
export function createRealRepository(): RevenueOSRepository {
  const users = new RealUserRepository();
  const leads = new RealLeadRepository();
  const customers = new RealCustomerRepository();
  const opportunities = new RealOpportunityRepository(users);
  const quotations = new RealQuotationRepository(opportunities);
  const proformaInvoices = new RealProformaInvoiceRepository(quotations);
  const salesOrders = new RealSalesOrderRepository(quotations);
  const salesInvoices = new RealSalesInvoiceRepository(salesOrders);
  return {
    kind: "real",
    leads,
    leadSources: new RealLeadSourceRepository(),
    leadFollowups: new RealLeadFollowupRepository(),
    leadBant: new RealLeadBantRepository(),
    users,
    opportunities,
    quotations,
    proformaInvoices,
    salesOrders,
    salesOrderCommercial: new RealSalesOrderCommercialRepository(),
    salesInvoices,
    dispatchOrders: new RealDispatchOrderRepository(),
    accountsReceivable: new RealAccountsReceivableRepository(),
    paymentCollections: new RealPaymentCollectionRepository(),
    customerStatements: new RealCustomerStatementRepository(),
    paymentLinks: new RealPaymentLinkRepository(),
    receiptVouchers: new RealReceiptVoucherRepository(),
    documentProfile: new RealDocumentProfileRepository(),
    content: new RealContentRepository(),
    salesReports: new RealSalesReportsRepository(),
    collectionsDashboard: new RealCollectionsDashboardRepository(),
    inventoryItems: new RealInventoryItemRepository(),
    sellerGstRegistrations: new RealSellerGstRepository(),
    buyerGstRegistrations: new RealBuyerGstRepository(),
    customers,
    customerGst: new RealCustomerGstRepository(),
    contacts: new MockContactRepository(),
    activities: new MockActivityRepository(),
    tasks: new MockTaskRepository(),
    notes: new MockNoteRepository(),
    notifications: new RealNotificationRepository(),
    access: new RealAccessRepository(),
    dataDeletions: new RealDataDeletionRepository(),
    search: new RealSearchRepository(leads, customers, quotations, opportunities, proformaInvoices, salesOrders, salesInvoices),
  };
}
