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
 * Mirror of the VERIFIED CreateSalesOrderDto: proformaInvoiceId (fixed —
 * always created from a specific, already-APPROVED Proforma Invoice),
 * orderDate, inventoryItemId, orderQty, sellerGstId, buyerGstId. Reuses the
 * same Inventory Item / Seller GST / Buyer GST lookups the Quotation creation
 * form uses — the backend validates all three the same way and re-derives
 * taxType/placeOfSupply from the GST pair server-side, so none of that is
 * computed or sent here.
 *
 * An order is made with the GST registrations its Quotation was made with, so
 * when the Quotation has them (`quotationBuyerGstId` / `quotationSellerGstId`)
 * they are preselected and fixed: the backend refuses any other. A legacy
 * Quotation that has none leaves the choice open.
 *
 * There is NO total field. The order's total is the approved Proforma
 * Invoice's totalAmount, set by the backend: this form shows it read-only and
 * neither collects nor sends an amount, so it cannot be overridden. No tax is
 * calculated here. Only one Sales Order can be created per Proforma Invoice;
 * if one already exists the backend refuses and its message is shown.
 */
export function SalesOrderForm({
  proformaInvoiceId,
  proformaNumber,
  proformaTotalAmount,
  quotationBuyerGstId,
  quotationSellerGstId,
  onClose,
  onSubmit,
}: {
  proformaInvoiceId: string;
  proformaNumber: string;
  /** The approved Proforma Invoice's total — the order's total, shown read-only. */
  proformaTotalAmount: number;
  /** The registrations the Quotation was made with, when it has them. */
  quotationBuyerGstId?: string;
  quotationSellerGstId?: string;
  onClose: () => void;
  onSubmit: (input: CreateSalesOrderInput) => Promise<unknown>;
}) {
  const toast = useToast();
  const { items: inventoryItems, loading: itemsLoading } = useInventoryItems();
  const { registrations: sellerGstOptions, loading: sellerGstLoading } = useSellerGstRegistrations();
  const { registrations: buyerGstOptions, loading: buyerGstLoading } = useBuyerGstRegistrations();

  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [inventoryItemId, setInventoryItemId] = useState("");
  const [orderQty, setOrderQty] = useState("1");
  const [sellerGstId, setSellerGstId] = useState("");
  const [buyerGstId, setBuyerGstId] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const effectiveInventoryItemId = inventoryItemId || inventoryItems[0]?.id || "";
  // Prefer an active registration as the default — the backend does not
  // filter or validate isActive itself, so this is a frontend-only default
  // preference, not an enforced rule. Same pattern as QuotationForm.
  const effectiveSellerGstId =
    quotationSellerGstId || sellerGstId || sellerGstOptions.find((g) => g.isActive)?.id || sellerGstOptions[0]?.id || "";
  const effectiveBuyerGstId =
    quotationBuyerGstId || buyerGstId || buyerGstOptions.find((g) => g.isActive)?.id || buyerGstOptions[0]?.id || "";
  const mastersLoading = itemsLoading || sellerGstLoading || buyerGstLoading;

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!orderDate) e.orderDate = "Order date is required";
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
        inventoryItemId: effectiveInventoryItemId,
        orderQty: Number(orderQty),
        sellerGstId: effectiveSellerGstId,
        buyerGstId: effectiveBuyerGstId,
      });
      toast.success("Sales order created");
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
        options={inventoryItems.map((i) => ({
          value: i.id,
          label: i.availableQty !== undefined ? `${i.name} — ${i.availableQty} available` : i.name,
        }))}
      />
      <SelectField
        label="Seller GST Registration"
        required
        value={effectiveSellerGstId}
        onChange={(e) => setSellerGstId(e.target.value)}
        error={errors.sellerGstId}
        hint={quotationSellerGstId ? "Taken from the approved quotation." : undefined}
        disabled={sellerGstLoading || !!quotationSellerGstId}
        options={sellerGstOptions.map((g) => ({
          value: g.id,
          label: g.isActive ? g.label : `${g.label} (Inactive)`,
          disabled: !g.isActive,
        }))}
      />
      <SelectField
        label="Buyer GST Registration"
        required
        value={effectiveBuyerGstId}
        onChange={(e) => setBuyerGstId(e.target.value)}
        error={errors.buyerGstId}
        hint={quotationBuyerGstId ? "Taken from the approved quotation." : undefined}
        disabled={buyerGstLoading || !!quotationBuyerGstId}
        options={buyerGstOptions.map((g) => ({
          value: g.id,
          label: g.isActive ? g.label : `${g.label} (Inactive)`,
          disabled: !g.isActive,
        }))}
      />
      {(sellerGstOptions.some((g) => !g.isActive) || buyerGstOptions.some((g) => !g.isActive)) && (
        <p style={{ fontSize: 11.5, color: "var(--faint)" }}>
          Inactive GST registrations are shown greyed out and can&apos;t be newly selected.
        </p>
      )}
      <div
        data-testid="sales-order-total"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "10px 12px", border: "1px solid var(--line-2)", borderRadius: 10, marginBottom: 6 }}
      >
        <span style={{ fontSize: 12.5, color: "var(--muted)" }}>Order total</span>
        <b style={{ fontSize: 15 }}>{formatInr(proformaTotalAmount)}</b>
      </div>
      <p style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 0 }}>
        The order total is the approved proforma invoice&apos;s total. It is set when the order is created and can&apos;t be changed here.
      </p>
      <p style={{ fontSize: 11.5, color: "var(--faint)" }}>
        If the selected item&apos;s available stock is short of the order quantity, the backend
        automatically raises a Purchase Requisition for the shortfall — there is no separate action for that here.
      </p>
      {errors.form && <p style={{ color: "var(--bad)", fontSize: 12.5 }}>{errors.form}</p>}
    </Modal>
  );
}
