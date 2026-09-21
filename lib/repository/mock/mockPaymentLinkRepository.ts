import { ID } from "../../types/common";
import { PaymentLinkResult } from "../../types/domain";
import { IPaymentLinkRepository } from "../interfaces";
import { db } from "./db";
import { delay } from "./queryUtils";

/**
 * Mirrors the real MANUAL branch — the only branch the live backend
 * actually returns today, since its one PaymentGatewayConfig row is
 * inactive (see PaymentLinkResult in lib/types/domain.ts). Bank details
 * below match the real, verified config row, not invented values.
 */
export class MockPaymentLinkRepository implements IPaymentLinkRepository {
  async generate(salesInvoiceId: ID): Promise<PaymentLinkResult> {
    const invoice = db.salesInvoices.getById(salesInvoiceId);
    if (!invoice) throw new Error("Invoice not found");
    return delay({
      mode: "MANUAL",
      amount: invoice.totalAmount,
      bankName: "HDFC Bank",
      accountName: "Texzium Pvt Ltd",
      accountNumber: "123456789012",
      ifscCode: "HDFC0001234",
      upiId: "texzium@upi",
    });
  }
}
