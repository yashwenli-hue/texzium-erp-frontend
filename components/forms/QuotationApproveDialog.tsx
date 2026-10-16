"use client";

import { useState } from "react";
import { Modal } from "../ui/Modal";
import { TextAreaField } from "../ui/FormField";
import { Button } from "../ui/Button";
import { useToast } from "../ui/Toast";
import { formatInrExact } from "../../lib/format";

/**
 * Approving locks the quotation's commercial figures, so the dialog shows
 * exactly which figures are being approved, and what approval does and does not
 * allow afterwards.
 */
export function QuotationApproveDialog({
  quoteNo,
  wasRevised,
  amounts,
  onClose,
  onSubmit,
}: {
  quoteNo: string;
  wasRevised: boolean;
  amounts: { taxableAmount: number; gstPercent: number; gstAmount: number; totalAmount: number };
  onClose: () => void;
  onSubmit: (remarks?: string) => Promise<unknown>;
}) {
  const toast = useToast();
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(remarks.trim() || undefined);
      toast.success(`${quoteNo} approved`);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title={`Approve ${quoteNo}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button variant="primary" icon="check" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Approving…" : "Approve quotation"}
          </Button>
        </>
      }
    >
      <p style={{ fontSize: 13.5, marginBottom: 10 }}>
        {wasRevised ? "You are approving the revised amount:" : "You are approving:"}
      </p>
      <table className="preview" aria-label="Amounts being approved">
        <tbody>
          <tr>
            <td>Taxable amount</td>
            <td>{formatInrExact(amounts.taxableAmount)}</td>
          </tr>
          <tr>
            <td>GST {amounts.gstPercent}%</td>
            <td>{formatInrExact(amounts.gstAmount)}</td>
          </tr>
          <tr className="total">
            <td>Total</td>
            <td data-testid="approve-total">{formatInrExact(amounts.totalAmount)}</td>
          </tr>
        </tbody>
      </table>
      <p className="preview-note" style={{ marginBottom: 14 }}>
        Once approved, these figures are locked and a Proforma Invoice can be created from this quotation. It can be revised
        again only while no Proforma Invoice or Sales Order has been built on it, and it must then be approved again.
      </p>
      <TextAreaField
        label="Remarks"
        rows={3}
        value={remarks}
        onChange={(e) => setRemarks(e.target.value)}
        placeholder="Optional — kept in this quotation's history"
      />
      {error && <p role="alert" style={{ color: "var(--bad)", fontSize: 12.5 }}>{error}</p>}
    </Modal>
  );
}
