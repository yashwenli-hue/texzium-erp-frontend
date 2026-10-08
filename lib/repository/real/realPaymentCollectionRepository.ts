import { ID } from "../../types/common";
import { InvoiceCollections, PaymentCollection, PaymentCollectionDetail, RecordPaymentResult } from "../../types/domain";
import { CreatePaymentCollectionInput, IPaymentCollectionRepository, ListPaymentCollectionsQuery } from "../interfaces";
import { ApiError, apiFetch } from "../../api/httpClient";
import { PaymentConflictError, normalizePaymentMode } from "../shared/paymentCollection";
import {
  BackendAccountsReceivable,
  BackendInvoiceCollections,
  BackendPaymentCollection,
  BackendPaymentCollectionDetail,
  BackendPaymentCollectionEvent,
  BackendPaymentCollectionRecord,
  mapAccountsReceivable,
  mapInvoiceCollections,
  mapPaymentCollection,
  mapPaymentCollectionDetail,
  mapPaymentCollectionEvent,
  mapPaymentCollectionRecord,
} from "./mappers";

interface BackendRecordPaymentResponse {
  paymentRecord: BackendPaymentCollectionRecord;
  updatedReceivable: BackendAccountsReceivable;
  event: BackendPaymentCollectionEvent;
}

/**
 * A 409 is a refusal the person should read (more than is owed, a closed receivable,
 * an invoice that is not posted, a reference used before, a receivable that moved
 * meanwhile): raised as PaymentConflictError with the backend's message and its
 * code. A 403 gets a message that says what was refused. A 404 keeps the backend's
 * own words ("Sales invoice not found." or "This invoice has no receivable to collect
 * against."), which the shared client would otherwise replace with a generic line.
 * Anything else (a 400 with the backend's validation text, a network failure) passes
 * through.
 */
export function toPaymentError(err: unknown, forbidden: string): unknown {
  if (err instanceof ApiError) {
    if (err.status === 409) {
      const d = (err.details ?? {}) as { code?: string };
      return new PaymentConflictError(err.message, d.code);
    }
    if (err.status === 403) return new ApiError(forbidden, 403, err.details);
    if (err.status === 404) {
      const message = (err.details as { message?: unknown } | undefined)?.message;
      if (typeof message === "string" && message.trim() !== "") return new ApiError(message, 404, err.details);
    }
  }
  return err;
}

/**
 * VERIFIED routes (backend, Payment Collection V1):
 *   POST /payment-collections                       needs collections.record
 *   GET  /payment-collections                       needs collections.view (newest first, capped)
 *   GET  /payment-collections/:id                   needs collections.view
 *   GET  /payment-collections/invoices/:invoiceId   needs collections.view
 * The recorder is the signed-in user; it is never sent. The response of POST is
 * { paymentRecord, updatedReceivable, event }: updatedReceivable has no nested
 * invoice, so read getForInvoice() for the display copy.
 *
 * SECURITY NOTE: the other payment-related routes this frontend calls
 * (/receipt-vouchers, /payment-links, /accounts-receivable, /customer-statements,
 * /collections-dashboard, /collection-reminders) are NOT guarded by this release.
 */
export class RealPaymentCollectionRepository implements IPaymentCollectionRepository {
  async create(input: CreatePaymentCollectionInput): Promise<RecordPaymentResult> {
    try {
      const raw = await apiFetch<BackendRecordPaymentResponse>("/payment-collections", {
        method: "POST",
        body: {
          salesInvoiceId: input.salesInvoiceId,
          paymentDate: input.paymentDate,
          amountReceived: input.amountReceived,
          paymentMode: normalizePaymentMode(input.paymentMode),
          referenceNo: input.referenceNo.trim(),
          ...(input.remarks && input.remarks.trim() ? { remarks: input.remarks.trim() } : {}),
        },
      });
      return {
        paymentRecord: mapPaymentCollectionRecord(raw.paymentRecord),
        updatedReceivable: mapAccountsReceivable(raw.updatedReceivable),
        event: mapPaymentCollectionEvent(raw.event),
      };
    } catch (err) {
      throw toPaymentError(err, "You don't have permission to record payments.");
    }
  }

  async list(query?: ListPaymentCollectionsQuery): Promise<PaymentCollection[]> {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined && value !== "") params.set(key, String(value));
    }
    const qs = params.toString();
    try {
      const rows = await apiFetch<BackendPaymentCollection[]>(`/payment-collections${qs ? `?${qs}` : ""}`);
      return rows.map(mapPaymentCollection);
    } catch (err) {
      throw toPaymentError(err, "You don't have permission to view payment collections.");
    }
  }

  async getById(id: ID): Promise<PaymentCollectionDetail> {
    try {
      return mapPaymentCollectionDetail(await apiFetch<BackendPaymentCollectionDetail>(`/payment-collections/${id}`));
    } catch (err) {
      throw toPaymentError(err, "You don't have permission to view payment collections.");
    }
  }

  async getForInvoice(salesInvoiceId: ID): Promise<InvoiceCollections> {
    try {
      return mapInvoiceCollections(await apiFetch<BackendInvoiceCollections>(`/payment-collections/invoices/${salesInvoiceId}`));
    } catch (err) {
      throw toPaymentError(err, "You don't have permission to view payment collections.");
    }
  }
}
