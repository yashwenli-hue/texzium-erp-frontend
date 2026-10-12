import { ID } from "../../types/common";
import { ReceiptVoucher } from "../../types/domain";
import { IReceiptVoucherRepository } from "../interfaces";
import { ApiError, apiFetch, DownloadedFile } from "../../api/httpClient";
import { BackendReceiptVoucher, mapReceiptVoucher } from "./mappers";
import { downloadDocument } from "./documentDownload";

/**
 * VERIFIED (backend 2026-10-15): `POST /receipt-vouchers/:paymentCollectionId/generate`
 * (collections.record) gives a payment its receipt, numbered from the
 * company receipt series; a payment has one receipt and asking again returns
 * it. `GET /receipt-vouchers?salesInvoiceId=` and `GET /:id/document.pdf`
 * (collections.view) list an invoice's receipts and download one, built in
 * memory. The old disk-writing `/receipt-pdf` route no longer exists.
 */
export class RealReceiptVoucherRepository implements IReceiptVoucherRepository {
  async generate(paymentCollectionId: ID): Promise<ReceiptVoucher> {
    try {
      const raw = await apiFetch<BackendReceiptVoucher>(`/receipt-vouchers/${encodeURIComponent(paymentCollectionId)}/generate`, { method: "POST" });
      return mapReceiptVoucher(raw);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) throw new ApiError("You don't have permission to generate receipts.", 403, err.details);
      throw err;
    }
  }

  async listForInvoice(salesInvoiceId: ID): Promise<ReceiptVoucher[]> {
    const rows = await apiFetch<BackendReceiptVoucher[]>(`/receipt-vouchers?salesInvoiceId=${encodeURIComponent(salesInvoiceId)}`);
    return rows.map(mapReceiptVoucher);
  }

  downloadPdf(id: ID): Promise<DownloadedFile> {
    return downloadDocument(`/receipt-vouchers/${encodeURIComponent(id)}/document.pdf`, "receipt.pdf", "You don't have permission to view receipts.");
  }
}
