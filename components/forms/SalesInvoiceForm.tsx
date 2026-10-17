"use client";

import { useState } from "react";
import { Modal } from "../ui/Modal";
import { TextField, SelectField, TextAreaField, FieldRow } from "../ui/FormField";
import { Button } from "../ui/Button";
import { useToast } from "../ui/Toast";
import { CreateSalesInvoiceInput } from "../../lib/repository/interfaces";
import { DispatchOrderOption } from "../../lib/types/domain";

// Today in India (IST, UTC+05:30), as "YYYY-MM-DD": the latest invoice date the backend accepts.
const istToday = () => new Date(Date.now() + 330 * 60 * 1000).toISOString().slice(0, 10);

/**
 * VERIFIED CreateSalesInvoiceDto (backend 2026-10-15): salesOrderId (fixed),
 * dispatchOrderId, invoiceDate (a calendar day, not after today in India),
 * remarks?. The customer, every amount, the GST split and the invoice number
 * are the backend's: it invoices the order's customer from the customer
 * record, with its Quotation's amounts, numbered from the seller
 * registration's series. Nothing financial is estimated or sent from this
 * form, and an order is invoiced once. `dispatchOrders`
 * is pre-filtered by the caller to DISPATCHED orders whose own salesOrderId
 * actually matches this sales order — the backend itself does not enforce
 * that match, so this list is a frontend safeguard, not a backend rule.
 */
export function SalesInvoiceForm({
  salesOrderId,
  salesOrderCode,
  defaultCustomerName,
  dispatchOrders,
  onClose,
  onSubmit,
}: {
  salesOrderId: string;
  salesOrderCode: string;
  defaultCustomerName: string;
  dispatchOrders: DispatchOrderOption[];
  onClose: () => void;
  onSubmit: (input: CreateSalesInvoiceInput) => Promise<unknown>;
}) {
  const toast = useToast();
  const [invoiceDate, setInvoiceDate] = useState(istToday);
  const [dispatchOrderId, setDispatchOrderId] = useState(dispatchOrders[0]?.id ?? "");
  const [remarks, setRemarks] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const effectiveDispatchOrderId = dispatchOrderId || dispatchOrders[0]?.id || "";
  const selectedDispatchOrder = dispatchOrders.find((d) => d.id === effectiveDispatchOrderId);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!invoiceDate) e.invoiceDate = "Invoice date is required";
    else if (invoiceDate > istToday()) e.invoiceDate = "The invoice date cannot be later than today.";
    if (!effectiveDispatchOrderId) e.dispatchOrderId = "Select a dispatched order";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        salesOrderId,
        dispatchOrderId: effectiveDispatchOrderId,
        invoiceDate,
        remarks: remarks.trim() || undefined,
      });
      toast.success("Sales invoice created");
      onClose();
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : "Something went wrong creating the sales invoice. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title="New Sales Invoice"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Creating…" : "Create Sales Invoice"}
          </Button>
        </>
      }
    >
      <p style={{ fontSize: 12, color: "var(--muted)", marginTop: -8, marginBottom: 14 }}>
        From sales order <b style={{ color: "var(--text)" }}>{salesOrderCode}</b>
      </p>
      <FieldRow>
        <TextField label="Invoice Date" required type="date" max={istToday()} value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} error={errors.invoiceDate} />
        {dispatchOrders.length > 1 ? (
          <SelectField
            label="Dispatch Order"
            required
            value={effectiveDispatchOrderId}
            onChange={(e) => setDispatchOrderId(e.target.value)}
            error={errors.dispatchOrderId}
            options={dispatchOrders.map((d) => ({ value: d.id, label: d.dispatchOrderNo }))}
          />
        ) : (
          <TextField label="Dispatch Order" value={selectedDispatchOrder?.dispatchOrderNo ?? ""} onChange={() => {}} disabled />
        )}
      </FieldRow>
      <p style={{ fontSize: 13, margin: "4px 0 12px" }} data-testid="invoice-customer">
        Invoiced to <b>{defaultCustomerName}</b> — the order&apos;s customer, as recorded on the customer record.
      </p>
      <TextAreaField label="Remarks" rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional" />
      <p style={{ fontSize: 11.5, color: "var(--faint-text)" }}>
        The invoice number, taxable amount, GST and total come from the system: the amounts are the ones on this
        order&apos;s quotation (GST is never added again), and an order is invoiced once. An invoice can&apos;t be dated
        before the last invoice in its number series.
      </p>
      {errors.form && <p style={{ color: "var(--bad)", fontSize: 12.5 }}>{errors.form}</p>}
    </Modal>
  );
}
