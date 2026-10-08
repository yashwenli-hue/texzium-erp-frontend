import { ApiError } from "../../api/httpClient";
import { previewPayment, shiftKey } from "./collections";
import {
  PAYMENT_AMOUNT_MAX,
  PAYMENT_CONFLICT_CODE,
  PAYMENT_MODES,
  PAYMENT_REFERENCE_MAX_LENGTH,
  PAYMENT_REMARKS_MAX_LENGTH,
  PaymentConflictError,
  formatRupees,
  toPaise,
} from "./paymentCollection";

/** What a person has typed into the Record Payment dialog. */
export interface PaymentFormValues {
  amount: string;
  mode: string;
  date: string;
  reference: string;
  remarks: string;
}

/** What the reference field is called, and what it wants, for each way of paying. */
export const MODE_REFERENCE: Record<string, { label: string; hint: string }> = {
  CASH: { label: "Receipt or voucher number", hint: "The slip or book number for this cash payment." },
  BANK_TRANSFER: { label: "Transaction reference (UTR)", hint: "The UTR or reference from the bank." },
  UPI: { label: "UPI transaction id", hint: "The UPI reference of the payment." },
  CHEQUE: { label: "Cheque number", hint: "The cheque number." },
  CARD: { label: "Card approval or transaction id", hint: "The approval code or transaction id." },
  OTHER: { label: "Reference", hint: "Whatever identifies this payment." },
};

export const referenceSpec = (mode: string) => MODE_REFERENCE[mode] ?? { label: "Reference", hint: "Choose how it was paid first." };

/**
 * The dialog's checks, one message per field, with the backend's own rules (amount, mode, date,
 * reference, remarks) and the one it applies against the receivable (not more than is outstanding).
 * The backend still decides; this only saves the person a round trip. `today` is the calendar
 * day in the business time zone ("2026-10-08").
 */
export function validatePaymentForm(values: PaymentFormValues, ctx: { balance: number; today: string }): Record<string, string> {
  const e: Record<string, string> = {};
  const preview = previewPayment(ctx.balance, values.amount);
  if (values.amount.trim() === "") e.amount = "Enter the amount received.";
  else if (preview.over) e.amount = `That is more than the ${formatRupees(toPaise(ctx.balance))} outstanding on this invoice.`;
  else if (!preview.valid) e.amount = "Enter an amount of at least 0.01 with at most two decimal places.";
  else if (preview.amount! > PAYMENT_AMOUNT_MAX) e.amount = "That amount is too large.";
  if (!values.mode || !(PAYMENT_MODES as readonly string[]).includes(values.mode)) e.mode = "Choose how it was paid.";
  if (!values.date) e.date = "Choose the date it was received.";
  else if (values.date > shiftKey(ctx.today, 1)) e.date = "The payment can't be dated in the future.";
  if (values.reference.trim() === "") e.reference = `${referenceSpec(values.mode).label} is required.`;
  else if (values.reference.trim().length > PAYMENT_REFERENCE_MAX_LENGTH) e.reference = `Keep it to ${PAYMENT_REFERENCE_MAX_LENGTH} characters.`;
  if (values.remarks.trim().length > PAYMENT_REMARKS_MAX_LENGTH) e.remarks = `Keep it to ${PAYMENT_REMARKS_MAX_LENGTH} characters.`;
  return e;
}

/** What to show for a payment that failed, and whether what the screen showed is out of date. */
export function paymentFailure(err: unknown): { field?: "reference"; form?: string; stale: boolean } {
  if (err instanceof PaymentConflictError) {
    if (err.code === PAYMENT_CONFLICT_CODE.DUPLICATE_REFERENCE) return { field: "reference", form: undefined, stale: false };
    const moved = err.code === PAYMENT_CONFLICT_CODE.RECEIVABLE_CHANGED || err.code === PAYMENT_CONFLICT_CODE.RECEIVABLE_BUSY;
    return { form: moved ? `${err.message} The balance above has been refreshed.` : err.message, stale: true };
  }
  if (err instanceof ApiError) return { form: err.message, stale: false };
  return { form: "Something went wrong recording the payment. Nothing was recorded; please try again.", stale: false };
}
