"use client";

import { useMemo, useState } from "react";
import { Modal } from "../ui/Modal";
import { FieldRow, SelectField, TextAreaField, TextField } from "../ui/FormField";
import { Button } from "../ui/Button";
import { MoneyText } from "../ui/MoneyText";
import { useToast } from "../ui/Toast";
import { ReceiptConfirmDialog } from "./ReceiptConfirmDialog";
import { CollectionStateTag } from "./parts";
import { useRecordPayment } from "../../lib/hooks/usePaymentCollections";
import { useReceiptVoucher } from "../../lib/hooks/useReceiptVouchers";
import { useDocumentDownload } from "../../lib/hooks/useDocumentDownload";
import { useRepository } from "../../lib/repository/RepositoryProvider";
import { CollectionState, CustomerIdentity, customerDescription, formatDay, previewPayment, shiftKey, todayKey } from "../../lib/repository/shared/collections";
import { paymentFailure, referenceSpec, validatePaymentForm } from "../../lib/repository/shared/paymentForm";
import { PAYMENT_MODES, PAYMENT_REFERENCE_MAX_LENGTH, formatRupees, paymentModeLabel, toPaise } from "../../lib/repository/shared/paymentCollection";
import { ReceiptVoucher, RecordPaymentResult } from "../../lib/types/domain";

export interface PaymentTarget {
  salesInvoiceId: string;
  invoiceNumber: string;
  identity: CustomerIdentity;
  invoiceCustomerName?: string;
  /** What is outstanding NOW, as the screen last read it. The backend decides with the figure it holds. */
  balance: number;
  state?: CollectionState;
  dueDate?: string;
}

/**
 * Records one payment against one invoice's receivable. Everything the backend refuses is
 * checked here first (amount, mode, date, reference, more than is outstanding) with the same
 * rules, but the backend decides: if the receivable moved meanwhile, or the reference was used
 * before, it says so and the screen shows exactly that. The recorder is whoever is signed in;
 * nothing about who is ever sent.
 */
