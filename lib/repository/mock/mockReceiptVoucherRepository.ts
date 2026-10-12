import { ID } from "../../types/common";
import { ReceiptVoucher } from "../../types/domain";
import { IReceiptVoucherRepository } from "../interfaces";
import { ApiError, DownloadedFile } from "../../api/httpClient";
import { db } from "./db";
import { delay } from "./queryUtils";
import { mockId } from "./entityStore";
import { mockPdf } from "./mockDocuments";

// Receipts generated in this mock session (the mock database has no receipt store).
const receipts: ReceiptVoucher[] = [];
let receiptCounter = 0;

/** Mirrors the backend (2026-10-15): one receipt per payment, asking again returns it, numbered RC/<FY>/<n>. */
export class MockReceiptVoucherRepository implements IReceiptVoucherRepository {
  async generate(paymentCollectionId: ID): Promise<ReceiptVoucher> {
    const payment = db.paymentCollections.getById(paymentCollectionId);
    if (!payment) throw new ApiError("Payment collection not found.", 404);
    const existing = receipts.find((r) => r.paymentCollectionId === payment.id);
    if (existing) return delay(existing);
    receiptCounter += 1;
    const voucher: ReceiptVoucher = {
      id: mockId("RV"),
      receiptNumber: `RC/26-27/${String(receiptCounter).padStart(5, "0")}`,
      paymentCollectionId: payment.id,
      receiptDate: payment.paymentDate,
      amountReceived: payment.amount,
      paymentMode: payment.paymentMode,
      referenceNo: payment.referenceNumber,
      remarks: "Auto generated receipt",
      createdAt: new Date().toISOString(),
    };
    receipts.push(voucher);
    return delay(voucher);
  }

  async listForInvoice(salesInvoiceId: ID): Promise<ReceiptVoucher[]> {
    const payments = new Set(
      db.paymentCollections
        .getAll()
        .filter((p) => db.accountsReceivable.getById(p.accountsReceivableId)?.salesInvoiceId === salesInvoiceId)
        .map((p) => p.id)
    );
    return delay(receipts.filter((r) => payments.has(r.paymentCollectionId)));
  }

  async downloadPdf(id: ID): Promise<DownloadedFile> {
    const r = receipts.find((x) => x.id === id);
    if (!r) throw new ApiError("Receipt not found.", 404);
    return mockPdf(`Payment Receipt ${r.receiptNumber}`, [`Amount received: ${r.amountReceived}`], `receipt-${r.receiptNumber}`);
  }
}
