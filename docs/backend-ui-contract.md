# RevenueOS Backend ↔ Frontend Contract

This is the working integration contract for the Texzium ERP RevenueOS frontend.

## Authority and scope

- Existing RevenueOS backend is authoritative for API behavior, data shape, validation, permissions, statuses, relationships, and business rules.
- RevenueOS prototype is the starting point for visual design and UX. It is not frozen; user-requested frontend changes are allowed.
- If prototype and backend differ, adapt the frontend. Never modify the backend.
- Backend: `/root/texzium-erp/backend`
- Frontend: `/root/texzium-erp/frontend`

## Status labels

- VERIFIED = confirmed during backend discovery.
- UI ASSUMPTION = prototype behavior not yet confirmed for real integration.
- FRONTEND RULE = implementation constraint.

## 1. Core conventions

### IDs
VERIFIED: Main RevenueOS records inspected use UUID primary keys, including Lead, LeadSource, LeadFollowup, Opportunity, Quotation, Customer, CustomerGSTRegistration, ProformaInvoice, SalesOrder, SalesInvoice, AccountsReceivable and PaymentCollection.

FRONTEND RULE: Type IDs as strings. Do not generate persistent production IDs in the frontend.

### Money
VERIFIED: RevenueOS DTOs use numbers and inspected Prisma monetary fields use Float.

FRONTEND RULE: Display INR using the existing formatter where appropriate. Backend values are authoritative for quotation, GST, sales order, invoice and payment totals.

### Dates
VERIFIED: RevenueOS models use DateTime fields.

FRONTEND RULE: Treat API dates as machine-readable values and format them for display. Do not hard-code relative production timestamps.

### Authentication
VERIFIED: Backend has JWT authentication; several RevenueOS controllers use JwtAuthGuard.

FRONTEND RULE: Use the existing auth contract. Do not invent a second authentication system.

## 2. Confirmed RevenueOS routes

- Accounts commercial approval: `POST /create`, `GET /`
- Collection reminders: `GET /check-due`
- Customer GST: `POST /`, `GET /`
- Customer master: `POST /`, `GET /customers`
- Customer statements: `GET /:customerName`
- Lead assignments: `POST /`, `PATCH /:id/qualify`, `PATCH /:id/reject`
- Lead follow-ups: `POST /`, `GET /`, `GET /:leadId`, `PATCH /:id/complete`, `PATCH /:id/reschedule`, `PATCH /:id/cancel`
- Lead sources: `POST /`, `GET /`
- Lead status: `POST /`
- Leads: `POST /`, `GET /`, `GET /:id`, `PATCH /:id`
- Opportunities: `POST /`, `GET /`, `GET /:id`, `PATCH /:id/stage`
- Quotations: `POST /`, `PATCH /:id/status`, `PATCH /:id/revise`, `PATCH /:id/approve`, `POST /:id/convert`, `GET /`
- Proforma invoices: `POST /`, `GET /`, `PATCH /:id/approve`
- Sales orders: `POST /`, `GET /`, `GET /:id/events`
- Sales order payment terms: `POST /create`, `GET /`
- Sales order advance receipts: `POST /create`, `PATCH /:id/verify`, `GET /`
- Sales invoices: `POST /`, `GET /`
- Sales invoice items: `POST /`
- Payment collections: `POST /`
- Payment links: `POST /:salesInvoiceId/generate`
- Sales reports: `GET /funnel`, `/revenue-summary`, `/customer-revenue`, `/lead-conversion`, `/quotation-conversion`, `/lost-opportunities`, `/salesperson-performance`, `/top-products`, `/product-revenue`, `/product-quantity`, `/hsn-revenue`, `/category-revenue`
- Statement PDF: `GET /:customerName`

FRONTEND RULE: Do not invent a global API prefix. The inspected `main.ts` did not show one. Use the actual deployed base URL/config.

## 3. Leads

### Create
VERIFIED CreateLeadDto:
- `leadCode?`
- `customerName`
- `companyName?`
- `email?`
- `phone`
- `alternatePhone?`
- `sourceId`

`sourceId` is a UUID referring to an existing LeadSource.

### Update
VERIFIED UpdateLeadDto:
- `customerName?`
- `companyName?`
- `email?`
- `phone?`
- `alternatePhone?`
- `sourceId?`

### Retrieval
VERIFIED: lead list includes source, assigned user, followups and opportunities.
VERIFIED: lead detail includes source, assigned user, notes, timelines, followups and opportunities.

### Lifecycle
VERIFIED timeline actions include:
- `LEAD_CREATED`
- `LEAD_UPDATED`
- `PRE_SALES_ASSIGNED`
- `LEAD_QUALIFIED`
- `LEAD_REJECTED`
- `STATUS_UPDATED`

