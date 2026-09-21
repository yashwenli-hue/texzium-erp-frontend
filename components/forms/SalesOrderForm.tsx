"use client";

import { useState } from "react";
import { Modal } from "../ui/Modal";
import { TextField, SelectField, FieldRow } from "../ui/FormField";
import { Button } from "../ui/Button";
import { useToast } from "../ui/Toast";
import { CreateSalesOrderInput } from "../../lib/repository/interfaces";
import { useInventoryItems, useSellerGstRegistrations, useBuyerGstRegistrations } from "../../lib/hooks/useQuotationMasters";
import { formatInr } from "../../lib/format";

/**
 * Field-for-field mirror of the VERIFIED CreateSalesOrderDto: proformaInvoiceId
 * (fixed — always created from a specific, already-APPROVED Proforma Invoice),
 * orderDate, totalAmount, inventoryItemId, orderQty, sellerGstId, buyerGstId.
 * Reuses the same Inventory Item / Seller GST / Buyer GST lookups the
 * Quotation creation form uses — the backend validates all three the same way
 * (sales-orders.service.ts) and re-derives taxType/placeOfSupply from the GST
 * pair server-side, so none of that is computed or sent here. totalAmount is
 * NOT backend-computed for Sales Orders (unlike Quotations) — it defaults to
 * the source Proforma's own total but remains editable, since the backend
 * imposes no cross-check against it, same as ProformaInvoiceForm. See the
 * Stage 2E report.
 */
export function SalesOrderForm({
  proformaInvoiceId,
  proformaNumber,
  defaultTotalAmount,
  onClose,
  onSubmit,
}: {
  proformaInvoiceId: string;
  proformaNumber: string;
  defaultTotalAmount: number;
  onClose: () => void;
  onSubmit: (input: CreateSalesOrderInput) => Promise<unknown>;
}) {
  const toast = useToast();
  const { items: inventoryItems, loading: itemsLoading } = useInventoryItems();
  const { registrations: sellerGstOptions, loading: sellerGstLoading } = useSellerGstRegistrations();
  const { registrations: buyerGstOptions, loading: buyerGstLoading } = useBuyerGstRegistrations();

  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [totalAmount, setTotalAmount] = useState(String(defaultTotalAmount));
  const [inventoryItemId, setInventoryItemId] = useState("");
  const [orderQty, setOrderQty] = useState("1");
  const [sellerGstId, setSellerGstId] = useState("");
  const [buyerGstId, setBuyerGstId] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const effectiveInventoryItemId = inventoryItemId || inventoryItems[0]?.id || "";
  const effectiveSellerGstId = sellerGstId || sellerGstOptions[0]?.id || "";
  const effectiveBuyerGstId = buyerGstId || buyerGstOptions[0]?.id || "";
  const mastersLoading = itemsLoading || sellerGstLoading || buyerGstLoading;

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!orderDate) e.orderDate = "Order date is required";
    if (!totalAmount.trim() || isNaN(Number(totalAmount)) || Number(totalAmount) <= 0)
      e.totalAmount = "Enter a valid amount greater than 0";
    if (!effectiveInventoryItemId) e.inventoryItemId = "Select an inventory item";
    if (!orderQty.trim() || isNaN(Number(orderQty)) || Number(orderQty) <= 0)
      e.orderQty = "Enter a quantity greater than 0";
    if (!effectiveSellerGstId) e.sellerGstId = "Select a seller GST registration";
    if (!effectiveBuyerGstId) e.buyerGstId = "Select a buyer GST registration";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        proformaInvoiceId,
        orderDate: new Date(orderDate).toISOString(),
        totalAmount: Number(totalAmount),
        inventoryItemId: effectiveInventoryItemId,
        orderQty: Number(orderQty),
        sellerGstId: effectiveSellerGstId,
        buyerGstId: effectiveBuyerGstId,
      });
      toast.show("Sales order created", "check");
      onClose();
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : "Something went wrong creating the sales order. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title="New Sales Order"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting || mastersLoading}>
            {submitting ? "Creating…" : "Create Sales Order"}
          </Button>
        </>
      }
    >
      <p style={{ fontSize: 12, color: "var(--muted)", marginTop: -8, marginBottom: 14 }}>
        From proforma invoice <b style={{ color: "var(--text)" }}>{proformaNumber}</b>
      </p>
      <FieldRow>
        <TextField label="Order Date" required type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} error={errors.orderDate} />
        <TextField label="Order Quantity" required type="number" min={0} value={orderQty} onChange={(e) => setOrderQty(e.target.value)} error={errors.orderQty} />
      </FieldRow>
      <SelectField
        label="Inventory Item"
        required
        value={effectiveInventoryItemId}
        onChange={(e) => setInventoryItemId(e.target.value)}
        error={errors.inventoryItemId}
        disabled={itemsLoading}
        options={inventoryItems.map((i) => ({ value: i.id, label: i.name }))}
      />
      <SelectField
        label="Seller GST Registration"
        required
        value={effectiveSellerGstId}
        onChange={(e) => setSellerGstId(e.target.value)}
        error={errors.sellerGstId}
        disabled={sellerGstLoading}
        options={sellerGstOptions.map((g) => ({ value: g.id, label: g.label }))}
      />
      <SelectField
        label="Buyer GST Registration"
        required
        value={effectiveBuyerGstId}
        onChange={(e) => setBuyerGstId(e.target.value)}
        error={errors.buyerGstId}
        disabled={buyerGstLoading}
        options={buyerGstOptions.map((g) => ({ value: g.id, label: g.label }))}
      />
      <TextField
        label="Total Amount (₹)"
        required
        type="number"
        min={0}
        value={totalAmount}
        onChange={(e) => setTotalAmount(e.target.value)}
        error={errors.totalAmount}
      />
      <p style={{ fontSize: 11.5, color: "var(--faint)", marginTop: -10 }}>
        Defaulted from the proforma invoice&apos;s total ({formatInr(defaultTotalAmount)}) — the backend
        doesn&apos;t recompute this, so double-check it before creating.
      </p>
      <p style={{ fontSize: 11.5, color: "var(--faint)" }}>
        If the selected item&apos;s available stock is short of the order quantity, the backend
        automatically raises a Purchase Requisition for the shortfall — there is no separate action for that here.
      </p>
      {errors.form && <p style={{ color: "var(--bad)", fontSize: 12.5 }}>{errors.form}</p>}
    </Modal>
  );
}
