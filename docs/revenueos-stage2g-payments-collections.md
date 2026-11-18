# RevenueOS Stage 2G — Payments & Collections

## Objective

Implement the Stage 2G Payments & Collections frontend as a complete business workflow using the existing backend capabilities honestly.

Business lifecycle:

Lead → Opportunity → Quotation → Proforma Invoice → Sales Order → Dispatch Order → Sales Invoice → Payment / Collection

Stage 2G should build the intended frontend experience now. Do not prematurely omit frontend capabilities merely because an individual backend endpoint is imperfect. Where the backend cannot support a capability cleanly, implement the useful frontend experience only to the extent that it can be represented honestly, and isolate/document the integration limitation.

Do not redesign Version A. Small UI/UX changes are allowed when required by the real payment/collection workflow or backend truth. The broader Version A functional + UI/UX review happens after all functional stages are complete.

## 1. Non-negotiable constraints

- Frontend work only.
- Backend is strictly read-only.
- Do not modify, execute, delete, or inspect/change `create-superadmin.ts`.
- Do not invent backend endpoints.
- Do not invent backend permissions.
- Do not infer unsupported payment states.
- Do not use `SalesInvoice.paymentStatus` as the authoritative payment status.
- Do not create fake persistence for real payment actions.
- Preserve real/mock repository separation used by previous RevenueOS stages.
- One milestone = one Git commit.
- Do not add `Co-Authored-By` trailers to the commit.
- Run TypeScript, lint, build, and relevant runtime/API validation before committing.
- Browser/DOM testing may be unavailable; report that limitation rather than claiming browser validation.

## 2. Verified backend facts

### Live endpoints

**RevenueOS**
- `POST /payment-collections`
  - Body:
    ```ts
    {
      salesInvoiceId: string;
      paymentDate: string;
      amountReceived: number;
      paymentMode: string;
      referenceNo: string;
    }
    ```
  - All fields are required.
- `GET /payment-collections` does not exist and returns 404.
- `POST /payment-links/:salesInvoiceId/generate`
- `GET /customer-statements/:customerName`
- `GET /statement-pdf/:customerName`

**FinanceOS**
- `GET /accounts-receivable` — includes `salesInvoice`
- `GET /customer-ledgers` — includes `salesInvoice`
- `POST /receipt-vouchers/:paymentCollectionId/generate`
- `GET /receipt-pdf/:receiptVoucherId`
- `POST /credit-notes/generate`
- `POST /debit-notes/generate`
- `POST /refund-vouchers/generate`
- `POST /bad-debt-writeoff/generate`
- Collections dashboard:
  - `/collections-dashboard/summary`
  - `/collections-dashboard/aging`
  - `/collections-dashboard/high-risk`
  - `/collections-dashboard/recovery-rate`
  - `/collections-dashboard/customer-ranking`
  - `/collections-dashboard/efficiency`

Do not expose `POST /accounts-receivable` as normal RevenueOS functionality; it is an independent creation path that could create duplicate AR rows.

## 3. Authoritative payment model

Actual relationship:

**SalesInvoice → AccountsReceivable → PaymentCollection[]**

- One invoice can receive multiple payments.
- One payment applies to one invoice through one AccountsReceivable.
- No allocation/junction model exists.
- Partial payments are supported.

Use AccountsReceivable as the source of truth:
- `paidAmount`
- `balanceAmount`
- `paymentStatus`

Do **not** use `SalesInvoice.paymentStatus`; the live payment flow does not update it and real data shows it can remain `PENDING` even when AR is `PAID` or `WRITTEN_OFF`.

Supported statuses only:
- `PENDING`
- `PARTIAL`
- `PAID`
- `WRITTEN_OFF`

Do not invent `FAILED`, `REVERSED`, `CLEARED`, `CANCELLED`, etc.

## 4. Stage 2G primary workflow

### Sales Invoice Detail

Extend the existing Sales Invoice Detail page with a Payments / Accounts Receivable section.

Show:
- invoice total
- paid amount
- outstanding balance
- authoritative payment status
- useful payment/collection context
- Record Payment action

Make it clear that payment status/balance come from AccountsReceivable.

Use existing Version A visual language. Do not create a disconnected FinanceOS mini-application.

### Record Payment

Provide a Record Payment workflow from Sales Invoice Detail.

Fields:
- Payment Date
- Amount Received
- Payment Mode
- Reference Number

Submit to `POST /payment-collections`.

On success:
- refresh authoritative AR data
- show updated paid amount
- show updated outstanding balance
- show updated payment status
- do not fake the resulting state locally

Handle backend validation/business errors visibly.

The backend does not clamp overpayments at zero. Do not silently replace the backend result with a frontend rule. If an overpayment is accepted, represent the returned balance honestly and surface an appropriate warning/notice.

## 5. Accounts Receivable

Create the necessary frontend types/repository/hooks for AccountsReceivable.

Use:
- real repository
- mock repository
- hooks
- domain types
- loading/error/empty states

Because only a list endpoint exists, do not invent an AR detail endpoint.

Mock mode must mirror the same concepts without implying mock persistence is real backend persistence.

## 6. Collection history

There is no `GET /payment-collections`.

Do not build a fake PaymentCollection Master claiming to be a real database list. Do not invent `/payment-collections/:id`.

Provide useful customer collection history through:

`GET /customer-statements/:customerName`

Present it as Customer Collection History / Statement / equivalent truthful wording.

