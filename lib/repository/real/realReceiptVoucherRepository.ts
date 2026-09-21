import { ID } from "../../types/common";
import { ReceiptVoucher } from "../../types/domain";
import { IReceiptVoucherRepository } from "../interfaces";
import { apiFetch } from "../../api/httpClient";
import { BackendReceiptVoucher, mapReceiptVoucher } from "./mappers";

/**
 * VERIFIED: `POST /receipt-vouchers/:paymentCollectionId/generate`, no
 * body. Only callable with a real PaymentCollection id, which is only ever
 * available from that payment's own creation response (see
 * PaymentCollectionRecord) — there is no way to resolve one after the fact.
 * `GET /receipt-pdf/:receiptVoucherId` deliberately has no repository
 * method here: it writes a PDF to the backend's own server filesystem and
 * returns a local file path, not a downloadable response — nothing this
 * frontend could use. No guard.
 */
export class RealReceiptVoucherRepository implements IReceiptVoucherRepository {
  async generate(paymentCollectionId: ID): Promise<ReceiptVoucher> {
    const raw = await apiFetch<BackendReceiptVoucher>(`/receipt-vouchers/${paymentCollectionId}/generate`, { method: "POST" });
    return mapReceiptVoucher(raw);
  }
}
