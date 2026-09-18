"use client";

import { useState } from "react";
import { Modal } from "../ui/Modal";
import { TextField, TextAreaField, FieldRow } from "../ui/FormField";
import { Button } from "../ui/Button";
import { useToast } from "../ui/Toast";
import { formatInr } from "../../lib/format";

export function QuotationReviseDialog({
  quoteNo,
  currentVersion,
  currentAmount,
  onClose,
  onSubmit,
}: {
  quoteNo: string;
  currentVersion: number;
  currentAmount: number;
  onClose: () => void;
  onSubmit: (amount: number, note?: string) => Promise<unknown>;
}) {
  const toast = useToast();
  const [amount, setAmount] = useState(String(currentAmount));
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!amount.trim() || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError("Enter a valid amount greater than 0");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(Number(amount), note.trim() || undefined);
      toast.show(`${quoteNo} revised to V${currentVersion + 1}`, "check");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
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
            {submitting ? "Saving…" : `Create V${currentVersion + 1}`}
          </Button>
        </>
      }
    >
      <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14 }}>
        Current version <b style={{ color: "var(--text)" }}>V{currentVersion}</b> — {formatInr(currentAmount)}.
        Saving creates <b style={{ color: "var(--text)" }}>V{currentVersion + 1}</b> and moves this quotation to Revised.
      </p>
      <FieldRow>
        <TextField label="New Amount (₹)" required type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} error={error ?? undefined} />
      </FieldRow>
      <TextAreaField label="Revision Note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What changed and why (optional)" />
    </Modal>
  );
}
