"use client";

import { useState } from "react";
import { Modal } from "../ui/Modal";
import { TextField, SelectField, TextAreaField, FieldRow } from "../ui/FormField";
import { Button } from "../ui/Button";
import { useToast } from "../ui/Toast";
import { CreateSalesInvoiceInput } from "../../lib/repository/interfaces";
import { DispatchOrderOption } from "../../lib/types/domain";

/**
 * Field-for-field mirror of the VERIFIED CreateSalesInvoiceDto: salesOrderId
 * (fixed), dispatchOrderId, invoiceDate, customerName, remarks?.
 * taxableAmount/gstAmount/totalAmount are NOT collected here — the backend
 * computes them itself (a flat 18% assumption on the sales order's own
 * total, confirmed by reading sales-invoices.service.ts directly), so
 * nothing financial is estimated or sent from this form. `dispatchOrders`
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
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [customerName, setCustomerName] = useState(defaultCustomerName);
  const [dispatchOrderId, setDispatchOrderId] = useState(dispatchOrders[0]?.id ?? "");
  const [remarks, setRemarks] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const effectiveDispatchOrderId = dispatchOrderId || dispatchOrders[0]?.id || "";
  const selectedDispatchOrder = dispatchOrders.find((d) => d.id === effectiveDispatchOrderId);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!invoiceDate) e.invoiceDate = "Invoice date is required";
    if (!customerName.trim()) e.customerName = "Customer name is required";
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
        invoiceDate: new Date(invoiceDate).toISOString(),
        customerName: customerName.trim(),
        remarks: remarks.trim() || undefined,
      });
      toast.show("Sales invoice created", "check");
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
        <TextField label="Invoice Date" required type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} error={errors.invoiceDate} />
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
      <TextField
        label="Customer Name"
        required
        value={customerName}
        onChange={(e) => setCustomerName(e.target.value)}
        error={errors.customerName}
      />
      <TextAreaField label="Remarks" rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional" />
      <p style={{ fontSize: 11.5, color: "var(--faint)" }}>
        Taxable amount, GST and total are calculated entirely by the backend from this sales order — not
        shown here since nothing is estimated on this form.
      </p>
      {errors.form && <p style={{ color: "var(--bad)", fontSize: 12.5 }}>{errors.form}</p>}
    </Modal>
  );
}
