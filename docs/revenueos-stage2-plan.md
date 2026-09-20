# RevenueOS Stage 2 — Functional Integration Plan

## Purpose

Stage 1.3 established the RevenueOS visual foundation and UX structure. Stage 2 moves the frontend from primarily prototype/mock behavior toward real RevenueOS functionality using the existing NestJS/Prisma backend.

This is a planning map, not an implementation task. Do not give this document directly to Claude as an implementation brief.

## Governing rules

- Work only in `/root/texzium-erp/frontend`.
- Backend is READ ONLY.
- `CLAUDE.md` and `docs/backend-ui-contract.md` are authoritative.
- Never invent backend endpoints, DTO fields, query parameters, permissions, or workflows.
- If the backend does not support a UI action, do not modify the backend to make the prototype work.
- Prefer real backend integration wherever the verified backend already supports it.
- Keep mock-only behavior isolated from real API/data state.
- Preserve the approved Stage 1.3 visual system unless functionality requires a UI adjustment.
- Give each major milestone its own frontend Git commit.

## 1. Stage 2A — Lead lifecycle integration

Connect the existing Lead UI to the real backend:

- Lead list
- Lead detail
- Lead creation/editing
- Lead sources
- Assignment
- Qualification/rejection
- Status updates
- Follow-ups
- Timeline/history

Verified backend areas: `leads`, `lead-sources`, `lead-assignments`, `lead-status`, `lead-followups`.

Verified lifecycle examples:
- Creation → `LEAD_CREATED`
- Assignment → `PRE_SALES_ASSIGNED`
- Qualification → `SALES_ASSIGNED`
- Rejection → `REJECTED`

Follow-ups: PENDING, COMPLETED, CANCELLED.

Respect verified permissions including `leads.create`, `leads.view`, `leads.edit`, `leads.assign`, `leads.qualify`, `leads.reject`, `leads.followups.create`, `leads.followups.view`, and `leads.status.update`.

Do not create a separate frontend state machine that conflicts with backend state.

## 2. Stage 2B — Opportunities

Connect Opportunities to the backend:

- Create
- List
- Detail
- Lead relationship
- Expected value
- Probability
- Expected close date
- Status
- Related quotations

Verified endpoints include `POST /opportunities` and `GET /opportunities`.

Verified create fields: `leadId`, `title`, `expectedValue`, `probability`, `expectedCloseDate`.

Do not invent an opportunity-stage mutation endpoint. The Stage 1 visual pipeline must not be treated as server-persistent unless a verified backend operation supports it.

## 3. Stage 2C — Quotations

Connect the quotation workflow:

Opportunity → Quotation → Revise → Approve → Convert.

Use verified create/list/revise/approve/convert operations.

Verified lifecycle:
- DRAFT
- REVISED
- APPROVED
- CONVERTED

Do not substitute screenshot-only statuses such as Sent, Viewed, Accepted, Rejected, or Expired.

## 4. Stage 2D — Proforma Invoices

Integrate create/list/approve.

Verified fields include:
- `quotationId`
- `issueDate`
- `totalAmount`
- `validityDate?`
- `remarks?`

Workflow: approved quotation → proforma → approval → sales order.

## 5. Stage 2E — Sales Orders and approval gates

Integrate Sales Orders, payment terms, advance receipts, and commercial approval.

Verified workflow includes:
- Approved proforma required
- Stock/GST validation
- `PENDING_STORE_APPROVAL`
- Advance receipt verification → `PENDING_ACCOUNTS_APPROVAL`
- Commercial approval → `READY_FOR_DISPATCH_ORDER`

Expose a clear frontend approval stepper reflecting actual backend state. Do not pretend a gate is complete.

## 6. Dispatch boundary

Dispatch is outside RevenueOS and belongs to OperationsOS. Sales Invoice creation requires a valid Dispatch Order.

Do not invent a Dispatch UI/API inside RevenueOS. Surface the dependency and use only a verified integration. If no frontend-accessible dispatch contract exists, treat it as an integration blocker.

## 7. Stage 2F — Sales Invoices

After dispatch dependency is understood, integrate:
- Create sales invoice
- List sales invoices
- Create invoice items

Backend owns invoice/GST/receivable/ledger/journal calculations. Frontend should display backend results rather than reproducing accounting logic.

## 8. Stage 2G — Payments and collections

Integrate:
- Payment collections
- Payment links
- Collection reminders
- Customer statements
- Outstanding/due/overdue presentation

Do not reproduce receivable calculations locally when backend state is authoritative.

## 9. Stage 2H — Customers and GST

Integrate customer master and customer GST functionality.

Customer detail should eventually expose:
- Master data
- GST information
- Contacts
- Orders
- Invoices
- Payments
- Statement
- Relevant activity

Use only verified Customer/CustomerGST fields.

## 10. Stage 2I — Real dashboard and analytics

Once domain workflows are connected, replace mock dashboard/report values with backend data.

Verified report areas include:
- Funnel
- Revenue summary
- Customer revenue
- Lead conversion
- Quotation conversion
- Lost opportunities
- Salesperson performance
- Top products
- Product revenue/quantity
- HSN revenue
- Category revenue

The Analytics section requested during design review can then expose these reports in a coherent UI.

## 11. Global search

The topbar search currently exists as UI. Before integrating it, verify whether a backend global-search capability exists. If not, do not invent one.

## 12. Frontend API architecture

Prefer:

```text
UI components
    ↓
RevenueOS domain hooks/services
    ↓
API client
    ↓
Existing NestJS backend
```

Keep API logic out of presentational components where practical. Use typed request/response models based on the verified contract. Handle loading, validation, permission, auth/session, empty, network, and server errors explicitly. Never silently turn API failures into mock success.

## 13. Authentication and permissions

Backend JWT + permissions remain authoritative. Frontend permission checks are UX protection, not security. Never assume a user can perform an action because a button exists.

## 14. Mock-data strategy

Do not delete all mock data at once.

For each screen:
1. Identify mock data.
2. Replace it with real API data where a verified endpoint exists.
3. Keep mock-only fields isolated.
4. Remove mock behavior after the real workflow is stable.
5. Never send frontend-only fields to strict backend DTOs.

## 15. Implementation sequence

Recommended milestones:

1. **Stage 2A** — Lead backend integration
2. **Stage 2B** — Opportunity integration
3. **Stage 2C** — Quotation lifecycle
4. **Stage 2D** — Proforma + Sales Order foundation
5. **Stage 2E** — Approval gates + payment terms/advance receipts
6. **Stage 2F** — Dispatch dependency + Sales Invoice
7. **Stage 2G** — Payments + collections + statements
8. **Stage 2H** — Customer/GST integration
9. **Stage 2I** — Real dashboard + analytics/reporting

Each milestone gets a focused `.md` implementation brief, validation, browser verification, one Git commit, and backend-untouched confirmation.

## 16. First implementation target

The first implementation brief should be **Stage 2A — Lead backend integration**.

Before implementing it, inspect the current frontend and map:
- Lead API/repository abstractions
- Mock data usage
- Lead list
- Lead creation form
- Lead detail
- Assignment
- Qualify/reject
- Follow-ups
- Source selectors
- Auth/permissions
- Loading/error states

Compare each against `docs/backend-ui-contract.md`.

The Stage 2A brief should narrowly replace/bridge mock Lead behavior with verified backend capabilities while preserving the approved Stage 1.3 design.

## Stop condition

Do not start Stage 2B until Stage 2A is implemented, browser-verified, typechecked, linted, production-built, committed, and the backend is confirmed untouched.
