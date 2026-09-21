import { RevenueOSRepository } from "../interfaces";
import { RealLeadRepository } from "./realLeadRepository";
import { RealLeadSourceRepository } from "./realLeadSourceRepository";
import { RealOpportunityRepository } from "./realOpportunityRepository";
import { RealLeadFollowupRepository } from "./realLeadFollowupRepository";
import { RealUserRepository } from "./realUserRepository";
import { RealQuotationRepository } from "./realQuotationRepository";
import { RealProformaInvoiceRepository } from "./realProformaInvoiceRepository";
import { RealSalesOrderRepository } from "./realSalesOrderRepository";
import { RealSalesInvoiceRepository } from "./realSalesInvoiceRepository";
import { RealDispatchOrderRepository } from "./realDispatchOrderRepository";
import { RealAccountsReceivableRepository } from "./realAccountsReceivableRepository";
import { RealPaymentCollectionRepository } from "./realPaymentCollectionRepository";
import { RealCustomerStatementRepository } from "./realCustomerStatementRepository";
import { RealPaymentLinkRepository } from "./realPaymentLinkRepository";
import { RealReceiptVoucherRepository } from "./realReceiptVoucherRepository";
import { RealSalesReportsRepository } from "./realSalesReportsRepository";
import { RealCollectionsDashboardRepository } from "./realCollectionsDashboardRepository";
import { RealInventoryItemRepository } from "./realInventoryItemRepository";
import { RealSellerGstRepository } from "./realSellerGstRepository";
import { RealBuyerGstRepository } from "./realBuyerGstRepository";
import { RealCustomerRepository } from "./realCustomerRepository";
import { MockContactRepository } from "../mock/mockContactRepository";
import { MockActivityRepository } from "../mock/mockActivityRepository";
import { MockTaskRepository } from "../mock/mockTaskRepository";
import { MockNoteRepository } from "../mock/mockNoteRepository";
import { MockNotificationRepository } from "../mock/mockNotificationRepository";
import { MockSearchRepository } from "../mock/mockSearchRepository";

/**
 * Stage 2A wired up Leads and Opportunities; Stage 2C adds Quotations
 * (+ their supporting Inventory Item / Seller GST / Buyer GST master-data
 * lookups); Stage 2H adds Customer Master (GET/create — create is verified
 * but currently broken backend-side, see RealCustomerRepository) against
 * the real backend. Everything else (Contacts, Activities, Tasks, Notes,
 * Notifications, Search) remains out of scope and stays on the mock
 * implementation — same pattern as createMockRepository(), just per-entity.
 */
export function createRealRepository(): RevenueOSRepository {
  const users = new RealUserRepository();
  const opportunities = new RealOpportunityRepository(users);
  const quotations = new RealQuotationRepository(opportunities);
  const salesOrders = new RealSalesOrderRepository(quotations);
  return {
    kind: "real",
    leads: new RealLeadRepository(),
    leadSources: new RealLeadSourceRepository(),
    leadFollowups: new RealLeadFollowupRepository(),
    users,
    opportunities,
    quotations,
    proformaInvoices: new RealProformaInvoiceRepository(quotations),
    salesOrders,
    salesInvoices: new RealSalesInvoiceRepository(salesOrders),
    dispatchOrders: new RealDispatchOrderRepository(),
    accountsReceivable: new RealAccountsReceivableRepository(),
    paymentCollections: new RealPaymentCollectionRepository(),
    customerStatements: new RealCustomerStatementRepository(),
    paymentLinks: new RealPaymentLinkRepository(),
    receiptVouchers: new RealReceiptVoucherRepository(),
    salesReports: new RealSalesReportsRepository(),
    collectionsDashboard: new RealCollectionsDashboardRepository(),
    inventoryItems: new RealInventoryItemRepository(),
    sellerGstRegistrations: new RealSellerGstRepository(),
    buyerGstRegistrations: new RealBuyerGstRepository(),
    customers: new RealCustomerRepository(),
    contacts: new MockContactRepository(),
    activities: new MockActivityRepository(),
    tasks: new MockTaskRepository(),
    notes: new MockNoteRepository(),
    notifications: new MockNotificationRepository(),
    search: new MockSearchRepository(),
  };
}
