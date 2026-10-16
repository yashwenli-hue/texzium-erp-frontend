"use client";

import { useState } from "react";
import { Modal } from "../ui/Modal";
import { TextField, TextAreaField } from "../ui/FormField";
import { Button } from "../ui/Button";
import { useToast } from "../ui/Toast";
import { formatInrExact } from "../../lib/format";
import {
  QUOTATION_REMARKS_MAX_LENGTH,
  computeQuotationAmounts,
  parseTaxableAmount,
  parseUnitRate,
} from "../../lib/repository/shared/quotationLifecycle";
import type { DocumentLine } from "../../lib/types/domain";
import type { QuotationRevision } from "../../lib/repository/interfaces";

/**
 * Revising a quotation changes its price. A quotation with a priced line is
 * revised by its UNIT RATE (its quantity stays); one stored before lines
 * existed, by its TAXABLE amount. GST comes from the percentage the quotation
 * already carries and the total is their sum, so the person never types (or
 * can get wrong) a total. The preview below uses the same rule the backend
 * applies; the backend recomputes and its figures are the ones that are saved
 * and shown afterwards.
 */
export function QuotationReviseDialog({
  quoteNo,
  status,
  current,
  taxType,
  line,
  onClose,
  onSubmit,
}: {
  quoteNo: string;
  status: string;
  current: { taxableAmount: number; gstPercent: number; gstAmount: number; totalAmount: number };
  taxType?: string;
  /** The quotation's priced line, when it has one: then the unit rate is revised. */
  line?: DocumentLine;
  onClose: () => void;
  onSubmit: (change: QuotationRevision, remarks?: string) => Promise<unknown>;
}) {
  const toast = useToast();
  const byRate = !!line;
  const [taxable, setTaxable] = useState(String(byRate ? line.unitRate : current.taxableAmount));
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const parsed = byRate ? parseUnitRate(taxable) : parseTaxableAmount(taxable);
  const next = parsed.error === undefined ? computeQuotationAmounts(byRate ? parsed.value * line.quantity : parsed.value, current.gstPercent) : null;
  const delta = (a: number, b: number) => {
    const d = Math.round((b - a) * 100) / 100;
    if (d === 0) return "no change";
    return `${d > 0 ? "+" : "−"}${formatInrExact(Math.abs(d))}`;
  };
  const cls = (a: number, b: number) => (b > a ? "up" : b < a ? "down" : "");

  async function handleSubmit() {
    if (parsed.error !== undefined) {
      setError(parsed.error);
      return;
    }
    if (remarks.trim().length > QUOTATION_REMARKS_MAX_LENGTH) {
      setFormError(`Keep remarks under ${QUOTATION_REMARKS_MAX_LENGTH} characters.`);
      return;
    }
    setSubmitting(true);
    setError(null);
    setFormError(null);
    try {
      await onSubmit(byRate ? { unitPrice: parsed.value } : { taxableAmount: parsed.value }, remarks.trim() || undefined);
      toast.success(`${quoteNo} revised — it needs approval again`);
      onClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title={`Revise ${quoteNo}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Saving…" : "Save revision"}
          </Button>
        </>
      }
    >
      <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>
        {status === "APPROVED" ? (
          <>
            <b style={{ color: "var(--text)" }}>This quotation is approved.</b> Revising it moves it back to{" "}
            <b style={{ color: "var(--text)" }}>Revised</b> and it must be approved again before a Proforma Invoice can be created.
          </>
        ) : (
          <>Saving moves this quotation to <b style={{ color: "var(--text)" }}>Revised</b>. It needs approval before a Proforma Invoice can be created.</>
        )}
      </p>
      {byRate && (
        <p style={{ fontSize: 13, marginBottom: 8 }} data-testid="revise-line">
          <b>{line.description}</b> · quantity {line.quantity} · current rate {formatInrExact(line.unitRate)}
        </p>
      )}
      <TextField
        label={byRate ? "New unit rate (₹)" : "New taxable amount (₹)"}
        required
        type="number"
        inputMode="decimal"
        min={0}
        step="0.01"
        value={taxable}
        onChange={(e) => setTaxable(e.target.value)}
        error={error ?? undefined}
        autoFocus
      />
      <table className="preview" aria-label="Revision preview">
        <thead>
          <tr>
            <th scope="col"> </th>
            <th scope="col">Current</th>
            <th scope="col">After revision</th>
            <th scope="col">Change</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Taxable amount</td>
            <td>{formatInrExact(current.taxableAmount)}</td>
            <td data-testid="preview-taxable">{next ? formatInrExact(next.taxableAmount) : "—"}</td>
            <td className={next ? cls(current.taxableAmount, next.taxableAmount) : ""}>{next ? delta(current.taxableAmount, next.taxableAmount) : "—"}</td>
          </tr>
          <tr>
            <td>GST {current.gstPercent}%{taxType ? ` · ${taxType.replace("_", " + ")}` : ""}</td>
            <td>{formatInrExact(current.gstAmount)}</td>
            <td data-testid="preview-gst">{next ? formatInrExact(next.gstAmount) : "—"}</td>
            <td className={next ? cls(current.gstAmount, next.gstAmount) : ""}>{next ? delta(current.gstAmount, next.gstAmount) : "—"}</td>
          </tr>
          <tr className="total">
            <td>Total</td>
            <td>{formatInrExact(current.totalAmount)}</td>
            <td data-testid="preview-total">{next ? formatInrExact(next.totalAmount) : "—"}</td>
            <td className={next ? cls(current.totalAmount, next.totalAmount) : ""}>{next ? delta(current.totalAmount, next.totalAmount) : "—"}</td>
          </tr>
        </tbody>
      </table>
      <p className="preview-note">
        A preview. {byRate ? `The taxable amount is the quantity (${line.quantity}) × the rate; ` : ""}GST uses the {current.gstPercent}% already on this quotation and the total is the sum; the system
        recalculates them when you save, and its figures are the ones recorded.
      </p>
      <div style={{ marginTop: 14 }}>
        <TextAreaField
          label="Remarks"
          rows={3}
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="What changed and why (optional) — kept in this quotation's history"
        />
      </div>
      {formError && <p role="alert" style={{ color: "var(--bad)", fontSize: 12.5 }}>{formError}</p>}
    </Modal>
  );
}
