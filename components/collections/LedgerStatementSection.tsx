"use client";

import { useState } from "react";
import { Customer, StatementPeriod } from "../../lib/types/domain";
import { useCustomerStatement } from "../../lib/hooks/useCustomerStatement";
import { useRepository } from "../../lib/repository/RepositoryProvider";
import { ApiError, saveDownloadedFile } from "../../lib/api/httpClient";
import { formatDay } from "../../lib/repository/shared/collections";
import { MoneyText } from "../ui/MoneyText";
import { Button } from "../ui/Button";
import { TextField, FieldRow } from "../ui/FormField";
import { useToast } from "../ui/Toast";

/**
 * The customer's LEDGER statement: every CustomerLedger entry of the invoices of the
 * opportunities linked to this customer, with balances recomputed from debits and credits
 * (positive = owed by the customer). Ledger-derived only: receivables and payments are in
 * the Collections Statement above, and the two are never mixed. Remarks are shown as
 * recorded; nothing is inferred from them.
 *
 * Only rendered for someone with collections.view; the backend checks it as well.
 */
export function LedgerStatementSection({ customer }: { customer: Pick<Customer, "id" | "customerCode" | "customerName" | "isActive"> }) {
  const repo = useRepository();
  const toast = useToast();
  const [draft, setDraft] = useState<StatementPeriod>({});
  const [period, setPeriod] = useState<StatementPeriod>({});
  const [downloading, setDownloading] = useState(false);
  const rangeError = draft.from && draft.to && draft.from > draft.to ? "The start date must not be after the end date." : undefined;
  const { data: statement, loading, error, refetch } = useCustomerStatement(customer.id, period, true);

  const apply = (next: StatementPeriod) => {
    setDraft(next);
    if (!(next.from && next.to && next.from > next.to)) setPeriod(next);
  };

  async function download() {
    setDownloading(true);
    try {
      saveDownloadedFile(await repo.customerStatements.downloadPdf(customer.id, period));
      toast.success("Statement downloaded");
    } catch (err) {
      toast.error(err instanceof ApiError || err instanceof Error ? err.message : "Could not download the statement.");
    } finally {
      setDownloading(false);
    }
  }

  const filtered = !!(period.from || period.to);
  const coverage = statement?.coverage;

  return (
    <section className="card panel stmt" id="ledger-statement" aria-labelledby="ledger-statement-title" data-testid="ledger-statement">
      <div className="panel-head">
        <h3 id="ledger-statement-title">Ledger statement</h3>
        <Button icon="file" onClick={download} disabled={downloading || loading || !!error || !!rangeError}>
          {downloading ? "Preparing PDF…" : "Download PDF"}
        </Button>
      </div>
      <p className="stmt-note">
        From the customer ledger, for the invoices of opportunities linked to this customer. Balances come from the ledger&apos;s debits and credits (a positive balance is owed by the customer); receivables and payments are in the Collections Statement above.
      </p>

      <div className="ledger-filters">
        <FieldRow>
          <TextField label="From" type="date" value={draft.from ?? ""} max={draft.to || undefined} onChange={(e) => apply({ ...draft, from: e.target.value || undefined })} />
          <TextField label="To" type="date" value={draft.to ?? ""} min={draft.from || undefined} error={rangeError} onChange={(e) => apply({ ...draft, to: e.target.value || undefined })} />
        </FieldRow>
        <Button onClick={() => apply({})} disabled={!draft.from && !draft.to}>
          All time
        </Button>
      </div>

      {coverage && coverage.postedInvoicesWithoutLedgerEntries > 0 && (
        <p className="col-note warn" role="note">
          {coverage.postedInvoicesWithoutLedgerEntries} posted invoice{coverage.postedInvoicesWithoutLedgerEntries === 1 ? " has" : "s have"} no ledger entry, so {coverage.postedInvoicesWithoutLedgerEntries === 1 ? "it is" : "they are"} not in this statement.
        </p>
      )}
      {coverage && coverage.unlinkedLegacyMatches > 0 && (
        <p className="col-note warn" role="note">
          {coverage.unlinkedLegacyMatches} opportunit{coverage.unlinkedLegacyMatches === 1 ? "y looks" : "ies look"} like this customer but {coverage.unlinkedLegacyMatches === 1 ? "is" : "are"} not linked to it. Their invoices are not in this statement until {coverage.unlinkedLegacyMatches === 1 ? "it is" : "they are"} linked (see Possible legacy matches).
        </p>
      )}

      {loading && !statement ? (
        <p className="pay-empty" style={{ padding: "0 21px 16px" }}>
          Loading the ledger statement…
        </p>
      ) : error ? (
        <div className="pay-empty" style={{ padding: "0 21px 16px" }} role="alert">
          <p style={{ margin: "0 0 8px" }}>{error.message || "The ledger statement couldn't be loaded."}</p>
          <Button onClick={refetch}>Retry</Button>
        </div>
      ) : statement ? (
        <>
          <div className="stmt-totals" data-testid="ledger-totals">
            <div>
              <span className="k">Opening balance</span>
              <MoneyText value={statement.openingBalance} mode="exact" />
            </div>
            <div>
              <span className="k">Debits</span>
              <MoneyText value={statement.totalDebits} mode="exact" />
            </div>
            <div>
              <span className="k">Credits</span>
              <MoneyText value={statement.totalCredits} mode="exact" />
            </div>
            <div>
              <span className="k">Closing balance</span>
              <b>
                <MoneyText value={statement.closingBalance} mode="exact" />
              </b>
            </div>
          </div>
          {statement.entries.length === 0 ? (
            <p className="pay-empty" style={{ padding: "0 21px 16px" }} data-testid="ledger-empty">
              {filtered ? "No ledger entries for this customer in this period." : "No ledger entries for this customer."}
            </p>
          ) : (
            <div className="table-scroll ledger-table">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Invoice</th>
                    <th>Remarks</th>
                    <th className="r">Debit</th>
                    <th className="r">Credit</th>
                    <th className="r">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {statement.entries.map((e) => (
                    <tr key={e.id}>
                      <td data-label="Date">{formatDay(e.entryDate)}</td>
                      <td data-label="Invoice">{e.invoiceNumber ?? "—"}</td>
                      <td data-label="Remarks">{e.remarks ?? ""}</td>
                      <td data-label="Debit" className="r">{e.debit ? <MoneyText value={e.debit} mode="exact" /> : ""}</td>
                      <td data-label="Credit" className="r">{e.credit ? <MoneyText value={e.credit} mode="exact" /> : ""}</td>
                      <td data-label="Balance" className="r">
                        <MoneyText value={e.runningBalance} mode="exact" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}
    </section>
  );
}
