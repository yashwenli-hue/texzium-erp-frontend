"use client";

import { ComboboxField } from "../ui/Combobox";
import { useInventoryItems } from "../../lib/hooks/useQuotationMasters";

/**
 * The product or machine an enquiry is about: an existing inventory item (the same list
 * the quotation form uses), or nothing recorded. Nothing is added to the catalogue here.
 * It lets a returning person's enquiry about another product be told apart from a
 * duplicate of the same one.
 */
export function LeadProductField({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const { items, loading, error } = useInventoryItems();
  const options = [{ value: "", label: "Not recorded" }, ...items.map((i) => ({ value: i.id, label: i.name }))];
  return (
    <ComboboxField
      label="Product / machine"
      options={options}
      value={value}
      onChange={onChange}
      placeholder={loading ? "Loading products…" : "Search products (optional)"}
      disabled={loading || !!error}
      hint={error ? "The product list could not be loaded; the lead can be saved without one." : "From the inventory catalogue. Optional."}
    />
  );
}
