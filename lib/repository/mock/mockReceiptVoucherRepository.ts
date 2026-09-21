import { ID } from "../../types/common";
import { ReceiptVoucher } from "../../types/domain";
import { IReceiptVoucherRepository } from "../interfaces";
import { db } from "./db";
import { delay } from "./queryUtils";
import { mockId } from "./entityStore";

/** Mirrors the real generate() — only reachable with a paymentCollectionId from that payment's own just-returned creation response, same as the real API. */
export class MockReceiptVoucherRepository implements IReceiptVoucherRepository {
  async generate(paymentCollectionId: ID): Promise<ReceiptVoucher> {
    const payment = db.paymentCollections.getById(paymentCollectionId);
    if (!payment) throw new Error("Payment Collection not found");
    const receiptNumber = `RCPT-${Math.floor(Math.random() * 1000000)}`;
    const voucher: ReceiptVoucher = {
      id: mockId("RV"),
      receiptNumber,
      paymentCollectionId: payment.id,
      receiptDate: payment.paymentDate,
      amountReceived: payment.amount,
      paymentMode: payment.paymentMode,
      referenceNo: payment.referenceNumber,
      remarks: "Auto generated receipt",
      createdAt: new Date().toISOString(),
    };
    return delay(voucher);
  }
}
