import { CreatePaymentCollectionInput, IPaymentCollectionRepository } from "../interfaces";
import { RecordPaymentResult } from "../../types/domain";
import { apiFetch } from "../../api/httpClient";
import { BackendAccountsReceivable, BackendPaymentCollectionRecord, mapAccountsReceivable, mapPaymentCollectionRecord } from "./mappers";

interface BackendRecordPaymentResponse {
  paymentRecord: BackendPaymentCollectionRecord;
  updatedReceivable: BackendAccountsReceivable;
}

/**
 * VERIFIED: `POST /payment-collections` only — the live RevenueOS
 * implementation (a second, identically-routed FinanceOS payment-collections
 * module exists in source but is never imported into AppModule, so it's dead
 * code with no live route, same pattern as sales-invoices in Stage 2F). No
 * `GET /payment-collections` exists (confirmed 404) — this repository is
 * create-only, honestly.
 *
 * The response body is `{ paymentRecord, updatedReceivable }` — updatedReceivable
 * has no nested salesInvoice (unlike GET /accounts-receivable), so callers
 * should re-fetch via IAccountsReceivableRepository.getBySalesInvoiceId()
 * for the display-authoritative, fully-denormalized copy rather than trust
 * this response's updatedReceivable for rendering.
 *
 * SECURITY NOTE (not fixed — backend is read-only): no `@UseGuards` on this
 * controller. Confirmed by reading payment-collections.controller.ts directly.
 */
export class RealPaymentCollectionRepository implements IPaymentCollectionRepository {
  async create(input: CreatePaymentCollectionInput): Promise<RecordPaymentResult> {
    const raw = await apiFetch<BackendRecordPaymentResponse>("/payment-collections", {
      method: "POST",
      body: {
        salesInvoiceId: input.salesInvoiceId,
        paymentDate: input.paymentDate,
        amountReceived: input.amountReceived,
        paymentMode: input.paymentMode,
        referenceNo: input.referenceNo,
      },
    });
    return {
      paymentRecord: mapPaymentCollectionRecord(raw.paymentRecord),
      updatedReceivable: mapAccountsReceivable(raw.updatedReceivable),
    };
  }
}
