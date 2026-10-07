"use client";

import { Icon } from "./Icon";
import { Tag } from "./Tag";
import { Button } from "./Button";
import {
  CustomerEvent,
  ProformaEvent,
  QuotationEvent,
  formatCustomerEventAction,
  formatProformaEventAction,
  formatProformaInvoiceStatus,
  formatQuotationEventAction,
  formatQuotationStatus,
} from "../../lib/types/domain";
import { formatDateTime, formatInrExact } from "../../lib/format";

interface Change {
  label: string;
  from?: number;
  to: number;
}

interface Entry {
  id: string;
  action: string;
  title: string;
  icon: string;
  fromLabel?: string;
  toLabel?: string;
  remarks?: string;
  /** The remarks are a mandatory reason (rejection, cancellation), shown as "Reason". */
  isReason: boolean;
  actorName: string;
  occurredAt: string;
  changes: Change[];
  /** What the event is about, e.g. the GST registration or the opportunity. */
  detail?: string;
  /** Text fields that changed: label, before, after. */
  textChanges?: Array<{ label: string; from: string | null; to: string | null }>;
}

function EntryList({
  entries,
  loading,
  error,
  onRetry,
  noun,
  creationAction,
  testId,
  limit,
  startsAtCreation: startsAtCreationProp,
  showFoot = true,
}: {
  entries: Entry[];
  loading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  noun: string;
  creationAction: string;
  testId: string;
  /** Show only the first `limit` entries (the rest are kept; the "earlier history" note still looks at all of them). */
  limit?: number;
  /** Whether the history reaches back to the creation event, when the caller knows better than the entries passed in (a filtered list). */
  startsAtCreation?: boolean;
  showFoot?: boolean;
}) {
  if (error) {
    return (
      <div className="tl" data-testid={testId}>
        <p style={{ color: "var(--bad)", fontSize: 13 }}>Couldn&apos;t load the history: {error.message}</p>
        {onRetry && (
          <Button variant="ghost" onClick={onRetry} style={{ marginTop: 8 }}>
            Retry
          </Button>
        )}
      </div>
    );
  }
  if (loading && entries.length === 0) {
    return (
      <div className="tl" data-testid={testId}>
        <div className="skeleton" style={{ height: 56, marginBottom: 10 }} />
        <div className="skeleton" style={{ height: 56 }} />
      </div>
    );
  }

  // Nothing is ever invented: an empty list means the backend recorded nothing.
  const startsAtCreation = startsAtCreationProp ?? entries.some((e) => e.action === creationAction);
  const visible = limit === undefined ? entries : entries.slice(0, limit);

  return (
    <div className="tl" data-testid={testId}>
      {entries.length === 0 && (
        <p style={{ color: "var(--muted)", fontSize: 13 }} data-testid={`${testId}-empty`}>
          No lifecycle history was recorded for this {noun}. It was created before lifecycle tracking began, so what
          happened earlier isn&apos;t available. Anything done from now on is recorded here.
        </p>
      )}
      {visible.map((e) => (
        <div className="tl-item" key={e.id}>
          <div className="dot">
            <Icon name={e.icon} size={14} />
          </div>
          <div className="body">
            <div className="r1">
              <b>{e.title}</b>
              <span className="when">{formatDateTime(e.occurredAt)}</span>
            </div>
            {e.toLabel && (
              <div className="trans">
                {e.fromLabel ? <Tag color="n">{e.fromLabel}</Tag> : <small style={{ color: "var(--muted)", fontSize: 11.5 }}>Started as</small>}
                {e.fromLabel && <Icon name="arrow" size={12} />}
                <Tag color="n">{e.toLabel}</Tag>
              </div>
            )}
            {e.detail && <p className="hist-detail">{e.detail}</p>}
            {e.textChanges && e.textChanges.length > 0 && (
              <div className="hist-delta">
                {e.textChanges.map((c) => (
                  <span key={c.label}>
                    {c.label}: {c.from ? c.from : <i>none</i>} → <b>{c.to ? c.to : <i>none</i>}</b>
                  </span>
                ))}
              </div>
            )}
            {e.changes.length > 0 && (
              <div className="hist-delta">
                {e.changes.map((c) => (
                  <span key={c.label}>
                    {c.label}:{" "}
                    {c.from !== undefined ? (
                      <>
                        {formatInrExact(c.from)} → <b>{formatInrExact(c.to)}</b>
                      </>
                    ) : (
                      <b>{formatInrExact(c.to)}</b>
                    )}
                  </span>
                ))}
              </div>
            )}
            {e.remarks && (
              <p style={{ fontStyle: "italic" }}>
                {e.isReason && <span style={{ fontStyle: "normal", color: "var(--muted)", fontWeight: 600 }}>Reason: </span>}
                &ldquo;{e.remarks}&rdquo;
              </p>
            )}
            <small style={{ color: "var(--muted)", fontSize: 11.5 }}>{e.actorName ? `by ${e.actorName}` : "Actor not recorded"}</small>
          </div>
        </div>
      ))}
      {showFoot && entries.length > 0 && !startsAtCreation && (
        <p className="hist-foot" data-testid={`${testId}-foot`}>
          Earlier history isn&apos;t available: this {noun} was created before lifecycle tracking began.
        </p>
      )}
    </div>
  );
}