Do not claim ledger remarks are full PaymentCollection records. Payment mode is embedded in free-text remarks and ledger entries have no PaymentCollection ID.

## 7. Receipt workflow

Backend endpoints:
- `POST /receipt-vouchers/:paymentCollectionId/generate`
- `GET /receipt-pdf/:receiptVoucherId`

Before implementing, inspect the actual synchronous payment response and endpoint response shape.

If payment creation provides a usable PaymentCollection ID, an immediate post-payment receipt action may be possible.

Do not provide a durable historical “Generate Receipt” action unless the backend provides a reliable way to resolve the required PaymentCollection ID.

Do not invent a browser-download flow if the backend only writes PDFs to server filesystem.

If unsafe/impossible, isolate the limitation honestly.

## 8. Payment links

Backend:
`POST /payment-links/:salesInvoiceId/generate`

The discovered configured gateway is inactive/manual-bank-transfer style.

Do not assume online checkout exists.

If implementing a payment-link UI, use the real response and clearly distinguish a generated/manual link from a live gateway checkout. If the response is insufficient for a useful browser workflow, document the limitation.

## 9. Credit notes, debit notes, refunds, write-offs

Live endpoints exist for:
- credit notes
- debit notes
- refunds
- bad-debt write-offs

Do not omit them solely because they belong to FinanceOS. Determine whether each has a natural place in the intended RevenueOS Stage 2G workflow.

If implementing:
- use exact live DTOs
- use real endpoints
- model their AR impact correctly
- do not invent states/relationships

If they are better treated as separate FinanceOS workflows, keep them out of the main workflow and document that boundary. Do not create fake/local-only versions merely for visual completeness.

## 10. Collections dashboard

The backend exposes aggregate collections endpoints.

Do not automatically build all six dashboards simply because they exist. Inspect their response shapes and determine whether they naturally fit the existing RevenueOS Dashboard architecture.

If integrated, use the existing Version A dashboard architecture; do not create a second unrelated dashboard system.

If deferred, document why and retain the backend endpoint facts for the later Version A completion audit.

## 11. Permissions

There are no payment/collection permission guards or permission strings.

Do not invent:
- `payments.create`
- `collections.create`
- `receivables.view`
- or similar gates.

Follow existing authentication/session handling, but do not imply authorization exists where the backend has none.

## 12. Real vs mock mode

Real mode:
- real AccountsReceivable GET
- real payment POST
- real customer statement GET
- other real endpoints only where safely integrated

Mock mode:
- representative AR/payment/collection data
- same UI workflow
- no implication that mock persistence is backend persistence

Keep repository interfaces explicit and consistent with previous stages.

## 13. States and navigation

Implement:
- loading
- AR unavailable/error
- payment validation errors
- backend payment errors
- no AR record
- no collection history
- customer statement error
- successful payment confirmation
- refresh/update state after payment

Maintain Version A navigation and document/business trail.

Where useful:
Sales Order → Dispatch Order → Sales Invoice → Accounts Receivable → Collections

Do not invent records or transitions.

## 14. Backend limitations to preserve/document

- no GET PaymentCollection endpoint
- no PaymentCollection detail endpoint
- `SalesInvoice.paymentStatus` is stale/non-authoritative
- AccountsReceivable is authoritative
- overpayment can produce negative balance
- no multi-invoice payment allocation
- ReceiptVoucher has no Prisma relation to PaymentCollection
- receipt PDF is server-side filesystem output
- no payment/collection permission guards
- payment/collection responsibilities are split between RevenueOS and FinanceOS
- FinanceOS PaymentCollections controller is dead/unwired because RevenueOS owns the live route
- CollectionReminders module is dead/unwired

Do not fix backend limitations during this stage.

## 15. Authenticated verification

Use the existing authenticated superadmin credentials available for frontend verification.

Do not touch or execute `create-superadmin.ts`.

Verify read-only data first.

Where safe and necessary, create a real payment through the frontend/API using the live endpoint, then verify:
- payment POST succeeds
- AR `paidAmount` changes
- AR `balanceAmount` changes
- AR `paymentStatus` changes appropriately
- SalesInvoice `paymentStatus` remains irrelevant/stale
- customer statement reflects the payment/ledger activity

Do not create unnecessary duplicate test payments. If no safe real invoice exists for validation, report that rather than creating arbitrary data.

## 16. Validation

Before commit:

```bash
npx tsc --noEmit
npm run lint
npm run build
```

Also perform relevant runtime/API smoke checks.

Report:
- real-mode validation
- mock-mode validation
- browser/DOM limitation if applicable
- backend HEAD before/after
- backend working-tree status
- frontend git status
- exact files changed

Backend must remain unchanged.

## 17. Git discipline

Stage 2G should be ONE frontend commit.

Do not commit until implementation is complete, validation passes, backend is confirmed untouched, the diff has been reviewed, and no unrelated files are included.

Commit message:

`feat(revenueos): integrate payments and collections`

Do NOT add:
`Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`

Do not modify prior commits.

## 18. Scope discipline

Do not redesign Version A during Stage 2G.

Small workflow-driven adjustments are allowed for:
- payment status clarity
- AR visibility
- payment form usability
- collection-history presentation
- truthful backend limitations

Broader visual/design changes belong to the post-Stage-2 Version A completion audit.

At the end, stop and provide a complete implementation report before moving to Stage 2H.
