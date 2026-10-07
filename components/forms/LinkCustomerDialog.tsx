"use client";

import { useMemo, useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Tag } from "../ui/Tag";
import { useToast } from "../ui/Toast";
import { CustomerForm } from "./CustomerForm";
import { useCustomers } from "../../lib/hooks/useCustomers";
import { Customer } from "../../lib/types/domain";
import { normalizeCustomerName } from "../../lib/repository/shared/customerLifecycle";

/**
 * Picks the customer an opportunity is for, from the existing customers, or
 * starts a new one prefilled from the lead. A customer suggested by name (the
 * lead's name or company equals the customer's) is listed first and says so;
 * that is a guess, so it is never chosen for you. A customer that is inactive, or
 * that can't be quoted yet (no GST registration), is shown with the reason; the
 * backend refuses an inactive one.
 */
export function LinkCustomerDialog({
  opportunityTitle,
  leadName,
  leadCompany,
  leadEmail,
  leadPhone,
  currentCustomerId,
  onClose,
  onSubmit,
}: {
  opportunityTitle: string;
  leadName: string;
  leadCompany?: string;
  leadEmail?: string;
  leadPhone?: string;
  currentCustomerId?: string;
  onClose: () => void;
  onSubmit: (customerId: string) => Promise<unknown>;
}) {
  const toast = useToast();
  const { customers, loading, error, createCustomer, refetch } = useCustomers();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string>("");
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const leadKeys = useMemo(() => [leadName, leadCompany].filter(Boolean).map((n) => normalizeCustomerName(n!)), [leadName, leadCompany]);
  const isSuggested = (c: Customer) => leadKeys.includes(normalizeCustomerName(c.customerName));

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matches = customers.filter((c) => c.id !== currentCustomerId && (!q || [c.customerName, c.customerCode, c.panNumber ?? ""].some((f) => f.toLowerCase().includes(q))));
    // suggested first, then active before inactive, then by name
    return matches.sort((a, b) => Number(isSuggested(b)) - Number(isSuggested(a)) || Number(b.isActive) - Number(a.isActive) || a.customerName.localeCompare(b.customerName));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customers, search, currentCustomerId, leadKeys.join("|")]);

  async function handleLink() {
    if (!selectedId) {
      setMessage("Choose a customer first.");
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      await onSubmit(selectedId);
      toast.show(currentCustomerId ? "Customer changed" : "Customer linked", "check");
      onClose();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Something went wrong linking the customer. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (creating) {
    return (
      <CustomerForm
        prefill={{ customerName: leadCompany || leadName, email: leadEmail, phone: leadPhone }}
        onClose={() => setCreating(false)}
        onSubmit={async (input) => {
          const created = await createCustomer(input);
          setSelectedId(created.id);
          refetch();
          return created;
        }}
      />
    );
  }

  return (
    <Modal
      title={currentCustomerId ? "Change customer" : "Link a customer"}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleLink} disabled={submitting || !selectedId}>
            {submitting ? "Linking…" : currentCustomerId ? "Change customer" : "Link customer"}
          </Button>
        </>
      }
    >
      <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 12px" }}>
        Who is <b style={{ color: "var(--text)" }}>{opportunityTitle}</b> for? Every quotation, Proforma Invoice and Sales Order under it will belong to this customer.
      </p>

      <div className="cust-search" style={{ marginBottom: 12 }}>
        <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, code or PAN" aria-label="Search customers" />
      </div>

      {loading && customers.length === 0 && <div className="skeleton" style={{ height: 120 }} />}
      {error && customers.length === 0 && (
        <p style={{ color: "var(--bad)", fontSize: 13 }} role="alert">
          Couldn&apos;t load customers: {error.message}
        </p>
      )}

      {!loading && !error && visible.length === 0 && (
        <p style={{ color: "var(--muted)", fontSize: 13 }}>{search ? "No customer matches that." : "There are no customers to choose from yet."}</p>
      )}

      {visible.length > 0 && (
        <fieldset style={{ border: 0, padding: 0, margin: 0, display: "grid", gap: 8, maxHeight: 280, overflowY: "auto" }}>
          <legend className="sr-only">Customers</legend>
          {visible.map((c) => {
            const noGst = !c.gstRegistrations.some((g) => g.isActive);
            return (
              <label
                key={c.id}
                style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 12px", border: `1px solid ${selectedId === c.id ? "var(--m)" : "var(--line)"}`, borderRadius: 11, background: selectedId === c.id ? "var(--m-soft)" : "var(--surface)", opacity: c.isActive ? 1 : 0.65, minHeight: 44 }}
              >
                <input type="radio" name="customer" value={c.id} checked={selectedId === c.id} disabled={!c.isActive} onChange={() => setSelectedId(c.id)} style={{ width: "auto", marginTop: 3, accentColor: "var(--control-accent)" }} />
                <span style={{ minWidth: 0 }}>
                  <b style={{ color: "var(--ink)", overflowWrap: "anywhere" }}>{c.customerName}</b>{" "}
                  <small style={{ color: "var(--muted)" }}>{c.customerCode}</small>
                  <span style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                    {isSuggested(c) && <Tag color="i">Same name as the lead</Tag>}
                    {!c.isActive && <Tag color="n">Inactive</Tag>}
                    {c.isActive && noGst && <Tag color="w">No GST registration yet</Tag>}
                  </span>
                  {c.isActive && noGst && <small style={{ display: "block", color: "var(--muted)", marginTop: 3 }}>It can be linked now, but can&apos;t be quoted until a GST registration is added.</small>}
                </span>
              </label>
            );
          })}
        </fieldset>
      )}

      <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px dashed var(--line)" }}>
        <Button variant="ghost" icon="plus" onClick={() => setCreating(true)}>
          Create a new customer from this lead
        </Button>
      </div>

      {message && (
        <p style={{ color: "var(--bad)", fontSize: 12.5, marginTop: 12 }} role="alert">
          {message}
        </p>
      )}
    </Modal>
  );
}
