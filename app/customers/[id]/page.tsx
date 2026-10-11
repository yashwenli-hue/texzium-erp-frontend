"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Icon } from "../../../components/ui/Icon";
import { Panel } from "../../../components/ui/Card";
import { Button, EmptyState } from "../../../components/ui/Button";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { LoadingRegion } from "../../../components/ui/LoadingRegion";
import { MenuItem } from "../../../components/ui/ActionMenu";
import { NextUp } from "../../../components/ui/NextUp";
import { SectionNav } from "../../../components/ui/SectionNav";
import { useToast } from "../../../components/ui/Toast";
import { CustomerHeader } from "../../../components/customers/CustomerHeader";
import { SnapshotStrip } from "../../../components/customers/SnapshotStrip";
import { DealCard, SuggestedDealCard } from "../../../components/customers/DealCard";
import { GstRegistrationsPanel } from "../../../components/customers/GstRegistrationsPanel";
import { DetailsPanel } from "../../../components/customers/DetailsPanel";
import { ActivityPanel } from "../../../components/customers/ActivityPanel";
import { DeactivationImpact } from "../../../components/customers/DeactivationImpact";
import { CustomerForm } from "../../../components/forms/CustomerForm";
import { GstRegistrationForm } from "../../../components/forms/GstRegistrationForm";
import { OpportunityForm } from "../../../components/forms/OpportunityForm";
import { QuotationForm } from "../../../components/forms/QuotationForm";
import { DeleteRecordDialog } from "../../../components/governance/DeleteRecordDialog";
import { DeletedRecordNotice } from "../../../components/governance/DeletedRecordNotice";
import { useCustomerDetail } from "../../../lib/hooks/useCustomers";
import { useAuth } from "../../../lib/auth/AuthContext";
import { useRepository } from "../../../lib/repository/RepositoryProvider";
import { CreateOpportunityInput, CreateQuotationInput } from "../../../lib/repository/interfaces";
import { CUSTOMER_PERMISSIONS, customerActions, quotingBlockerText, quotingBlockers, sortRegistrations } from "../../../lib/repository/shared/customerLifecycle";
import { AttentionAction, buildAttention, buildDeactivationImpact, buildDeals, buildSnapshot, gstUsage, withoutCollections } from "../../../lib/repository/shared/customerCockpit";
import { CollectionsStatementSection } from "../../../components/collections/CollectionsStatementSection";
import { LedgerStatementSection } from "../../../components/collections/LedgerStatementSection";
import { QUOTATION_PERMISSIONS } from "../../../lib/repository/shared/quotationLifecycle";
import { CustomerGstRegistration } from "../../../lib/types/domain";

type Dialog =
  | { kind: "edit" }
  | { kind: "deactivate" }
  | { kind: "delete" }
  | { kind: "reactivate" }
  | { kind: "gstAdd" }
  | { kind: "gstEdit"; reg: CustomerGstRegistration }
  | { kind: "gstDeactivate"; reg: CustomerGstRegistration }
  | { kind: "gstReactivate"; reg: CustomerGstRegistration }
  | { kind: "quote"; opportunityId: string }
  | { kind: "newDeal" }
  | { kind: "link"; opp: { id: string; title: string; quotationCount: number } };

const SECTIONS = [
  { id: "deals", label: "Deals" },
  { id: "gst", label: "GST" },
  { id: "details", label: "Details" },
  { id: "activity", label: "Activity" },
];