FRONTEND RULE: Reflect backend lifecycle; do not invent a separate production lifecycle.

### Status
VERIFIED: Lead model uses a Prisma `LeadStatus` enum.

UI ASSUMPTION: Prototype visually uses New, Contacted, Qualified, Proposal, Negotiation, Won and Lost.

FRONTEND RULE: Those prototype labels are not permission to invent backend enum values. Use actual supported backend status values during integration.

## 4. Lead sources

VERIFIED CreateLeadSourceDto:
- `name`
- `description?`

VERIFIED: lead creation requires a valid `sourceId`.

VERIFIED database discovery found source records including Website, Meta Ads, Google Ads, WhatsApp, IndiaMART, TradeIndia, ExporterIndia, Meta and WHATSAPP.

FRONTEND RULE: Load sources from the backend during real integration rather than relying on hard-coded prototype values.

## 5. Lead assignment and followups

### Assignment
VERIFIED AssignLeadDto:
- `leadId`
- `assignedToId`

VERIFIED permissions:
- `leads.assign`
- `leads.qualify`
- `leads.reject`

### Followups
VERIFIED CreateFollowupDto:
- `leadId`
- `followupDate`
- `remarks?`

VERIFIED lifecycle: `PENDING`, `COMPLETED`, `CANCELLED`.

VERIFIED operations: create, complete, reschedule, cancel.

VERIFIED: invalid repeated lifecycle transitions are rejected by the backend and mutations create timeline entries.

FRONTEND RULE: Use the backend lifecycle; do not create another production status.

## 6. Customers

### Customer master
VERIFIED CreateCustomerDto:
- `customerCode`
- `customerName`
- `panNumber?`
- `email?`
- `phone?`
- `customerType?`

`customerCode` is required and unique.

FRONTEND RULE: New Customer must provide the required customer code during API integration.

### Customer GST
VERIFIED CreateCustomerGstDto:
- `customerId`
- `gstin`
- `legalName`
- `tradeName?`
- `branchName?`
- `stateCode`
- `stateName`
- `addressLine1`
- `addressLine2?`
- `city`
- `pincode`
- `isDefault?`

FRONTEND RULE: Use the real backend fields and validation.

## 7. Opportunities

VERIFIED CreateOpportunityDto:
- `leadId`
- `title`
- `expectedValue`
- `probability`
- `expectedCloseDate`

VERIFIED: opportunity is linked to a lead and creation creates `OPPORTUNITY_CREATED` on the lead timeline.

FRONTEND RULE: select a real lead during API integration.

VERIFIED (backend commit `933231a`): `Opportunity.status` holds the stage, one of `QUALIFIED`, `PROPOSAL`, `NEGOTIATION`, `WON`, `LOST`. New opportunities start at `QUALIFIED`. `PATCH /opportunities/:id/stage` (permission `opportunities.edit`) takes `{ fromStage, toStage }` and is the only way to change it:
- `QUALIFIED` -> `PROPOSAL` or `LOST`; `PROPOSAL` -> `QUALIFIED`, `NEGOTIATION` or `LOST`; `NEGOTIATION` -> `PROPOSAL`, `WON` or `LOST`; `WON` and `LOST` are final (no reopen).
- 400 for a move the rules refuse, 404 for an unknown opportunity, 409 when the stored stage is no longer `fromStage` (someone else moved it first) or the lead is deactivated, 403 without `opportunities.edit`.
- Each move writes an attributed `OPPORTUNITY_STAGE_CHANGED` system event to the lead timeline (actor from the signed-in user).
- A manual migration (`20261006_crm_opportunity_stage.sql`) turns existing `OPEN` rows into `QUALIFIED`. It must be applied before the frontend that reads these values is used against a database; an unrecognised value such as `OPEN` is reported as an error, not shown as a stage.

FRONTEND RULE: the backend is the only source of stage. Do not keep stage in the browser. Send the stage the person was looking at as `fromStage` and reload on a 409.

UI ASSUMPTION: weighted forecast can be displayed as expected value × probability / 100 for presentation. It is not authoritative unless the backend supplies an authoritative forecast.

## 8. Quotations

VERIFIED CreateQuotationDto:
- `opportunityId`
- `quoteDate`
- `inventoryItemId`
- `quantity`
- `unitPrice`
- `sellerGstId`
- `buyerGstId`

VERIFIED backend validates opportunity, inventory item, seller GST, buyer GST and HSN.

VERIFIED backend calculates taxable amount, GST and total. New quotations start as `DRAFT`.

VERIFIED operations:
- update status
- revise
- approve
- convert

VERIFIED: revise sets `REVISED`; approve sets `APPROVED`; convert creates a SalesOrder.

