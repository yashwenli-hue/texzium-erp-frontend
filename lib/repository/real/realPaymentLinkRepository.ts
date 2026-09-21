import { ID } from "../../types/common";
import { PaymentLinkResult } from "../../types/domain";
import { IPaymentLinkRepository } from "../interfaces";
import { apiFetch } from "../../api/httpClient";

interface BackendPaymentLinkResult {
  mode: string;
  amount: number;
  gateway?: string;
  paymentLink?: string;
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  ifscCode?: string;
  upiId?: string;
}

/**
 * VERIFIED: `POST /payment-links/:salesInvoiceId/generate`, no body. Returns
 * either an ONLINE branch (synthetic `https://pay.{gateway}.com/{invoiceId}`
 * link — not a real gateway integration) or a MANUAL branch (bank transfer
 * details) depending on whether an active PaymentGatewayConfig row exists.
 * The one real config row in this backend is inactive, so MANUAL is what
 * the live endpoint actually returns today — `mode` is read from the real
 * response, never assumed. No guard.
 */
export class RealPaymentLinkRepository implements IPaymentLinkRepository {
  async generate(salesInvoiceId: ID): Promise<PaymentLinkResult> {
    const raw = await apiFetch<BackendPaymentLinkResult>(`/payment-links/${salesInvoiceId}/generate`, { method: "POST" });
    return { ...raw };
  }
}