const QUOTATION_ICON: Record<string, string> = {
  QUOTATION_CREATED: "plus",
  QUOTATION_REVISED: "layers",
  QUOTATION_APPROVED: "check",
  QUOTATION_REJECTED: "close",
};

/**
 * A Quotation's lifecycle history: who created, revised, approved or rejected it
 * and when, the status change, what a revision did to the amounts, and any
 * remarks (for a rejection, the reason). It only holds what the backend
 * recorded; nothing is reconstructed for a quotation that predates tracking.
 */
export function QuotationHistory({
  events,
  loading,
  error,
  onRetry,
}: {
  events: QuotationEvent[];
  loading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}) {
  const entries: Entry[] = events.map((e) => {
    const changes: Change[] = [];
    if (e.action === "QUOTATION_REVISED") {
      if (e.newTaxableAmount !== undefined) changes.push({ label: "Taxable amount", from: e.previousTaxableAmount, to: e.newTaxableAmount });
      if (e.newTotalAmount !== undefined) changes.push({ label: "Total", from: e.previousTotalAmount, to: e.newTotalAmount });
    } else if (e.action === "QUOTATION_CREATED" && e.newTotalAmount !== undefined) {
      if (e.newTaxableAmount !== undefined) changes.push({ label: "Taxable amount", to: e.newTaxableAmount });
      changes.push({ label: "Total", to: e.newTotalAmount });
    }
    return {
      id: e.id,
      action: e.action,
      title: formatQuotationEventAction(e.action),
      icon: QUOTATION_ICON[e.action] ?? "pulse",
      fromLabel: e.fromStatus ? formatQuotationStatus(e.fromStatus) : undefined,
      toLabel: e.toStatus ? formatQuotationStatus(e.toStatus) : undefined,
      remarks: e.remarks,
      isReason: e.action === "QUOTATION_REJECTED",
      actorName: e.actorName,
      occurredAt: e.occurredAt,
      changes,
    };
  });
  return <EntryList entries={entries} loading={loading} error={error} onRetry={onRetry} noun="quotation" creationAction="QUOTATION_CREATED" testId="quotation-history" />;
}

const PROFORMA_ICON: Record<string, string> = {
  PROFORMA_CREATED: "plus",
  PROFORMA_APPROVED: "check",
  PROFORMA_CANCELLED: "close",
};

/**
 * A Proforma Invoice's lifecycle history: who created, approved or cancelled it
 * and when, the status change and any remarks (for a cancellation, the reason).
 * It only holds what the backend recorded; nothing is reconstructed for a
 * Proforma that predates tracking.
 */