FRONTEND RULE: Do not invent persistent quotation numbers or tax calculations. Use backend-generated quotation code/value when available.

## 9. Proforma invoices

VERIFIED CreateProformaInvoiceDto:
- `quotationId`
- `issueDate`
- `totalAmount`
- `validityDate?`
- `remarks?`

VERIFIED: proforma invoices originate from quotations.
VERIFIED: approval sets customer status to `APPROVED`.

## 10. Sales orders

VERIFIED CreateSalesOrderDto (backend commit `85c3666`):
- `proformaInvoiceId`
- `orderDate`
- `inventoryItemId`
- `orderQty`
- `sellerGstId`
- `buyerGstId`

VERIFIED: creation validates approved proforma, inventory item, seller/buyer GST and inventory availability.

VERIFIED: inventory shortage can create a PurchaseRequisition.
VERIFIED: creation starts at `PENDING_STORE_APPROVAL`.
VERIFIED: the order's total is the approved Proforma's `totalAmount`. The frontend sends no total (a differing client total is refused with 400), shows the Proforma total read-only, and calculates no tax.
VERIFIED: only one Sales Order can be created per Proforma (a second is a 409). Existing duplicates are untouched.
VERIFIED: every Sales Order route (and payment terms, advance receipts, accounts approval) needs a signed-in user and a `salesorders.*` permission: `salesorders.view`, `.create`, `.paymentterms.view|create`, `.advancereceipts.view|create|verify`, `.commercialapproval.view|approve`. Users must sign in again after the permissions are granted.
VERIFIED: `GET /sales-orders/:id/events` (`salesorders.view`) returns the lifecycle history, newest first, with the actor as `{ id, fullName }`. Events exist only for advance verified, advance rejected and accounts approved.

FRONTEND RULE: Do not bypass store approval, GST validation or inventory validation.

## 11. Sales order payment terms

VERIFIED CreateSalesOrderPaymentTermDto:
- `salesOrderId`
- `paymentType`
- `advanceAmount`
- `balanceAmount`
- `creditDays?`
- `dueDate?`
- `remarks?`

## 12. Advance receipts and commercial approval

VERIFIED CreateSalesOrderAdvanceReceiptDto:
- `salesOrderId`
- `receiptDate`
- `amountReceived`
- `paymentMode`
- `referenceNo?`
- `remarks?`

VERIFIED VerifySalesOrderAdvanceReceiptDto (backend commit `85c3666`):
- `verificationStatus` (only `VERIFIED` or `REJECTED`)
- `remarks?` (lifecycle remarks, stored on the event; not general Notes)

VERIFIED: `VERIFIED` moves the order `PENDING_STORE_APPROVAL` -> `PENDING_ACCOUNTS_APPROVAL`; `REJECTED` leaves the order's status unchanged and is recorded as an `ADVANCE_RECEIPT_REJECTED` event. There is no `ADVANCE_REJECTED` status. A receipt can be decided once; a refused state is a 409.

VERIFIED CreateAccountsCommercialApprovalDto:
- `salesOrderId`
- `remarks?`

VERIFIED: commercial approval only works when the order is `PENDING_ACCOUNTS_APPROVAL` (otherwise 409) and moves it to `READY_FOR_DISPATCH_ORDER`.

VERIFIED: the actor of every verification and approval is the signed-in user, recorded on the lifecycle event. `verifiedBy` / `approvedBy` are legacy columns the backend fills from the user's name; the frontend never sends them (nor `actorId`, a status or a total), and the backend rejects them.

FRONTEND RULE: Do not invent status values.

## 13. Sales invoices

VERIFIED CreateSalesInvoiceDto:
- `salesOrderId`
- `dispatchOrderId`
- `invoiceDate`
- `customerName`
- `remarks?`

VERIFIED: invoice creation requires a dispatched order with status `DISPATCHED` and a valid sales order.

VERIFIED: backend performs accounting-side effects including receivable, customer ledger and journal-entry creation.

FRONTEND RULE: accounting posting is backend responsibility. Do not reproduce it in the frontend.

## 14. Sales invoice items

VERIFIED CreateSalesInvoiceItemDto:
- `salesInvoiceId`
- `productId`
- `quantity`
- `rate`
- `taxableAmount`
- `gstAmount`
- `totalAmount`

## 15. Payments and payment links

VERIFIED CreatePaymentCollectionDto:
- `salesInvoiceId`
- `paymentDate`
- `amountReceived`
- `paymentMode`
- `referenceNo`

VERIFIED: payment collection operates against the invoice receivable and backend updates paid/balance/payment status and creates the customer-ledger credit.

Payment link route:
`POST /:salesInvoiceId/generate`

FRONTEND RULE: do not treat a local payment checkbox as authoritative after API integration; reconcile with backend state.

