"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Icon } from "../../../components/ui/Icon";
import { Panel } from "../../../components/ui/Card";
import { Button, EmptyState } from "../../../components/ui/Button";
import { Tag, CustomerStatusTag, QuotationStatusTag, ProformaInvoiceStatusTag, SalesOrderStatusTag, OpportunityStageTag } from "../../../components/ui/Tag";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { DocumentActions, DocumentAction } from "../../../components/ui/DocumentActions";
import { LifecycleCallout } from "../../../components/ui/LifecycleCallout";
import { ReadinessPanel } from "../../../components/ui/ReadinessPanel";
import { CustomerHistory } from "../../../components/ui/DocumentLifecycleHistory";
import { initials } from "../../../components/ui/Who";
import { useToast } from "../../../components/ui/Toast";
import { CustomerForm } from "../../../components/forms/CustomerForm";
import { GstRegistrationForm } from "../../../components/forms/GstRegistrationForm";
import { QuotationForm } from "../../../components/forms/QuotationForm";
import { useCustomerDetail } from "../../../lib/hooks/useCustomers";
import { useAuth } from "../../../lib/auth/AuthContext";
import { useRepository } from "../../../lib/repository/RepositoryProvider";
import { CreateQuotationInput } from "../../../lib/repository/interfaces";
import { CUSTOMER_PERMISSIONS, customerActions, gstActions, quotingBlockerText, quotingBlockers, sortRegistrations } from "../../../lib/repository/shared/customerLifecycle";
import { QUOTATION_PERMISSIONS } from "../../../lib/repository/shared/quotationLifecycle";
import { Customer, CustomerGstRegistration, CustomerOverview, CustomerOverviewInvoice, CustomerOverviewOpportunity, CustomerOverviewProforma, CustomerOverviewOrder, CustomerOverviewQuotation } from "../../../lib/types/domain";
import { formatDate, formatDateTime, formatInrExact } from "../../../lib/format";

type Dialog =
  | { kind: "edit" }
  | { kind: "deactivate" }
  | { kind: "reactivate" }
  | { kind: "gstAdd" }
  | { kind: "gstEdit"; reg: CustomerGstRegistration }
  | { kind: "gstDeactivate"; reg: CustomerGstRegistration }
  | { kind: "gstReactivate"; reg: CustomerGstRegistration }
  | { kind: "quote"; opportunityId: string }
  | { kind: "link"; opp: { id: string; title: string; quotationCount: number } };

const ref = (id: string, code?: string) => code || `#${id.slice(0, 8).toUpperCase()}`;

function RegistrationRow({
  reg,
  customer,
  otherActive,
  may,
  onEdit,
  onDeactivate,
  onReactivate,
  onMakeDefault,
}: {
  reg: CustomerGstRegistration;
  customer: Customer;
  otherActive: number;
  may: { gstManage: boolean };
  onEdit: () => void;
  onDeactivate: () => void;
  onReactivate: () => void;
  onMakeDefault: () => void;
}) {
  const a = gstActions(reg, { customerActive: customer.isActive, may, otherActiveCount: otherActive });
  const whyNot = reg.isActive && reg.isDefault && otherActive > 0 && customer.isActive && may.gstManage ? "To deactivate the default, make another registration the default first." : undefined;
  return (
    <li className={`reg ${reg.isActive ? "" : "inactive"}`} data-testid="gst-row" data-gstin={reg.gstin}>
      <div>
        <div className="gstin">{reg.gstin}</div>
        <div className="sub">
          {reg.legalName}
          {reg.branchName ? ` · ${reg.branchName}` : ""}
        </div>
        <div className="tags">
          {reg.isDefault && reg.isActive && <Tag color="g">Default</Tag>}
          <Tag color={reg.isActive ? "n" : "b"}>{reg.isActive ? "Active" : "Inactive"}</Tag>
          <Tag color="i">{reg.stateName}</Tag>
        </div>
      </div>
      <div className="sub" style={{ marginTop: 0 }}>
        {reg.addressLine1}
        {reg.addressLine2 ? `, ${reg.addressLine2}` : ""}
        <br />
        {reg.city} {reg.pincode}
      </div>
      <div className="acts">
        <Button className="sm" onClick={onEdit} disabled={!a.edit.enabled} title={a.edit.reason}>
          Edit
        </Button>
        {reg.isActive && !reg.isDefault && (
          <Button className="sm" onClick={onMakeDefault} disabled={!a.makeDefault.enabled} title={a.makeDefault.reason}>
            Make default
          </Button>
        )}
        {reg.isActive ? (
          <Button className="sm danger-ghost" onClick={onDeactivate} disabled={!a.deactivate.enabled} title={a.deactivate.reason}>
            Deactivate
          </Button>
        ) : (
          <Button className="sm" onClick={onReactivate} disabled={!a.reactivate.enabled} title={a.reactivate.reason}>
            Reactivate
          </Button>
        )}
      </div>
      {whyNot && <div className="why-not">{whyNot}</div>}
    </li>
  );
}

