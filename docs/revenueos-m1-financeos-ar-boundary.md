# M1 — FinanceOS receivable finding and the concurrency boundary

Status: read-only investigation, 2026-10-08. Nothing in FinanceOS, the real database or the live services was changed. Applies to Payment Collection V1 (backend `1a27b1e`).

## 1. The finding: `POST /accounts-receivable` can create a second receivable for an invoice

`financeos/accounts-receivable/accounts-receivable.service.ts` `create()` is a bare `accountsReceivable.create`: it does not look for an existing receivable on the invoice, does not check the invoice's status, and the controller has no guard. Nothing in the schema stopped a second row, because `SalesInvoice.receivables` is a one-to-many relation with no unique key.

Demonstrated on the scratch database (never the real one), before the M1 index:

| Step | Result |
|---|---|
| `POST /accounts-receivable` for an invoice that already has a receivable | HTTP 201, a second receivable for the same invoice |
| Collections dashboard summary | `totalInvoices` 6 -> 7 and `totalOutstanding` 991,800 -> 1,286,800 (the invoice's 295,000 counted twice) |
| A credit note of 100 on that invoice | `findFirst` picked one receivable (295,000 -> 294,900); the other still showed 295,000 |

Every aggregate over receivables (collections dashboard, balance sheet, cashflow, BI services, the customer overview's outstanding) sums all rows, so a duplicate double counts. Credit notes, debit notes and the old payment command each used `findFirst`, so they acted on an arbitrary one of the two.

With the M1 unique index in place, the same POST fails the unique constraint and the unhandled error becomes HTTP 500 "Internal server error" (no row is created and the totals are unchanged). A clean 409 would be a FinanceOS change and is not part of M1.

## 2. Are duplicate receivables ever legitimate?

No, according to the model and every existing workflow:

- The invoice workflow creates exactly one receivable per invoice (`sales-invoices.service.ts`, step 5), with the invoice date as due date and the full total outstanding.
- Credit and debit notes **adjust that one receivable** (`outstandingAmount` and `balanceAmount`), they do not add rows. Bad-debt write-off acts on one receivable by id.
- The receivable has a single `dueDate`, a single `outstandingAmount` and a single `paidAmount`/`balanceAmount`: there is no instalment number, sequence, parent or schedule field. Payment terms (advance / credit days) live on the Sales Order (`SalesOrderPaymentTerm`), not as receivable rows.
- Partial billing is done with several **invoices**, each with its own receivable. The real data shows it: one sales order has 3 invoices, each with exactly one receivable.
- Every reader treats the relation per invoice as one: the frontend reads a receivable with `find`, credit/debit notes with `findFirst`.
- No code in `backend/src` calls the route (apart from its own controller), the frontend deliberately does not expose it (`realAccountsReceivableRepository.ts`, and the Stage 2G brief says it "could create duplicate AR rows"), and the audit log is empty.

The one thing the route is evidently used for is creating the **first** receivable for an invoice that has none: the real receivable `a280772a` belongs to a DRAFT invoice, was created 785 seconds after it, has no journal entry and a due date different from the invoice date (the other five were created within 10 ms of their invoice, with a journal). That use still works with the unique index: only a second receivable for the same invoice is refused.

## 3. Real database

Read-only checks: 6 invoices and 6 receivables; every invoice has exactly one receivable; none has more than one; none has zero; no receivable is an orphan. The unique index therefore applies cleanly, and the migration's own pre-flight check re-verifies that at activation time (shown on the scratch database: a duplicate makes it stop with "Cannot enforce one receivable per invoice" and create nothing).

## 4. Decision

The database-level unique index stays. The duplicate-creating route is a **FinanceOS defect** (no existence check, no guard, a 500 instead of a 409 once the index exists). It is recorded here as a separate FinanceOS/platform issue and is out of M1. No FinanceOS code was changed.

## 5. The concurrency boundary of Payment Collection V1

RevenueOS Payment Collection V1 protects:

- collection against collection, on the same receivable (row lock plus a conditional update), including the duplicate-reference race;
- the integrity of its own transaction (collection, ledger credit, receivable figures and event are written together or not at all);
- the running balance of a customer's ledger against other **collections** for the same customer name (advisory lock).

It does **not** claim that other writers of the same rows take part in that protocol. These do not take the receivable lock or the ledger advisory lock, and are unguarded:

- bad-debt write-off (`financeos/bad-debt-writeoff`) changes `balanceAmount` and sets `WRITTEN_OFF`;
- credit notes and debit notes change `outstandingAmount` and `balanceAmount` and append ledger rows;
- `POST /accounts-receivable` and invoice creation insert receivables and ledger rows;
- the duplicate FinanceOS `payment-collections` module is not wired into the application.

What still holds with those writers: a row update by any of them waits for a collection's row lock and the other way round (Postgres row locks), and the collection's conditional update refuses (409 `RECEIVABLE_CHANGED`) rather than overwrite a change that slipped in. What is not guaranteed: an absolute write by one of those services (they set values computed from a read they made earlier) can still overwrite a collection's result, and ledger rows they append are not serialised with collections for the same customer name. Closing that gap belongs to FinanceOS.
