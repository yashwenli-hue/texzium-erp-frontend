import { RevenueOSRepository } from "../interfaces";
import { MockLeadRepository } from "./mockLeadRepository";
import { MockLeadSourceRepository } from "./mockLeadSourceRepository";
import { MockLeadFollowupRepository } from "./mockLeadFollowupRepository";
import { MockUserRepository } from "./mockUserRepository";
import { MockCustomerRepository } from "./mockCustomerRepository";
import { MockCustomerGstRepository } from "./mockCustomerGstRepository";
import { MockContactRepository } from "./mockContactRepository";
import { MockActivityRepository } from "./mockActivityRepository";
import { MockTaskRepository } from "./mockTaskRepository";
import { MockNoteRepository } from "./mockNoteRepository";
import { MockOpportunityRepository } from "./mockOpportunityRepository";
import { MockQuotationRepository } from "./mockQuotationRepository";
import { MockProformaInvoiceRepository } from "./mockProformaInvoiceRepository";
import { MockSalesOrderRepository } from "./mockSalesOrderRepository";
import { MockSalesOrderCommercialRepository } from "./mockSalesOrderCommercialRepository";
import { MockSalesInvoiceRepository } from "./mockSalesInvoiceRepository";
import { MockDispatchOrderRepository } from "./mockDispatchOrderRepository";
import { MockAccountsReceivableRepository } from "./mockAccountsReceivableRepository";
import { MockPaymentCollectionRepository } from "./mockPaymentCollectionRepository";
import { MockCustomerStatementRepository } from "./mockCustomerStatementRepository";
import { MockPaymentLinkRepository } from "./mockPaymentLinkRepository";
import { MockDocumentProfileRepository } from "./mockDocumentProfileRepository";
import { MockReceiptVoucherRepository } from "./mockReceiptVoucherRepository";
import { MockSalesReportsRepository } from "./mockSalesReportsRepository";
import { MockCollectionsDashboardRepository } from "./mockCollectionsDashboardRepository";
import { MockInventoryItemRepository } from "./mockInventoryItemRepository";
import { MockSellerGstRepository } from "./mockSellerGstRepository";
import { MockBuyerGstRepository } from "./mockBuyerGstRepository";
import { MockNotificationRepository } from "./mockNotificationRepository";
import { MockSearchRepository } from "./mockSearchRepository";
import { MockDataDeletionRepository } from "./mockDataDeletionRepository";

/**
 * The temporary, fully in-memory implementation of RevenueOSRepository.
 * This is what RepositoryProvider wires up today. When the real backend
 * integration begins, create lib/repository/real/realRepository.ts
 * implementing the same RevenueOSRepository interface (backed by fetch
 * calls to the existing API) and swap ONE line in RepositoryProvider.tsx.
 */
export function createMockRepository(): RevenueOSRepository {
  return {
    kind: "mock",
    leads: new MockLeadRepository(),
    leadSources: new MockLeadSourceRepository(),
    leadFollowups: new MockLeadFollowupRepository(),
    users: new MockUserRepository(),
    customers: new MockCustomerRepository(),
    customerGst: new MockCustomerGstRepository(),
    contacts: new MockContactRepository(),
    activities: new MockActivityRepository(),
    tasks: new MockTaskRepository(),
    notes: new MockNoteRepository(),
    opportunities: new MockOpportunityRepository(),
    quotations: new MockQuotationRepository(),
    proformaInvoices: new MockProformaInvoiceRepository(),
    salesOrders: new MockSalesOrderRepository(),
    salesOrderCommercial: new MockSalesOrderCommercialRepository(),
    salesInvoices: new MockSalesInvoiceRepository(),
    dispatchOrders: new MockDispatchOrderRepository(),
    accountsReceivable: new MockAccountsReceivableRepository(),
    paymentCollections: new MockPaymentCollectionRepository(),
    customerStatements: new MockCustomerStatementRepository(),
    paymentLinks: new MockPaymentLinkRepository(),
    receiptVouchers: new MockReceiptVoucherRepository(),
    documentProfile: new MockDocumentProfileRepository(),
    salesReports: new MockSalesReportsRepository(),
    collectionsDashboard: new MockCollectionsDashboardRepository(),
    inventoryItems: new MockInventoryItemRepository(),
    sellerGstRegistrations: new MockSellerGstRepository(),
    buyerGstRegistrations: new MockBuyerGstRepository(),
    notifications: new MockNotificationRepository(),
    dataDeletions: new MockDataDeletionRepository(),
    search: new MockSearchRepository(),
  };
}