## 16. Collection reminders

VERIFIED route: `GET /check-due`.

VERIFIED backend classifications:
- `UPCOMING` = 1–3 days
- `DUE_TODAY`
- `OVERDUE`

FRONTEND RULE: prefer backend classification when available.

## 17. Customer statements

VERIFIED route: `GET /:customerName`.

VERIFIED: statement logic returns customer ledger information including opening/closing balance information.

FRONTEND RULE: use backend statement results rather than rebuilding balances from frontend data.

## 18. Reports

VERIFIED RevenueOS report capabilities:
- funnel
- revenue summary
- customer revenue
- lead conversion
- quotation conversion
- lost opportunities
- salesperson performance
- top products
- product revenue
- product quantity
- HSN revenue
- category revenue

IMPORTANT BACKEND OBSERVATION: inspected salesperson-performance logic groups invoice data by customer name rather than a conventional salesperson field.

FRONTEND RULE: reflect actual endpoint behavior during integration; do not silently "fix" backend behavior in the frontend.

## 19. Permissions

Explicitly confirmed permissions:
- `leads.create`
- `leads.view`
- `leads.edit`
- `leads.assign`
- `leads.qualify`
- `leads.reject`
- `leads.followups.create`
- `leads.followups.view`
- `leads.status.update`
- `opportunities.create`
- `opportunities.edit`
- `opportunities.view`

FRONTEND RULE: do not infer permissions from labels. Respect authenticated user permissions and handle 401/403 responses.

## 20. Prototype behaviors requiring adaptation

### Search
UI ASSUMPTION: prototype searches client-side across multiple collections.
FRONTEND RULE: okay for mock phase. Do not invent a global-search endpoint.

### Filters/sorting
UI ASSUMPTION: client-side.
FRONTEND RULE: okay for loaded datasets; use server query support only when confirmed.

### Pagination
UI ASSUMPTION: client-side.
FRONTEND RULE: do not assume a specific backend pagination contract until response/query shape is confirmed.

### Quick actions
UI ASSUMPTION: tel/mailto/WhatsApp handoffs.
FRONTEND RULE: opening an external app is not proof that an activity was logged. Do not claim backend logging unless a real endpoint exists.

### Meetings
UI ASSUMPTION: calendar-not-connected state.
FRONTEND RULE: do not invent calendar integration.

### Notifications
UI ASSUMPTION: static/in-memory.
FRONTEND RULE: keep mock-only until a real notification source is confirmed. Do not invent polling/SSE/WebSocket endpoints.

### Timeline
VERIFIED backend has LeadTimeline and LeadNote.

LeadTimeline includes:
- `id`
- `leadId`
- `action`
- `remarks?`
- `createdAt`

LeadNote includes:
- `id`
- `leadId`
- `note`
- `createdAt`

UI ASSUMPTION: prototype presents Call, Email, Meeting, WhatsApp, Quotation, Stage Change and Note.

FRONTEND RULE: these may remain presentation concepts, but map them to real backend data/actions rather than pretending all are independent backend activity records.

## 21. Remaining items to confirm during integration

1. Exact deployed API base URL and reverse-proxy prefix.
2. Exact response envelopes.
3. Exact deployed LeadStatus values.
4. ~~Exact Opportunity status values.~~ Settled: the five stage values above (once the stage migration is applied to the deployed database).
5. Exact Quotation status values accepted by deployed API.
6. Exact SalesOrder status values used throughout UI.
7. Exact verification/payment-mode enumerations where DTOs accept strings.
8. Auth token storage/refresh behavior used by the frontend.
9. Current-user/session response shape.
10. Backend pagination/query conventions.
11. Whether global search exists elsewhere.
12. Whether notification APIs exist elsewhere.
13. Inventory-item lookup endpoint for RevenueOS.
14. Seller/company GST lookup endpoint.
15. Customer GST lookup response shape.
16. Whether any RevenueOS routes are intentionally public.
17. Deployment timezone convention.
18. Whether tenant scoping exists at the API layer.

Do not resolve these by guessing.

## 22. Frontend architecture rule

Keep presentation, frontend/domain types, API client, repository/mapping layer,
hooks/state and formatting utilities separated appropriately.

Mock repositories may expose the same frontend-facing interfaces as real
repositories so the UI can be tested before backend integration.

## 23. Final principle

Frontend owns presentation, UX, local interaction state, API orchestration,
loading/error/empty states, permission-aware UI and responsive behavior.

Backend owns authoritative data, persistence, business rules, validation,
workflow transitions, tax/GST calculations, accounting effects, inventory
validation, authorization and generated outputs.

**Build the RevenueOS frontend around the existing backend.**
**Never change the backend to make the frontend easier.**
