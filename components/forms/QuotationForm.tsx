"use client";

import { useState } from "react";
import Link from "next/link";
import { Modal } from "../ui/Modal";
import { TextField, SelectField, FieldRow } from "../ui/FormField";
import { Button } from "../ui/Button";
import { useToast } from "../ui/Toast";
import { CreateQuotationInput } from "../../lib/repository/interfaces";
import { useOpportunities } from "../../lib/hooks/useOpportunities";
import { useInventoryItems, useSellerGstRegistrations } from "../../lib/hooks/useQuotationMasters";
import { useAsyncList } from "../../lib/hooks/useAsyncList";
import { useRepository } from "../../lib/repository/RepositoryProvider";
import { defaultRegistration, registrationLabel } from "../../lib/repository/shared/customerLifecycle";
import { formatInr } from "../../lib/format";

/**
 * The buyer is the opportunity's customer (it is never typed or chosen here): the
 * buyer GST registration is one of that customer's own, the active default
 * preselected. An opportunity with no customer, or an inactive customer, can't be
 * quoted, and the form says what to do instead of offering a choice the backend
 * would refuse.
 *
 * Field-for-field mirror of the VERIFIED CreateQuotationDto: opportunityId,
 * quoteDate, inventoryItemId, quantity, unitPrice, sellerGstId, buyerGstId.
 * The backend computes taxableAmount/GST/total from these — the taxable
 * amount shown here is a client-side quantity×unitPrice preview only, never
 * sent as-is and never treated as the final figure. See
 * docs/backend-ui-contract.md §8.
 */
