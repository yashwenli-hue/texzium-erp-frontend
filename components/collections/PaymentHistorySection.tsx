"use client";

import { useState } from "react";
import { Button } from "../ui/Button";
import { useToast } from "../ui/Toast";
import { PaymentHistoryList } from "./parts";
import { ReceiptConfirmDialog } from "./ReceiptConfirmDialog";
import { useReceiptVoucher } from "../../lib/hooks/useReceiptVouchers";
import { PaymentCollectionEvent, PaymentCollectionRecord, ReceiptVoucher } from "../../lib/types/domain";

/**
 * A receivable's payments with the one thing that can be done to a past payment: ask Finance
 * for a receipt. That is never a single click (see ReceiptConfirmDialog), and the receipt that
 * comes back is shown against the payment it was made for.
 */
export function PaymentHistorySection({
  collections,
  events,
  invoiceNumber,
  customer,
  canGenerateReceipt,
}: {
  collections: PaymentCollectionRecord[];
  events: PaymentCollectionEvent[];
  invoiceNumber: string;
  /** customerDescription(): the governed customer, or exactly what is known. */
  customer: string;
  canGenerateReceipt: boolean;
}) {
  const toast = useToast();
  const { generate } = useReceiptVoucher();
  const [asking, setAsking] = useState<PaymentCollectionRecord | null>(null);
  const [vouchers, setVouchers] = useState<Record<string, ReceiptVoucher>>({});

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
                Receipt <b>{v.receiptNumber}</b> generated.
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