export function RecordPaymentDialog({ target: opened, liveBalance, onClose, onRecorded, onStale }: { target: PaymentTarget; /** The receivable's balance as the opener holds it NOW (it changes when a refused payment makes the screen reload). Falls back to the balance the dialog was opened with. */ liveBalance?: number; onClose: () => void; onRecorded?: (result: RecordPaymentResult) => void; onStale?: () => void }) {
  const target: PaymentTarget = liveBalance === undefined ? opened : { ...opened, balance: liveBalance };
  const toast = useToast();
  const repo = useRepository();
  const { downloading, download } = useDocumentDownload();
  const { recordPayment } = useRecordPayment();
  const { generate } = useReceiptVoucher();
  const today = useMemo(() => todayKey(new Date()), []);

  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState("");
  const [date, setDate] = useState(today);
  const [reference, setReference] = useState("");
  const [remarks, setRemarks] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<RecordPaymentResult | null>(null);
  const [voucher, setVoucher] = useState<ReceiptVoucher | null>(null);
  const [confirmReceipt, setConfirmReceipt] = useState(false);

  const preview = previewPayment(target.balance, amount);
  const refSpec = referenceSpec(mode);
  const customer = customerDescription(target.identity, target.invoiceCustomerName);

  function validate(): boolean {
    const e = validatePaymentForm({ amount, mode, date, reference, remarks }, { balance: target.balance, today });
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit() {
    if (submitting || !validate()) return;
    setSubmitting(true);
    setErrors({});
    try {
      const res = await recordPayment({
        salesInvoiceId: target.salesInvoiceId,
        paymentDate: `${date}T00:00:00.000Z`,
        amountReceived: preview.amount!,
        paymentMode: mode,
        referenceNo: reference.trim(),
        remarks: remarks.trim() || undefined,
      });
      setResult(res);
      toast.show(`Payment of ${formatRupees(toPaise(res.paymentRecord.amount))} recorded`, "check");
      onRecorded?.(res);
    } catch (err) {
      const f = paymentFailure(err);
      setErrors(f.field ? { [f.field]: (err as Error).message } : { form: f.form ?? "" });
      // The balance this screen showed may be out of date: have it reloaded.
      if (f.stale) onStale?.();
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    const p = result.paymentRecord;
    return (
      <>
        <Modal
          title="Payment recorded"
          onClose={onClose}
          footer={
            <>
              {!voucher && (
                <Button variant="ghost" icon="receipt" onClick={() => setConfirmReceipt(true)}>
                  Generate receipt
                </Button>
              )}
              <Button variant="primary" onClick={onClose}>
                Done
              </Button>
            </>
          }
        >
          <div className="pay-dialog">
            <div className="done-box" role="status" data-testid="payment-recorded">
              <b>
                <MoneyText value={p.amount} mode="exact" />
              </b>{" "}
              received by {paymentModeLabel(p.paymentMode)}, ref {p.referenceNumber}, {formatDay(p.paymentDate)}.
              <br />
              {result.updatedReceivable.paymentStatus === "PAID" ? (
                <>The invoice is now fully paid.</>
              ) : (
                <>
                  <MoneyText value={result.updatedReceivable.balanceAmount} mode="exact" /> is still outstanding.
                </>
              )}
              {voucher && (
                <p style={{ margin: "8px 0 0" }}>
                  Receipt <b>{voucher.receiptNumber}</b> generated.{" "}
                  <Button variant="ghost" icon="file" disabled={downloading} onClick={() => download(() => repo.receiptVouchers.downloadPdf(voucher.id), `Receipt ${voucher.receiptNumber ?? ""} downloaded`)}>
                    {downloading ? "Preparing…" : "Download PDF"}
                  </Button>
                </p>
              )}
            </div>
          </div>
        </Modal>
        {confirmReceipt && (
          <ReceiptConfirmDialog
            context={{ amount: p.amount, paymentMode: p.paymentMode, referenceNumber: p.referenceNumber, paymentDate: p.paymentDate, customer, invoice: target.invoiceNumber }}
            onConfirm={async () => {
              const v = await generate(p.id);
              setVoucher(v);
              toast.show(`Receipt ${v.receiptNumber} generated`, "check");
            }}
            onClose={() => setConfirmReceipt(false)}
          />
        )}
      </>
    );
  }

  return (
    <Modal
      title="Record payment"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={submitting}>
            {submitting ? "Recording…" : "Record payment"}
          </Button>
        </>
      }
    >
      <div className="pay-dialog" data-testid="record-payment">
        <div className="ctx">
          <div>
            <span className="k">Invoice</span>
            {target.invoiceNumber}
          </div>
          <div>
            <span className="k">Customer</span>
            {customer}
          </div>
          <div>
            <span className="k">Outstanding</span>
            <b>
              <MoneyText value={target.balance} mode="exact" />
            </b>
          </div>
          {target.state && (
            <div>
              <span className="k">Status</span>
              <CollectionStateTag state={target.state} />
            </div>
          )}
        </div>
        <TextField
          label="Amount received (₹)"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          error={errors.amount}
          inputMode="decimal"
          autoComplete="off"
          hint="At most two decimal places, and no more than what is outstanding."
        />
        <Button variant="ghost" className="full-btn" onClick={() => setAmount(String(target.balance))} disabled={submitting || target.balance <= 0}>
          Pay the full balance
        </Button>
        {amount.trim() !== "" && (preview.valid || preview.over) && (
          <p className={`preview ${preview.over ? "bad" : preview.statusAfter === "PAID" ? "done" : ""}`} role="status" data-testid="payment-preview">
            {preview.over ? (
              <>That is more than what is outstanding.</>
            ) : preview.statusAfter === "PAID" ? (
              <>This pays the invoice in full.</>
            ) : (
              <>
                Leaves <MoneyText value={preview.balanceAfter!} mode="exact" /> outstanding.
              </>
            )}
          </p>
        )}
        <FieldRow>
          <SelectField
            label="Paid by"
            required
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            error={errors.mode}
            options={[{ value: "", label: "Choose…" }, ...PAYMENT_MODES.map((m) => ({ value: m, label: paymentModeLabel(m) }))]}
          />
          <TextField label="Date received" required type="date" value={date} max={shiftKey(today, 1)} onChange={(e) => setDate(e.target.value)} error={errors.date} />
        </FieldRow>
        <TextField
          label={refSpec.label}
          required
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          error={errors.reference}
          hint={refSpec.hint}
          maxLength={PAYMENT_REFERENCE_MAX_LENGTH + 20}
          autoComplete="off"
        />
        <TextAreaField label="Remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} error={errors.remarks} placeholder="Optional" />
        {errors.form && (
          <p className="form-error" role="alert" data-testid="payment-error">
            {errors.form}
          </p>
        )}
      </div>
    </Modal>
  );
}