export function QuotationForm({
  onClose,
  onSubmit,
  defaultOpportunityId,
}: {
  onClose: () => void;
  onSubmit: (input: CreateQuotationInput) => Promise<unknown>;
  defaultOpportunityId?: string;
}) {
  const toast = useToast();
  const { opportunities, loading: opportunitiesLoading } = useOpportunities();
  const { items: inventoryItems, loading: itemsLoading } = useInventoryItems();
  const { registrations: sellerGstOptions, loading: sellerGstLoading } = useSellerGstRegistrations();
  const repo = useRepository();

  const [opportunityId, setOpportunityId] = useState(defaultOpportunityId ?? "");
  const [quoteDate, setQuoteDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [inventoryItemId, setInventoryItemId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [sellerGstId, setSellerGstId] = useState("");
  const [buyerGstId, setBuyerGstId] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const effectiveOpportunityId = opportunityId || defaultOpportunityId || opportunities[0]?.id || "";
  const selectedOpportunity = opportunities.find((o) => o.id === effectiveOpportunityId);
  const effectiveInventoryItemId = inventoryItemId || inventoryItems[0]?.id || "";
  // Prefer an active registration as the default — the backend does not
  // filter or validate isActive itself (confirmed by reading
  // quotations.service.ts), so this is a frontend-only default preference,
  // not an enforced rule. Falls back to any registration if none are active
  // so the form isn't left with an empty default in that edge case.
  const effectiveSellerGstId =
    sellerGstId || sellerGstOptions.find((g) => g.isActive)?.id || sellerGstOptions[0]?.id || "";

  // The customer comes from the opportunity; its registrations are the only buyer choices.
  const customerId = selectedOpportunity?.customerId;
  const { data: customer, loading: customerLoading, error: customerError } = useAsyncList(
    () => (customerId ? repo.customers.getById(customerId) : Promise.resolve(null)),
    [repo, customerId]
  );
  const buyerOptions = (customer?.gstRegistrations ?? []).map((g) => ({ id: g.id, label: registrationLabel(g), isActive: g.isActive, isDefault: g.isDefault }));
  const chosenBuyer = buyerOptions.find((o) => o.id === buyerGstId && o.isActive)?.id;
  const effectiveBuyerGstId = chosenBuyer || defaultRegistration(buyerOptions)?.id || "";
  const buyerGstLoading = !!customerId && customerLoading;
  const quotable = !!customerId && !!customer && customer.isActive && !customerError && !!defaultRegistration(buyerOptions);
  const blockReason = !selectedOpportunity
    ? undefined
    : !customerId
    ? "no-customer"
    : customerError
    ? "customer-unreadable"
    : customer && !customer.isActive
    ? "inactive"
    : customer && !defaultRegistration(buyerOptions)
    ? "no-gst"
    : undefined;

  const mastersLoading = opportunitiesLoading || itemsLoading || sellerGstLoading || buyerGstLoading;
  const taxablePreview = Number(quantity) > 0 && Number(unitPrice) > 0 ? Number(quantity) * Number(unitPrice) : 0;

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!effectiveOpportunityId) e.opportunityId = "Select an opportunity";
    if (!quoteDate) e.quoteDate = "Quote date is required";
    if (!effectiveInventoryItemId) e.inventoryItemId = "Select an inventory item";
    if (!quantity.trim() || isNaN(Number(quantity)) || Number(quantity) <= 0)
      e.quantity = "Enter a quantity greater than 0";
    if (!unitPrice.trim() || isNaN(Number(unitPrice)) || Number(unitPrice) <= 0)
      e.unitPrice = "Enter a unit price greater than 0";
    if (!effectiveSellerGstId) e.sellerGstId = "Select a seller GST registration";
    if (!effectiveBuyerGstId) e.buyerGstId = "Select a buyer GST registration";
    if (selectedOpportunity && !quotable) e.form = "This opportunity can't be quoted yet. See the note above.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        opportunityId: effectiveOpportunityId,
        quoteDate: new Date(quoteDate).toISOString(),
        inventoryItemId: effectiveInventoryItemId,
        quantity: Number(quantity),
        unitPrice: Number(unitPrice),
        sellerGstId: effectiveSellerGstId,
        buyerGstId: effectiveBuyerGstId,
      });
      toast.show("Quotation created as Draft", "check");
      onClose();
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : "Something went wrong creating the quotation. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title="New Quotation"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting || mastersLoading || !!blockReason}>
            {submitting ? "Creating…" : "Create Quotation"}
          </Button>
        </>
      }
    >
      {!opportunitiesLoading && opportunities.length === 0 ? (
        <p style={{ fontSize: 13.5, color: "var(--muted)" }}>
          No opportunities yet. Create one from a qualified lead first.
        </p>
      ) : (
        <>
          <SelectField
            label="Opportunity"
            required
            value={effectiveOpportunityId}
            onChange={(e) => setOpportunityId(e.target.value)}
            error={errors.opportunityId}
            disabled={!!defaultOpportunityId || opportunitiesLoading}
            options={opportunities.map((o) => ({ value: o.id, label: `${o.title} — ${o.customer?.customerName ?? o.customerName}${o.customerId ? "" : " (no customer yet)"}` }))}
          />
          {selectedOpportunity && customerId && (
            <p style={{ fontSize: 12, color: "var(--muted)", marginTop: -8, marginBottom: 14 }}>
              Customer{" "}
              <Link href={`/customers/${customerId}`} style={{ color: "var(--text)", fontWeight: 700 }}>
                {selectedOpportunity.customer?.customerName ?? selectedOpportunity.customerName}
              </Link>{" "}
              · Owner {selectedOpportunity.ownerName}
            </p>
          )}
          {blockReason && selectedOpportunity && (
            <div className="dup warn" role="status" data-testid="quote-block">
              {blockReason === "no-customer" && (
                <>
                  <b>This opportunity has no customer yet.</b> A quotation is made for a customer, with that customer&apos;s GST registration.{" "}
                  <Link href={`/opportunities/${selectedOpportunity.id}`}>Link a customer to this opportunity</Link> first.
                </>
              )}
              {blockReason === "inactive" && (
                <>
                  <b>The customer is inactive.</b> No new quotation can be made until <Link href={`/customers/${customerId}`}>the customer is reactivated</Link>.
                </>
              )}
              {blockReason === "no-gst" && (
                <>
                  <b>The customer has no active GST registration.</b> <Link href={`/customers/${customerId}`}>Add one</Link> first: the tax depends on the buyer&apos;s state.
                </>
              )}
              {blockReason === "customer-unreadable" && (
                <>
                  <b>The customer&apos;s GST registrations couldn&apos;t be read</b> ({customerError?.message}). Choosing the buyer registration needs the customers.view permission.
                </>
              )}
            </div>
          )}
          <FieldRow>
            <TextField label="Quote Date" required type="date" value={quoteDate} onChange={(e) => setQuoteDate(e.target.value)} error={errors.quoteDate} />
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
          </FieldRow>
          <FieldRow>
            <TextField label="Quantity" required type="number" min={0} value={quantity} onChange={(e) => setQuantity(e.target.value)} error={errors.quantity} />
            <TextField label="Unit Price (₹)" required type="number" min={0} value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} error={errors.unitPrice} placeholder="e.g. 92000" />
          </FieldRow>
          <SelectField
            label="Seller GST Registration"
            required
            value={effectiveSellerGstId}
            onChange={(e) => setSellerGstId(e.target.value)}
            error={errors.sellerGstId}
            disabled={sellerGstLoading}
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
            disabled={buyerGstLoading || buyerOptions.length === 0}
            hint={customer ? `The registrations of ${customer.customerName}. The default is preselected.` : undefined}
            options={buyerOptions.length ? buyerOptions.map((g) => ({
              value: g.id,
              label: `${g.label}${g.isDefault && g.isActive ? " (default)" : ""}${g.isActive ? "" : " (Inactive)"}`,
              disabled: !g.isActive,
            })) : [{ value: "", label: selectedOpportunity && !customerId ? "Link a customer first" : "—" }]}
          />
          {(sellerGstOptions.some((g) => !g.isActive) || buyerOptions.some((g) => !g.isActive)) && (
            <p style={{ fontSize: 11.5, color: "var(--faint)" }}>
              Inactive GST registrations are shown greyed out and can&apos;t be newly selected.
            </p>
          )}
          {taxablePreview > 0 && (
            <p style={{ fontSize: 11.5, color: "var(--faint)" }}>
              Taxable amount preview: <b>{formatInr(taxablePreview)}</b> (quantity × unit price). GST and
              the final total are calculated by the backend from the item&apos;s HSN rate once created.
            </p>
          )}
          <p style={{ fontSize: 11.5, color: "var(--faint)" }}>
            Every new quotation starts as <b>Draft</b>.
          </p>
        </>
      )}
      {errors.form && <p style={{ color: "var(--bad)", fontSize: 12.5 }}>{errors.form}</p>}
    </Modal>
  );
}