export default function CustomerCockpitPage() {
  const params = useParams<{ id: string }>();
  const toast = useToast();
  const router = useRouter();
  const repo = useRepository();
  const { hasPermission } = useAuth();
  const id = params?.id;
  const d = useCustomerDetail(id);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const close = () => setDialog(null);

  const back = (
    <Link className="back-link" href="/customers">
      <Icon name="back" size={14} /> Back to Customers
    </Link>
  );

  if (d.loading && !d.customer) {
    return (
      <div className="page">
        <LoadingRegion label="Loading customer">
          <div className="skeleton" style={{ height: 150, marginBottom: 16 }} />
          <div className="skeleton" style={{ height: 80, marginBottom: 16 }} />
          <div className="skeleton" style={{ height: 280 }} />
        </LoadingRegion>
      </div>
    );
  }

  // A fetch failure (network, 5xx, 403) is not a genuine not-found.
  if (d.error) {
    const forbidden = (d.error as { status?: number }).status === 403;
    return (
      <div className="page">
        {back}
        <Panel title="Couldn't load this customer">
          <EmptyState
            icon="alert"
            title={forbidden ? "You don't have access to customers" : "Something went wrong"}
            body={forbidden ? "Viewing customers needs the customers.view permission. Ask an administrator to grant it, then sign in again." : d.error.message || "Something went wrong reaching the RevenueOS backend. Please try again."}
            action={
              !forbidden ? (
                <Button variant="ghost" onClick={d.refetch}>
                  Retry
                </Button>
              ) : undefined
            }
          />
        </Panel>
      </div>
    );
  }

  const customer = d.customer;
  if (!customer) {
    return (
      <div className="page">
        {back}
        <DeletedRecordNotice entityType="CUSTOMER" id={id ?? ""} onRestored={d.refreshAll} />
      </div>
    );
  }

  const may = {
    edit: hasPermission(CUSTOMER_PERMISSIONS.edit),
    deactivate: hasPermission(CUSTOMER_PERMISSIONS.deactivate),
    gstManage: hasPermission(CUSTOMER_PERMISSIONS.gstManage),
  };
  const canQuoteWith = hasPermission(QUOTATION_PERMISSIONS.create);
  const canEditOpportunity = hasPermission("opportunities.edit");
  const canCreateOpportunity = hasPermission("opportunities.create");
  // Collections are their own permission: customers.view alone shows the customer and its deals, never what it owes or has paid.
  const canViewCollections = hasPermission("collections.view");
  const canRecordPayment = hasPermission("collections.record");
  const actions = customerActions({ isActive: customer.isActive, may });
  const registrations = sortRegistrations(customer.gstRegistrations);
  const blockers = quotingBlockers(customer);
  const rawOverview = d.overview;
  const overview = rawOverview && !canViewCollections ? withoutCollections(rawOverview) : rawOverview;
  const now = new Date();
  const sections = canViewCollections ? [SECTIONS[0], { id: "collections", label: "Collections" }, { id: "ledger-statement", label: "Ledger statement" }, ...SECTIONS.slice(1)] : SECTIONS;

  const attention = buildAttention({
    customer,
    overview,
    now,
    may: { gstManage: may.gstManage, deactivate: may.deactivate, editOpportunity: canEditOpportunity, createOpportunity: canCreateOpportunity, createQuotation: canQuoteWith },
  });
  const deals = overview ? buildDeals(overview, now) : [];
  const snapshot = overview ? buildSnapshot(overview, now) : null;
  const usage = overview ? gstUsage(overview) : null;
  const impact = overview ? buildDeactivationImpact(overview, now) : null;
  const leadByOpportunity = new Map((overview?.opportunities ?? []).map((o) => [o.id, o.leadId ? { id: o.leadId, name: o.leadName } : undefined]));

  const quoteBlockedReason = !canQuoteWith ? "You don't have permission to create quotations." : blockers.length ? quotingBlockerText(blockers[0]) : undefined;
  const newDealState = !customer.isActive
    ? { enabled: false, reason: "Reactivate the customer before starting a deal for it." }
    : !canCreateOpportunity
    ? { enabled: false, reason: "You don't have permission to create opportunities." }
    : { enabled: true };
  const linkBlockedReason = !customer.isActive ? "Reactivate the customer before linking opportunities to it." : !canEditOpportunity ? "You don't have permission to edit opportunities." : undefined;

  const menu: MenuItem[] = [
    { key: "edit", label: "Edit details", icon: "edit", state: actions.edit, onClick: () => setDialog({ kind: "edit" }) },
    { key: "addGst", label: "Add GST registration", icon: "plus", state: actions.addGst, onClick: () => setDialog({ kind: "gstAdd" }) },
    { key: "newDeal", label: "New deal", icon: "target", state: newDealState, onClick: () => setDialog({ kind: "newDeal" }) },
    customer.isActive
      ? { key: "deactivate", label: "Deactivate", icon: "close", tone: "danger", state: actions.deactivate, onClick: () => setDialog({ kind: "deactivate" }) }
      : { key: "reactivate", label: "Reactivate", icon: "check", state: actions.reactivate, onClick: () => setDialog({ kind: "reactivate" }) },
    // Governed deletion: only for people who have the permission (it is not a quiet action to show to everyone).
    ...(hasPermission("customers.delete")
      ? [{ key: "delete", label: "Delete…", icon: "trash", tone: "danger" as const, state: { enabled: true }, onClick: () => setDialog({ kind: "delete" }) }]
      : []),
  ];

  function onAction(a: AttentionAction) {
    if (a.type === "dialog") setDialog({ kind: a.dialog });
    else if (a.type === "link-deal") setDialog({ kind: "link", opp: { id: a.opportunityId, title: a.title, quotationCount: a.quotationCount } });
    else if (a.type === "quote") setDialog({ kind: "quote", opportunityId: a.opportunityId });
  }

  return (
    <div className="page cockpit">
      {back}

      <CustomerHeader customer={customer} quotable={blockers.length === 0} menu={menu} />

      <NextUp items={attention} onAction={onAction} />

      {snapshot && <SnapshotStrip snapshot={snapshot} />}

      <SectionNav sections={sections} />

      <div className="cockpit-grid">
        <div className="cockpit-main">
          <section className="card panel deals-panel" id="deals" aria-labelledby="deals-title" data-testid="deals-panel">
            <div className="panel-head">
              <h3 id="deals-title">Deals</h3>
              <span className="panel-act">
                <Button className="sm" icon="plus" onClick={() => setDialog({ kind: "newDeal" })} disabled={!newDealState.enabled} aria-describedby={!newDealState.enabled ? "new-deal-why" : undefined}>
                  New deal
                </Button>
              </span>
            </div>
            {!newDealState.enabled && (
              <p id="new-deal-why" className="deals-why">
                {newDealState.reason}
              </p>
            )}
            {d.overviewError ? (
              <div className="deals-body">
                <p style={{ color: "var(--bad)", fontSize: 13 }} role="alert">
                  Couldn&apos;t load this customer&apos;s deals: {d.overviewError.message}
                </p>
                <Button variant="ghost" onClick={d.refreshAll} style={{ marginTop: 8 }}>
                  Retry
                </Button>
              </div>
            ) : !overview ? (
              <div className="deals-body">
                <div className="skeleton" style={{ height: 160 }} />
              </div>
            ) : (
              <div className="deals-body">
                {overview.legacyMatches.map((m) => (
                  <SuggestedDealCard
                    key={m.id}
                    match={m}
                    canLink={!linkBlockedReason}
                    reason={linkBlockedReason}
                    onLink={() => setDialog({ kind: "link", opp: { id: m.id, title: m.title, quotationCount: m.quotationCount } })}
                  />
                ))}
                {deals.map((deal) => (
                  <DealCard
                    key={deal.opportunity.id}
                    deal={deal}
                    lead={leadByOpportunity.get(deal.opportunity.id)}
                    canQuote={canQuoteWith && blockers.length === 0}
                    quoteBlockedReason={quoteBlockedReason}
                    onQuote={() => setDialog({ kind: "quote", opportunityId: deal.opportunity.id })}
                  />
                ))}
                {deals.length === 0 && overview.legacyMatches.length === 0 && (
                  <EmptyState icon="target" title="No deals yet" body="A quotation is made from an opportunity linked to this customer. Start a deal from a qualified lead, or link an existing opportunity from its page." />
                )}
                <p className="fin-note">{canViewCollections ? "Invoices and receivables belong to FinanceOS and are shown as recorded there." : "Invoices belong to FinanceOS and are shown as recorded there."} Opportunities that are not linked to this customer are never counted.</p>
              </div>
            )}
          </section>
          {canViewCollections && rawOverview && <CollectionsStatementSection customer={customer} invoices={rawOverview.invoices} canRecord={canRecordPayment} now={now} onChanged={d.refreshAll} />}
          {canViewCollections && <LedgerStatementSection customer={customer} />}
        </div>

        <aside className="cockpit-rail" aria-label="Customer details">
          <GstRegistrationsPanel
            customer={customer}
            registrations={registrations}
            may={may}
            addState={actions.addGst}
            usage={usage}
            onAdd={() => setDialog({ kind: "gstAdd" })}
            onEdit={(reg) => setDialog({ kind: "gstEdit", reg })}
            onDeactivate={(reg) => setDialog({ kind: "gstDeactivate", reg })}
            onReactivate={(reg) => setDialog({ kind: "gstReactivate", reg })}
            onMakeDefault={(reg) => {
              d.makeDefaultRegistration(reg.id)
                .then(() => toast.show(`${reg.gstin} is now the default`, "check"))
                .catch((err) => toast.show(err instanceof Error ? err.message : "Couldn't change the default.", "alert"));
            }}
          />
          <DetailsPanel customer={customer} />
          <ActivityPanel events={d.events} loading={d.eventsLoading} error={d.eventsError} onRetry={d.refreshAll} />
        </aside>
      </div>

      {dialog?.kind === "edit" && <CustomerForm mode="edit" customer={customer} onClose={close} onSubmit={(input) => d.editCustomer(input)} />}
      {dialog?.kind === "delete" && (
        <DeleteRecordDialog
          entityType="CUSTOMER"
          id={customer.id}
          name={customer.customerName}
          onClose={close}
          onDeleted={(result) => {
            close();
            toast.success(`Customer "${result.label}" moved to the Recycle Bin`);
            router.push("/customers");
          }}
        />
      )}
      {dialog?.kind === "deactivate" && (
        <ConfirmDialog
          title={`Deactivate ${customer.customerName}`}
          body="The customer, its GST registrations, deals and documents are all kept and stay readable. While it is inactive nothing new can be made for it: no quotation, Proforma Invoice, Sales Order, opportunity link or registration. You can reactivate it at any time."
          confirmLabel="Deactivate customer"
          destructive
          noteLabel="Reason"
          noteRequired
          onClose={close}
          onConfirm={async (reason) => {
            await d.deactivateCustomer(reason ?? "");
            toast.show(`${customer.customerName} deactivated`, "check");
          }}
        >
          <DeactivationImpact impact={impact} loading={d.overviewLoading} error={d.overviewError} />
        </ConfirmDialog>
      )}
      {dialog?.kind === "reactivate" && (
        <ConfirmDialog
          title={`Reactivate ${customer.customerName}`}
          body="The customer takes new quotations, Proforma Invoices, Sales Orders, opportunity links and GST registrations again."
          confirmLabel="Reactivate customer"
          noteLabel="Remarks (optional)"
          onClose={close}
          onConfirm={async (remarks) => {
            await d.reactivateCustomer(remarks);
            toast.show(`${customer.customerName} reactivated`, "check");
          }}
        />
      )}
      {dialog?.kind === "gstAdd" && <GstRegistrationForm customer={customer} onClose={close} onSubmit={(input) => d.addRegistration(input as Parameters<typeof d.addRegistration>[0])} />}
      {dialog?.kind === "gstEdit" && <GstRegistrationForm customer={customer} registration={dialog.reg} onClose={close} onSubmit={(input) => d.editRegistration(dialog.reg.id, input as Parameters<typeof d.editRegistration>[1])} />}
      {dialog?.kind === "gstDeactivate" && (
        <ConfirmDialog
          title={`Deactivate ${dialog.reg.gstin}`}
          body="The registration is kept and stays on the documents already made with it, but it can't be chosen for new quotations or orders. You can reactivate it later."
          confirmLabel="Deactivate registration"
          destructive
          noteLabel="Reason"
          noteRequired
          onClose={close}
          onConfirm={async (reason) => {
            await d.deactivateRegistration(dialog.reg.id, reason ?? "");
            toast.show(`${dialog.reg.gstin} deactivated`, "check");
          }}
        />
      )}
      {dialog?.kind === "gstReactivate" && (
        <ConfirmDialog
          title={`Reactivate ${dialog.reg.gstin}`}
          body={registrations.filter((g) => g.isActive).length === 0 ? "It becomes the customer's default registration, because no other registration is active." : "It can be chosen for new quotations and orders again."}
          confirmLabel="Reactivate registration"
          noteLabel="Remarks (optional)"
          onClose={close}
          onConfirm={async (remarks) => {
            await d.reactivateRegistration(dialog.reg.id, remarks);
            toast.show(`${dialog.reg.gstin} reactivated`, "check");
          }}
        />
      )}
      {dialog?.kind === "quote" && (
        <QuotationForm
          defaultOpportunityId={dialog.opportunityId}
          onClose={close}
          onSubmit={async (input: CreateQuotationInput) => {
            const q = await repo.quotations.create(input);
            d.refreshAll();
            return q;
          }}
        />
      )}
      {dialog?.kind === "newDeal" && (
        <OpportunityForm
          forCustomer={{ id: customer.id, customerName: customer.customerName, customerCode: customer.customerCode }}
          onClose={close}
          onSubmit={async (input: CreateOpportunityInput) => {
            const o = await repo.opportunities.create(input);
            d.refreshAll();
            return o;
          }}
        />
      )}
      {dialog?.kind === "link" && (
        <ConfirmDialog
          title={`Link “${dialog.opp.title}”`}
          body={`Link this opportunity to ${customer.customerName}? ${dialog.opp.quotationCount > 0 ? `Its ${dialog.opp.quotationCount} existing ${dialog.opp.quotationCount === 1 ? "quotation" : "quotations"}, and everything built from ${dialog.opp.quotationCount === 1 ? "it" : "them"}, will then belong to this customer. ` : ""}Once it has a customer and a quotation, the customer can no longer be changed.`}
          confirmLabel="Link opportunity"
          onClose={close}
          onConfirm={async () => {
            await d.linkOpportunity(dialog.opp.id);
            toast.show("Opportunity linked", "check");
          }}
        />
      )}
    </div>
  );
}