export function ProformaHistory({
  events,
  loading,
  error,
  onRetry,
}: {
  events: ProformaEvent[];
  loading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}) {
  const entries: Entry[] = events.map((e) => ({
    id: e.id,
    action: e.action,
    title: formatProformaEventAction(e.action),
    icon: PROFORMA_ICON[e.action] ?? "pulse",
    fromLabel: e.fromStatus ? formatProformaInvoiceStatus(e.fromStatus) : undefined,
    toLabel: e.toStatus ? formatProformaInvoiceStatus(e.toStatus) : undefined,
    remarks: e.remarks,
    isReason: e.action === "PROFORMA_CANCELLED",
    actorName: e.actorName,
    occurredAt: e.occurredAt,
    changes: [],
  }));
  return <EntryList entries={entries} loading={loading} error={error} onRetry={onRetry} noun="Proforma Invoice" creationAction="PROFORMA_CREATED" testId="proforma-history" />;
}

const CUSTOMER_ICON: Record<string, string> = {
  CUSTOMER_CREATED: "plus",
  CUSTOMER_UPDATED: "edit",
  CUSTOMER_DEACTIVATED: "close",
  CUSTOMER_REACTIVATED: "check",
  GST_ADDED: "plus",
  GST_UPDATED: "edit",
  GST_DEACTIVATED: "close",
  GST_REACTIVATED: "check",
  GST_DEFAULT_CHANGED: "pin",
  OPPORTUNITY_LINKED: "target",
  OPPORTUNITY_UNLINKED: "close",
};

const CUSTOMER_FIELD_LABEL: Record<string, string> = {
  customerName: "Name",
  customerType: "Type",
  panNumber: "PAN",
  email: "Email",
  phone: "Phone",
  legalName: "Legal name",
  tradeName: "Trade name",
  branchName: "Branch",
  addressLine1: "Address",
  addressLine2: "Address line 2",
  city: "City",
  pincode: "PIN code",
  defaultGstin: "Default registration",
};

const statusWord = (s: string) => (s === "ACTIVE" ? "Active" : s === "INACTIVE" ? "Inactive" : s);

/**
 * A customer's history: created, details changed (each field with before and
 * after), deactivated (with the reason) and reactivated, GST registrations
 * added, edited, deactivated, reactivated or made the default, and opportunities
 * linked or unlinked. It only holds what the backend recorded: a customer that
 * existed before the history began shows no earlier entries.
 */
export function CustomerHistory({
  events,
  loading,
  error,
  onRetry,
  limit,
  startsAtCreation,
  showFoot,
}: {
  events: CustomerEvent[];
  loading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  limit?: number;
  startsAtCreation?: boolean;
  showFoot?: boolean;
}) {
  const entries: Entry[] = events.map((e) => {
    const reg = e.gstRegistration;
    const regLabel = reg ? [reg.gstin, reg.branchName].filter(Boolean).join(" · ") : undefined;
    const isOpportunity = e.action === "OPPORTUNITY_LINKED" || e.action === "OPPORTUNITY_UNLINKED";
    return {
      id: e.id,
      action: e.action,
      title: formatCustomerEventAction(e.action),
      icon: CUSTOMER_ICON[e.action] ?? "pulse",
      fromLabel: e.fromStatus && e.fromStatus !== e.toStatus ? statusWord(e.fromStatus) : undefined,
      toLabel: e.toStatus && e.fromStatus !== e.toStatus ? statusWord(e.toStatus) : undefined,
      remarks: isOpportunity ? undefined : e.remarks,
      isReason: e.action === "CUSTOMER_DEACTIVATED" || e.action === "GST_DEACTIVATED",
      actorName: e.actorName,
      occurredAt: e.occurredAt,
      changes: [],
      detail: regLabel ?? (isOpportunity && e.remarks ? e.remarks : undefined),
      textChanges: e.changes ? Object.entries(e.changes).map(([key, c]) => ({ label: CUSTOMER_FIELD_LABEL[key] ?? key, from: c.from, to: c.to })) : undefined,
    };
  });
  return <EntryList entries={entries} loading={loading} error={error} onRetry={onRetry} noun="customer" creationAction="CUSTOMER_CREATED" testId="customer-history" limit={limit} startsAtCreation={startsAtCreation} showFoot={showFoot} />;
}
