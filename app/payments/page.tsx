"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "../../components/ui/PageHeader";
import { Button, EmptyState } from "../../components/ui/Button";
import { Disclosure } from "../../components/ui/Disclosure";
import { FilterChips } from "../../components/ui/FilterChips";
import { LoadingRegion } from "../../components/ui/LoadingRegion";
import { TextField } from "../../components/ui/FormField";
import { CollectionGroupView, CollectionRowItem, CollectionsColumnHeads, CollectionsSummaryStrip } from "../../components/collections/CollectionsWorklist";
import { PaymentTarget, RecordPaymentDialog } from "../../components/collections/RecordPaymentDialog";
import { CollectionRow, COLLECTION_SORT_LABEL, COLLECTION_VIEW_LABEL, COLLECTION_VIEW_ORDER, CollectionSort, CollectionView, DUE_DATE_DISCLOSURE, groupRows, inView, matchesSearch, sortRows, summarize, viewCounts } from "../../lib/repository/shared/collections";
import { useCollections } from "../../lib/hooks/useCollections";
import { useAuth } from "../../lib/auth/AuthContext";

function CollectionsWorkspace() {
  const { hasPermission, ready } = useAuth();
  const may = { view: hasPermission("collections.view"), record: hasPermission("collections.record") };
  const q = useCollections(may.view);
  const params = useSearchParams();
  const customerFilter = params?.get("customer") ?? null;

  const [view, setView] = useState<CollectionView>("TO_COLLECT");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<CollectionSort>("DUE");
  const [grouped, setGrouped] = useState(true);
  const [recording, setRecording] = useState<PaymentTarget | null>(null);

  const scoped = useMemo(() => (customerFilter ? q.rows.filter((r) => r.identity.kind === "linked" && r.identity.customer.id === customerFilter) : q.rows), [q.rows, customerFilter]);
  const filterName = customerFilter ? scoped.map((r) => (r.identity.kind === "linked" ? r.identity.customer.customerName : "")).find(Boolean) : undefined;
  const counts = useMemo(() => viewCounts(scoped), [scoped]);
  const shown = useMemo(() => scoped.filter((r) => inView(r, view) && matchesSearch(r, search)), [scoped, view, search]);
  const summary = useMemo(() => summarize(scoped, q.collected), [scoped, q.collected]);
  const groups = useMemo(() => (grouped ? groupRows(shown, sort) : []), [grouped, shown, sort]);
  const flat = useMemo(() => (grouped ? [] : sortRows(shown, sort)), [grouped, shown, sort]);

  function record(row: CollectionRow) {
    setRecording({ salesInvoiceId: row.salesInvoiceId, invoiceNumber: row.invoiceNumber, identity: row.identity, invoiceCustomerName: row.invoiceCustomerName, balance: row.balance, state: row.state, dueDate: row.dueDate });
  }

  const header = <PageHeader eyebrow="RevenueOS · Quote to Cash · Collections" title="Collections" subtitle="Who owes what, since when, and the payments received." />;

  if (!ready || (may.view && q.loading && q.rows.length === 0 && !q.error)) {
    return (
      <div className="page collections">
        {header}
        <LoadingRegion label="Loading collections">
          <div className="skeleton" style={{ height: 96, marginBottom: 16 }} />
          <div className="skeleton" style={{ height: 300 }} />
        </LoadingRegion>
      </div>
    );
  }
  if (!may.view) {
    return (
      <div className="page collections">
        {header}
        <div className="card panel">
          <EmptyState icon="lock" title="You can't view collections" body="Receivables and payments need the View Payment Collections permission. Ask an administrator if you need it." />
        </div>
      </div>
    );
  }
  if (q.error) {
    return (
      <div className="page collections">
        {header}
        <div className="card panel">
          <EmptyState icon="alert" title="Couldn't load collections" body={q.error.message || "Something went wrong reaching the RevenueOS backend. Please try again."} action={<Button variant="ghost" onClick={q.refetch}>Retry</Button>} />
        </div>
      </div>
    );
  }

  const options = COLLECTION_VIEW_ORDER.map((v) => ({ value: v, label: COLLECTION_VIEW_LABEL[v], count: counts[v] })).filter((o) => o.value === "TO_COLLECT" || o.value === view || o.count > 0);

  return (
    <div className="page collections">
      {header}
      <CollectionsSummaryStrip summary={summary} />
      {q.dealsUnavailable && (
        <p className="col-note warn" role="status">
          The deals couldn&apos;t be read, so receivables can&apos;t be put under their customers right now. They are listed without one.
        </p>
      )}
      {q.paymentsUnavailable && (
        <p className="col-note warn" role="status">
          The payments couldn&apos;t be read: the collected figure is unavailable, and each receivable&apos;s paid amount can&apos;t be checked against its payments.
        </p>
      )}
      <Disclosure summary="Why do many open invoices show as overdue?" testId="due-date-disclosure">
        <p style={{ fontSize: 12.5, margin: 0 }}>{DUE_DATE_DISCLOSURE}</p>
      </Disclosure>

      <div className="col-toolbar">
        <FilterChips label="Show receivables" options={options} value={view} onChange={setView} />
      </div>
      <div className="col-toolbar" style={{ marginTop: 0 }}>
        <div className="col-search">
          <TextField label="Search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Invoice or customer" type="search" autoComplete="off" />
        </div>
        <label className="col-ctl">
          <span>Sort</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as CollectionSort)} aria-label="Sort receivables">
            {(Object.keys(COLLECTION_SORT_LABEL) as CollectionSort[]).map((s) => (
              <option key={s} value={s}>
                {COLLECTION_SORT_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <Button variant="ghost" className="col-toggle" onClick={() => setGrouped((g) => !g)} aria-pressed={grouped}>
          {grouped ? "Show as one list" : "Group by customer"}
        </Button>
      </div>
      {customerFilter && (
        <p className="col-filter-chip">
          Showing {filterName ?? "one customer"}&apos;s receivables only. <Link href="/payments">Show all</Link>
        </p>
      )}

      {shown.length === 0 ? (
        <div className="card panel" style={{ marginTop: 14 }}>
          <EmptyState
            icon="cash"
            title={scoped.length === 0 ? "No receivables yet" : view === "TO_COLLECT" && search.trim() === "" ? "Nothing to collect" : "Nothing matches"}
            body={scoped.length === 0 ? "A receivable is created when an invoice is posted." : view === "TO_COLLECT" && search.trim() === "" ? "Every receivable is paid, written off or closed." : "Try another view or a different search."}
          />
        </div>
      ) : grouped ? (
        <div data-testid="collection-groups">
          {groups.map((g) => (
            <CollectionGroupView key={g.key} group={g} may={may} onRecord={record} />
          ))}
        </div>
      ) : (
        <section className="card panel col-group" data-testid="collection-flat" aria-label="Receivables">
          <CollectionsColumnHeads showCustomer />
          <div className="col-rows" role="list">
            {flat.map((r) => (
              <div key={r.id} role="listitem">
                <CollectionRowItem row={r} may={may} showCustomer onRecord={record} />
              </div>
            ))}
          </div>
        </section>
      )}

      {recording && <RecordPaymentDialog target={recording} liveBalance={q.rows.find((r) => r.salesInvoiceId === recording.salesInvoiceId)?.balance} onClose={() => setRecording(null)} onRecorded={() => q.refetch()} onStale={() => q.refetch()} />}
    </div>
  );
}

export default function CollectionsPage() {
  return (
    <Suspense fallback={<div className="page"><div className="skeleton" style={{ height: 300 }} /></div>}>
      <CollectionsWorkspace />
    </Suspense>
  );
}