function DealGroup({
  opp,
  overview,
  canQuote,
  quoteBlockedReason,
  onQuote,
}: {
  opp: CustomerOverviewOpportunity;
  overview: CustomerOverview;
  canQuote: boolean;
  quoteBlockedReason?: string;
  onQuote: () => void;
}) {
  const quotations = overview.quotations.filter((q) => q.opportunityId === opp.id);
  const proformasOf = (q: CustomerOverviewQuotation) => overview.proformas.filter((p) => p.quotationId === q.id);
  const ordersOf = (q: CustomerOverviewQuotation, pfs: CustomerOverviewProforma[]) =>
    overview.salesOrders.filter((o) => o.quotationId === q.id || (o.proformaInvoiceId && pfs.some((p) => p.id === o.proformaInvoiceId)));
  const invoicesOf = (o: CustomerOverviewOrder) => overview.invoices.filter((i) => i.salesOrderId === o.id);

  return (
    <div className="deal" data-testid="deal" data-opportunity={opp.id}>
      <div className="deal-head">
        <div>
          <div className="deal-title">
            <Link href={`/opportunities/${opp.id}`}>{opp.title}</Link>
          </div>
          <div className="deal-sub">
            <OpportunityStageTag stage={opp.stage} /> · expected {formatInrExact(opp.expectedValue)} · {opp.probability}% · close {formatDate(opp.expectedCloseDate)}
          </div>
        </div>
        <Button className="sm" icon="plus" onClick={onQuote} disabled={!canQuote} title={quoteBlockedReason}>
          New quotation
        </Button>
      </div>
      {quotations.length === 0 ? (
        <p className="deal-sub" style={{ marginTop: 10 }}>
          No quotation yet.
        </p>
      ) : (
        <ul className="deal-docs">
          {quotations.map((q) => {
            const pfs = proformasOf(q);
            const os = ordersOf(q, pfs);
            return (
              <li key={q.id} style={{ display: "block", border: 0, padding: 0, background: "none" }}>
                <ul className="deal-docs" style={{ margin: 0 }}>
                  <li>
                    <span className="kind">Quotation</span>
                    <Link href={`/quotations/${q.id}`}>{ref(q.id, q.quotationCode)}</Link>
                    <QuotationStatusTag status={q.status} />
                    <span className="amt">{formatInrExact(q.totalAmount)}</span>
                  </li>
                  {pfs.map((p) => (
                    <li key={p.id} className="indent-1">
                      <span className="kind">Proforma</span>
                      <Link href={`/proforma-invoices/${p.id}`}>{ref(p.id, p.proformaNumber)}</Link>
                      <ProformaInvoiceStatusTag status={p.status} expired={p.isExpired} />
                      <span className="amt">{formatInrExact(p.totalAmount)}</span>
                    </li>
                  ))}
                  {os.map((o) => (
                    <li key={o.id} className="indent-1">
                      <span className="kind">Order</span>
                      <Link href={`/sales-orders/${o.id}`}>{ref(o.id, o.salesOrderCode)}</Link>
                      <SalesOrderStatusTag status={o.status} />
                      <span className="amt">{formatInrExact(o.totalAmount)}</span>
                    </li>
                  ))}
                  {os.flatMap((o) =>
                    invoicesOf(o).map((i: CustomerOverviewInvoice) => (
                      <li key={i.id} className="indent-2">
                        <span className="kind">Invoice</span>
                        <Link href={`/sales-invoices/${i.id}`}>{ref(i.id, i.invoiceNumber)}</Link>
                        <Tag color={i.status === "DRAFT" ? "n" : "g"}>{i.status === "DRAFT" ? "Draft" : "Posted"}</Tag>
                        <Tag color={i.paymentStatus === "PAID" ? "g" : i.paymentStatus === "PARTIAL" ? "w" : "n"}>{i.paymentStatus.charAt(0) + i.paymentStatus.slice(1).toLowerCase().replace("_", " ")}</Tag>
                        <span className="amt">{formatInrExact(i.totalAmount)}</span>
                      </li>
                    ))
                  )}
                </ul>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function CustomerCockpitPage() {
  const params = useParams<{ id: string }>();
  const toast = useToast();
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
        <div className="skeleton" style={{ height: 150, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 80, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 280 }} />
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
        <Panel title="Customer not found">
          <p style={{ color: "var(--muted)", fontSize: 13.5 }}>This customer may have been removed, or the link is out of date.</p>
        </Panel>
      </div>
    );
  }

  const may = {
    edit: hasPermission(CUSTOMER_PERMISSIONS.edit),
    deactivate: hasPermission(CUSTOMER_PERMISSIONS.deactivate),
    gstManage: hasPermission(CUSTOMER_PERMISSIONS.gstManage),
  };
  const canQuoteWith = hasPermission(QUOTATION_PERMISSIONS.create);
  const actions = customerActions({ isActive: customer.isActive, may });
  const registrations = sortRegistrations(customer.gstRegistrations);
  const activeCount = registrations.filter((g) => g.isActive).length;
  const blockers = quotingBlockers(customer);
  const overview = d.overview;
  const totals = overview?.totals;

  const actionList: DocumentAction[] = [
    { key: "edit", label: "Edit details", icon: "edit", state: actions.edit, onClick: () => setDialog({ kind: "edit" }) },
    { key: "addGst", label: "Add GST registration", icon: "plus", variant: blockers.includes("NO_ACTIVE_GST") && customer.isActive ? "primary" : "ghost", state: actions.addGst, onClick: () => setDialog({ kind: "gstAdd" }) },
    customer.isActive
      ? { key: "deactivate", label: "Deactivate", icon: "close", className: "danger-ghost", state: actions.deactivate, onClick: () => setDialog({ kind: "deactivate" }) }
      : { key: "reactivate", label: "Reactivate", icon: "check", variant: "primary", state: actions.reactivate, onClick: () => setDialog({ kind: "reactivate" }) },
  ];

  const quoteBlockedReason = !canQuoteWith ? "You don't have permission to create quotations." : blockers.length ? quotingBlockerText(blockers[0]) : undefined;

  const readiness = [
    { key: "active", ok: customer.isActive, title: "The customer is active", why: customer.isActive ? undefined : "Reactivate it to create new quotations, Proforma Invoices and Sales Orders." },
    {
      key: "gst",
      ok: activeCount > 0,
      title: "Has an active GST registration",
      why: activeCount > 0 ? `${activeCount} active · default ${registrations.find((g) => g.isActive && g.isDefault)?.stateName ?? registrations.find((g) => g.isActive)?.stateName}` : "A quotation needs the buyer's GST registration to work out the tax. Add one below.",
    },
    ...(overview
      ? [
          {
            key: "deal",
            ok: overview.opportunities.length > 0,
            title: "Has a deal to quote",
            why: overview.opportunities.length > 0 ? `${overview.opportunities.length} linked ${overview.opportunities.length === 1 ? "opportunity" : "opportunities"}` : "A quotation is created from an opportunity linked to this customer. Link one below, or choose this customer on a new opportunity.",
          },
        ]
      : []),
  ];

  return (
    <div className="page">
      {back}

      <div className="card panel" style={{ marginBottom: 16 }}>
        <div className="doc-head" style={{ borderBottom: 0, paddingBottom: 10 }}>
          <div className="ident">
            <div className="av-lg" aria-hidden="true">
              {initials(customer.customerName)}
            </div>
            <div>
              <h1>{customer.customerName}</h1>
              <div className="co">
                {customer.customerCode}
                {customer.customerType ? ` · ${customer.customerType}` : ""}
                {customer.panNumber ? ` · PAN ${customer.panNumber}` : ""}
              </div>
              <div className="statusrow">
                <CustomerStatusTag isActive={customer.isActive} />
                {customer.isActive && blockers.includes("NO_ACTIVE_GST") && <Tag color="w">Can&apos;t be quoted yet</Tag>}
                {customer.linkedVendorId && <Tag color="i">Also a vendor</Tag>}
              </div>
            </div>
          </div>
          <div className="doc-amount">
            <div className="k">Outstanding</div>
            <div className="v" data-testid="header-outstanding">
              {totals ? formatInrExact(totals.outstandingValue) : "—"}
            </div>
            <div className="sub">Receivables as recorded by FinanceOS</div>
          </div>
        </div>
        <DocumentActions actions={actionList} testId="customer-actions" />
      </div>

      {!customer.isActive && (
        <LifecycleCallout
          tone="warn"
          icon="alert"
          title="Inactive — kept, but takes nothing new"
          testId="inactive-callout"
          actions={
            may.deactivate ? (
              <Button variant="primary" icon="check" onClick={() => setDialog({ kind: "reactivate" })}>
                Reactivate
              </Button>
            ) : undefined
          }
        >
          <p>
            No new quotation, Proforma Invoice, Sales Order, opportunity link or GST registration can be made for this customer while it is inactive. Everything it already has stays readable, and documents already in progress can still be closed.
          </p>
          <p>
            {customer.deactivatedByName ? `Deactivated by ${customer.deactivatedByName}` : "Deactivated"}
            {customer.deactivatedAt ? ` on ${formatDateTime(customer.deactivatedAt)}` : ""}.
            {customer.deactivationReason && (
              <>
                {" "}
                <span className="quote">Reason: &ldquo;{customer.deactivationReason}&rdquo;</span>
              </>
            )}
          </p>
        </LifecycleCallout>
      )}
      {customer.isActive && blockers.length > 0 && (
        <LifecycleCallout
          tone="info"
          icon="alert"
          title="Can't be quoted yet"
          testId="quoting-callout"
          actions={
            may.gstManage && blockers.includes("NO_ACTIVE_GST") ? (
              <Button variant="primary" icon="plus" onClick={() => setDialog({ kind: "gstAdd" })}>
                Add GST registration
              </Button>
            ) : undefined
          }
        >
          <p>{quotingBlockerText(blockers[0])}</p>
        </LifecycleCallout>
      )}

      <div className="crm-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card panel">
            <div className="panel-head">
              <h3>Ready to quote?</h3>
            </div>
            <ReadinessPanel items={readiness} testId="readiness" />
          </div>

          <div className="card panel">
            <div className="panel-head">
              <h3>GST registrations</h3>
              <span className="panel-act">
                <Button className="sm" icon="plus" onClick={() => setDialog({ kind: "gstAdd" })} disabled={!actions.addGst.enabled} title={actions.addGst.reason}>
                  Add registration
                </Button>
              </span>
            </div>
            {registrations.length === 0 ? (
              <EmptyState icon="percent" title="No GST registrations" body="A quotation needs the buyer's GST registration. Add the first one — it becomes the default." />
            ) : (
              <ul className="reg-list" aria-label="GST registrations" data-testid="gst-list">
                {registrations.map((g) => (
                  <RegistrationRow
                    key={g.id}
                    reg={g}
                    customer={customer}
                    otherActive={registrations.filter((x) => x.isActive && x.id !== g.id).length}
                    may={may}
                    onEdit={() => setDialog({ kind: "gstEdit", reg: g })}
                    onDeactivate={() => setDialog({ kind: "gstDeactivate", reg: g })}
                    onReactivate={() => setDialog({ kind: "gstReactivate", reg: g })}
                    onMakeDefault={() => {
                      d.makeDefaultRegistration(g.id)
                        .then(() => toast.show(`${g.gstin} is now the default`, "check"))
                        .catch((err) => toast.show(err instanceof Error ? err.message : "Couldn't change the default.", "alert"));
                    }}
                  />
                ))}
              </ul>
            )}
          </div>

          <div className="card panel">
            <div className="panel-head">
              <h3>Deals and documents</h3>
            </div>
            {d.overviewError ? (
              <div style={{ padding: "0 21px 21px" }}>
                <p style={{ color: "var(--bad)", fontSize: 13 }} role="alert">
                  Couldn&apos;t load this customer&apos;s deals: {d.overviewError.message}
                </p>
                <Button variant="ghost" onClick={d.refreshAll} style={{ marginTop: 8 }}>
                  Retry
                </Button>
              </div>
            ) : !overview ? (
              <div style={{ padding: "0 21px 21px" }}>
                <div className="skeleton" style={{ height: 120 }} />
              </div>
            ) : (
              <>
                {totals && (
                  <div className="kpis" data-testid="kpis">
                    <div>
                      <div className="k">Approved quotes</div>
                      <div className="v">{formatInrExact(totals.approvedQuotationValue)}</div>
                      <div className="n">{totals.counts.quotations} quotations</div>
                    </div>
                    <div>
                      <div className="k">Ordered</div>
                      <div className="v">{formatInrExact(totals.orderedValue)}</div>
                      <div className="n">{totals.counts.salesOrders} orders</div>
                    </div>
                    <div>
                      <div className="k">Invoiced</div>
                      <div className="v">{formatInrExact(totals.invoicedValue)}</div>
                      <div className="n">{totals.counts.invoices} invoices</div>
                    </div>
                    <div>
                      <div className="k">Collected</div>
                      <div className="v">{formatInrExact(totals.collectedValue)}</div>
                    </div>
                    <div>
                      <div className="k">Outstanding</div>
                      <div className="v">{formatInrExact(totals.outstandingValue)}</div>
                    </div>
                  </div>
                )}
                {overview.opportunities.length === 0 ? (
                  <EmptyState icon="target" title="No deals linked yet" body="Link an existing opportunity below, or choose this customer when creating an opportunity. Documents are counted here only once their opportunity is linked." />
                ) : (
                  overview.opportunities.map((o) => (
                    <DealGroup key={o.id} opp={o} overview={overview} canQuote={canQuoteWith && blockers.length === 0} quoteBlockedReason={quoteBlockedReason} onQuote={() => setDialog({ kind: "quote", opportunityId: o.id })} />
                  ))
                )}
                <p className="fin-note">Invoices and receivables belong to FinanceOS and are shown as recorded there. Opportunities that are not linked to this customer are never counted.</p>
              </>
            )}
          </div>

          {overview && overview.legacyMatches.length > 0 && (
            <div className="card panel" data-testid="legacy-matches">
              <div className="panel-head">
                <h3>Possible matches to link</h3>
              </div>
              <p className="fin-note" style={{ paddingTop: 4 }}>
                These opportunities are not linked to any customer, but their lead has this customer&apos;s name. That is only a guess by name — check, then link. Their quotations and orders then belong to this customer.
              </p>
              {overview.legacyMatches.map((m) => (
                <div className="match" key={m.id} data-testid="legacy-match">
                  <div>
                    <div className="t">
                      <Link href={`/opportunities/${m.id}`}>{m.title}</Link>
                    </div>
                    <div className="s">
                      Lead {m.leadName}
                      {m.leadCompany ? ` (${m.leadCompany})` : ""} · {m.matchedBy === "LEAD_NAME" ? "same name as the customer" : "company name matches"} · {m.quotationCount} {m.quotationCount === 1 ? "quotation" : "quotations"}
                    </div>
                  </div>
                  <Button
                    className="sm"
                    icon="target"
                    onClick={() => setDialog({ kind: "link", opp: { id: m.id, title: m.title, quotationCount: m.quotationCount } })}
                    disabled={!customer.isActive || !hasPermission("opportunities.edit")}
                    title={!customer.isActive ? "Reactivate the customer before linking opportunities to it." : !hasPermission("opportunities.edit") ? "You don't have permission to edit opportunities." : undefined}
                  >
                    Link to this customer
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="card panel">
            <div className="panel-head">
              <h3>Details</h3>
            </div>
            <div className="facts" data-testid="details">
              <div className="f"><span className="k">PAN</span><div>{customer.panNumber ?? "—"}</div></div>
              <div className="f"><span className="k">Email</span><div>{customer.email ?? "—"}</div></div>
              <div className="f"><span className="k">Phone</span><div>{customer.phone ?? "—"}</div></div>
              <div className="f"><span className="k">Type</span><div>{customer.customerType ?? "—"}</div></div>
              <div className="f"><span className="k">Created</span><div>{formatDate(customer.createdAt)}</div></div>
              <div className="f"><span className="k">Last updated</span><div>{formatDate(customer.updatedAt)}</div></div>
            </div>
          </div>
        </div>

        <Panel title="History" flush>
          <CustomerHistory events={d.events} loading={d.eventsLoading} error={d.eventsError} onRetry={d.refreshAll} />
        </Panel>
      </div>

      {dialog?.kind === "edit" && <CustomerForm mode="edit" customer={customer} onClose={close} onSubmit={(input) => d.editCustomer(input)} />}
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
        />
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
          body={activeCount === 0 ? "It becomes the customer's default registration, because no other registration is active." : "It can be chosen for new quotations and orders again."}
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
