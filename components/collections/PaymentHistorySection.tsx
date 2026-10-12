"use client";

import { useEffect, useState } from "react";
import { Button } from "../ui/Button";
import { useToast } from "../ui/Toast";
import { PaymentHistoryList } from "./parts";
import { ReceiptConfirmDialog } from "./ReceiptConfirmDialog";
import { useReceiptVoucher } from "../../lib/hooks/useReceiptVouchers";
import { useDocumentDownload } from "../../lib/hooks/useDocumentDownload";
import { useRepository } from "../../lib/repository/RepositoryProvider";
import { PaymentCollectionEvent, PaymentCollectionRecord, ReceiptVoucher } from "../../lib/types/domain";

/**
 * A receivable's payments with the one thing that can be done to a past payment: ask Finance
 * for a receipt. That is never a single click (see ReceiptConfirmDialog). A payment has at most
 * one receipt (asking again returns it); the receipts that exist are loaded for the invoice and
 * each can be downloaded as a PDF the backend builds.
 */
export function PaymentHistorySection({
  collections,
  events,
  salesInvoiceId,
  invoiceNumber,
  customer,
  canGenerateReceipt,
}: {
  collections: PaymentCollectionRecord[];
  events: PaymentCollectionEvent[];
  salesInvoiceId: string;
  invoiceNumber: string;
  /** customerDescription(): the governed customer, or exactly what is known. */
  customer: string;
  canGenerateReceipt: boolean;
}) {
  const toast = useToast();
  const repo = useRepository();
  const { generate } = useReceiptVoucher();
  const { downloading, download } = useDocumentDownload();
  const [asking, setAsking] = useState<PaymentCollectionRecord | null>(null);
  const [vouchers, setVouchers] = useState<Record<string, ReceiptVoucher>>({});

  // The receipts this invoice's payments already have (read: collections.view).
  useEffect(() => {
    let cancelled = false;
    repo.receiptVouchers
      .listForInvoice(salesInvoiceId)
      .then((list) => {
        if (!cancelled) setVouchers((m) => ({ ...Object.fromEntries(list.map((v) => [v.paymentCollectionId, v])), ...m }));
      })
      .catch(() => {
        // Without the list a payment still offers "Generate receipt…", which returns its existing receipt.
      });
    return () => {
      cancelled = true;
    };
  }, [repo, salesInvoiceId]);

  return (
    <>
      <PaymentHistoryList
        collections={collections}
        events={events}
        renderAction={(c) => {
          const v = vouchers[c.id];
          if (v)
            return (
              <>
                Receipt <b>{v.receiptNumber}</b>{" "}
                <Button variant="ghost" icon="file" disabled={downloading} onClick={() => download(() => repo.receiptVouchers.downloadPdf(v.id), `Receipt ${v.receiptNumber ?? ""} downloaded`)}>
                  {downloading ? "Preparing…" : "Download PDF"}
                </Button>
              </>
            );
          return canGenerateReceipt ? (
            <Button variant="ghost" onClick={() => setAsking(c)}>
              Generate receipt…
            </Button>
          ) : null;
        }}
      />
      {asking && (
        <ReceiptConfirmDialog
          context={{ amount: asking.amount, paymentMode: asking.paymentMode, referenceNumber: asking.referenceNumber, paymentDate: asking.paymentDate, customer, invoice: invoiceNumber }}
          onConfirm={async () => {
            const v = await generate(asking.id);
            setVouchers((m) => ({ ...m, [asking.id]: v }));
            toast.show(`Receipt ${v.receiptNumber} generated`, "check");
          }}
          onClose={() => setAsking(null)}
        />
      )}
    </>
  );
}
