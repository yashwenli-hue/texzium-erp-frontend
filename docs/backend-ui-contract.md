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
- Quotations: `POST /`, `GET /`, `GET /:id/events`, `PATCH /:id/revise`, `PATCH /:id/approve`, `PATCH /:id/reject` (`PATCH /:id/status` is removed; `POST /:id/convert` is retired and answers 410 without reading or writing anything)
- Proforma invoices: `POST /`, `GET /`, `GET /:id/events`, `PATCH /:id/approve`, `PATCH /:id/cancel`
- Sales orders: `POST /`, `GET /`, `GET /:id/events`, `POST /:id/cancel`
- Sales order payment terms: `POST /create`, `GET /`
- Sales order advance receipts: `POST /create`, `PATCH /:id/verify`, `PATCH /:id/retract-verification`, `GET /`
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

## 6. Customers (Customer Management V1: backend bb9f81f, 70a8609, 7c10ab0)

A Customer is the commercial identity of the party RevenueOS sells to. It is active or inactive; its code is assigned by the server (`CUST-000001`, ...) and never changes; it has GST registrations, one of which (among the active ones) is its default; and a deal belongs to it through `Opportunity.customerId`, from which the quotation, Proforma and Sales Order under the deal take their customer. Legacy opportunities have no customer until a person links one. Nothing is back-filled.

### Customer master (all routes need a signed-in user and one permission)
| Route | Permission | Notes |
|---|---|---|
| `GET /customers` | `customers.view` | every customer, registrations nested (default first), `deactivatedBy {id, fullName}` while inactive |
| `GET /customers/:id` | `customers.view` | same shape |
| `POST /customers` | `customers.create` | body `customerName`, `customerType?`, `panNumber?`, `email?`, `phone?`. **No `customerCode`** (rejected 400). PAN is upper-cased (`ABCDE1234F`), email lower-cased, blank optionals are dropped |
| `PATCH /customers/:id` | `customers.edit` | any of the five fields; `null`/blank clears an optional one; the name cannot be cleared; an unchanged edit records nothing; **409 `CUSTOMER_INACTIVE`** while inactive |
| `PATCH /customers/:id/deactivate` | `customers.deactivate` | body `{ reason }` (1-500, required); 409 `ALREADY_INACTIVE` |
| `PATCH /customers/:id/reactivate` | `customers.deactivate` | body `{ remarks? }`; 409 `ALREADY_ACTIVE` |
| `GET /customers/duplicate-check?customerName&panNumber&phone&email&excludeCustomerId` | `customers.view` | `{ blocking: [...], warnings: [...] }`, each `{ id, customerCode, customerName, isActive, reasons: PAN|NAME|PHONE|EMAIL[] }`; at least one field |
| `GET /customers/:id/events` | `customers.view` | newest first; `actor {id, fullName}`, `gstRegistration {id, gstin, branchName, legalName}`, `opportunityId`, `changes {field: {from, to}}` |
| `GET /customers/:id/overview` | `customers.view` | the chain by id: `customer`, `quotingReadiness {ready, reasons[]}`, `opportunities`, `quotations`, `proformas` (+`isExpired`), `salesOrders`, `invoices` (+`receivables`), `totals`, `legacyMatches` |

Duplicates: a second customer with the same **PAN** or the same **name** (case, surrounding and repeated space ignored; no fuzzy matching) is refused with **409** `DUPLICATE_PAN` / `DUPLICATE_NAME`, carrying `existing {id, customerCode, customerName, isActive}`. The same phone or email only warns (duplicate-check). Customers created by the OperationsOS vendor flow are not checked.

`totals` (all as recorded; invoices and receivables are FinanceOS data): `approvedQuotationValue` (APPROVED quotations), `orderedValue` (orders not CANCELLED), `invoicedValue` (invoices not DRAFT), `collectedValue` / `outstandingValue` (their receivables; outstanding leaves out WRITTEN_OFF). Opportunities not linked to the customer are never counted; `legacyMatches` lists unlinked opportunities whose lead carries the customer's name, as a guess for a person to link.

### Customer GST registrations
| Route | Permission | Notes |
|---|---|---|
| `POST /customer-gst` | `customers.gst.manage` | body `customerId`, `gstin`, `legalName`, `tradeName?`, `branchName?`, `addressLine1`, `addressLine2?`, `city`, `pincode`, `isDefault?`. **No `stateCode`/`stateName`** (rejected 400): the server reads the state from the GSTIN |
| `PATCH /customer-gst/:id` | `customers.gst.manage` | `legalName`, `tradeName`, `branchName`, `addressLine1`, `addressLine2`, `city`, `pincode`; **the GSTIN and the state cannot be edited** |
| `PATCH /customer-gst/:id/deactivate` | `customers.gst.manage` | body `{ reason }` required; 409 `GST_IS_DEFAULT` while it is the default and another is active |
| `PATCH /customer-gst/:id/reactivate`, `/default` | `customers.gst.manage` | reactivating makes it the default if none is |
| `GET /customer-gst`, `GET /customer-gst/:id` | `customers.view` | each with a limited `customer {id, customerCode, customerName, isActive}` |

Rules: GSTIN = 15 characters (`27ABCDE1234F1Z5`), the first two a **state code that can be issued**, characters 3-12 the holder's PAN, which must equal the customer's PAN when it has one (400 `GSTIN_PAN_MISMATCH`); the check digit is **not** verified. A GSTIN is registered to one customer (409 `DUPLICATE_GSTIN`, with `existing`). PIN code 6 digits. A customer with any active registration has exactly one active default; the first becomes the default. Registrations are never deleted. An inactive customer's registrations cannot change (409 `CUSTOMER_INACTIVE`). A customer's PAN cannot be changed to one that disagrees with an active registration (409 `PAN_MISMATCHES_GST`).

### Selling to a customer
- `PATCH /opportunities/:id/customer` (`opportunities.edit`) body `{ customerId }` links or changes, `{ customerId: null }` removes. The customer and the lead must be active. **An opportunity that has a customer and a quotation keeps its customer** (409 `OPPORTUNITY_CUSTOMER_LOCKED`); one without a customer can be given one even if it has documents, unless one uses another customer's registration (409 `OPPORTUNITY_GST_OF_ANOTHER_CUSTOMER`). `POST /opportunities` also accepts an optional `customerId`. `GET /opportunities` and `/:id` carry `customerId` and `customer {id, customerCode, customerName, isActive}`.
- `POST /quotations`: the opportunity must have a customer (409 `OPPORTUNITY_NOT_LINKED`), who is active (409 `CUSTOMER_INACTIVE`); the buyer registration must be that customer's own (400 `BUYER_GST_NOT_CUSTOMERS`) and active (409 `GST_INACTIVE`); the seller registration must be active.
- `POST /proforma-invoices` and `POST /sales-orders`: refused for an inactive customer (409 `CUSTOMER_INACTIVE`). A Sales Order must use the buyer and seller registrations of its Quotation when it has them (400 `BUYER_GST_DIFFERS` / `SELLER_GST_DIFFERS`), and, under an opportunity with a customer, an active buyer registration of that customer. Legacy (unlinked) opportunities behave as before.

FRONTEND RULES: never send `customerCode` or a state; show the server's message for every 409; reload after a 409 (the record moved on); the customer comes from the opportunity, so the quotation form offers only that customer's registrations; Key Contacts are mock-only and are not shown for a real customer.

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

VERIFIED (backend commit `1246647`, Quotation Lifecycle V1): `status` has four values. A quotation is created `DRAFT`.
- `PATCH /:id/revise` `{ taxableAmount, remarks? }` (`quotations.edit`): the backend recomputes GST from the percentage the quotation already carries and sets the total (taxable amount + GST, rounded to paise). The frontend never sends a total. Moves the quotation to `REVISED` from `DRAFT`, `REVISED`, or an `APPROVED` quotation that has no active Proforma (not cancelled) and no Sales Order that is not cancelled (reached directly or through one of its Proformas); otherwise 409.
- `PATCH /:id/approve` `{ remarks? }` (`quotations.approve`): `DRAFT` or `REVISED` to `APPROVED`. Not repeatable (409).
- `PATCH /:id/reject` `{ reason }` (`quotations.reject`): `DRAFT` or `REVISED` to `REJECTED`, final. The reason is mandatory. An approved quotation cannot be rejected (revise it first).
- A quotation whose stored tax breakdown does not add up (taxable amount + GST is not the total, or GST is not the stated percentage of the taxable amount, or the taxable amount is 0) is a legacy row: it can be neither revised nor approved (409) and is never repaired. Real data has such rows (approved before the lifecycle, with taxable amount and GST stored as 0).
- `GET /:id/events` (`quotations.view`) returns the lifecycle history, newest first, actor as `{ id, fullName }`: `QUOTATION_CREATED`, `QUOTATION_REVISED` (with `previousTaxableAmount`, `newTaxableAmount`, `previousTotalAmount`, `newTotalAmount`), `QUOTATION_APPROVED`, `QUOTATION_REJECTED` (reason in `remarks`). No history is back-filled: a quotation that predates the lifecycle has none.
- Every route needs a signed-in user and one permission: `quotations.view` (list, events), `.create`, `.edit`, `.approve`, `.reject`. Users must sign in again after the permissions are granted.
- There is no EXPIRED and no CONVERTED status, and no version history. A quotation never converts into a Sales Order directly: `POST /:id/convert` is retired.

FRONTEND RULE: Do not invent persistent quotation numbers or tax calculations. The live preview in the revise dialog only previews what the backend then recomputes; the backend's figures are the ones shown afterwards.

## 9. Proforma invoices

VERIFIED CreateProformaInvoiceDto (backend commit `1d0b1dc`, Proforma Lifecycle V1):
- `quotationId`
- `issueDate`
- `validityDate?`
- `remarks?`
- `totalAmount?` (compatibility only: it must equal the quotation's total within a paisa or the request is refused with 400; the frontend does not send it)

VERIFIED: a Proforma is created `PENDING` from an `APPROVED` quotation, and its total is the quotation's (derived by the backend; never typed). A quotation can have only one active (not cancelled) Proforma (409).
VERIFIED: the status lives on `customerStatus`: `PENDING`, `APPROVED`, `CANCELLED`.
- `PATCH /:id/approve` `{ remarks? }` (`proformas.approve`): `PENDING` to `APPROVED`; refused once expired (409); not repeatable.
- `PATCH /:id/cancel` `{ reason }` (`proformas.cancel`): `PENDING` or `APPROVED` to `CANCELLED`, final. The reason is mandatory. Refused (409) while a Sales Order that is not cancelled references the Proforma.
- Expiry is not a status: `validityDate` is valid through the end of that calendar day (UTC); `GET /` reports `isExpired`. An expired Proforma can be neither approved nor turned into a Sales Order, but can still be cancelled.
- `GET /:id/events` (`proformas.view`): `PROFORMA_CREATED`, `PROFORMA_APPROVED`, `PROFORMA_CANCELLED` (reason in `remarks`), newest first. No history is back-filled.
- Every route needs a signed-in user and one permission: `proformas.view` (list, events), `.create`, `.approve`, `.cancel`.
- Existing Proformas are not repaired (some are already past their validity date).

## 10. Sales orders

VERIFIED CreateSalesOrderDto (backend commit `85c3666`):
- `proformaInvoiceId`
- `orderDate`
- `inventoryItemId`
- `orderQty`
- `sellerGstId`
- `buyerGstId`

VERIFIED: creation validates approved proforma, inventory item, seller/buyer GST and inventory availability. Since backend commit `1d0b1dc` it also requires the Proforma not to be expired, its quotation to still be `APPROVED`, and the two totals to agree within a paisa (409 otherwise), and it is the ONLY way a Sales Order is created: the old quotation conversion route and the AdminOS workflow trigger no longer create orders. Orders with status `OPEN` are legacy rows created by those routes; they are left as they are.

VERIFIED: inventory shortage can create a PurchaseRequisition.
VERIFIED: creation starts at `PENDING_STORE_APPROVAL`.
VERIFIED: the order's total is the approved Proforma's `totalAmount`. The frontend sends no total (a differing client total is refused with 400), shows the Proforma total read-only, and calculates no tax.
VERIFIED: only one non-cancelled Sales Order can exist per Proforma (a second live one is a 409). A cancelled order stays in history and no longer blocks a replacement. Existing duplicates are untouched.
VERIFIED: every Sales Order route (and payment terms, advance receipts, accounts approval) needs a signed-in user and a `salesorders.*` permission: `salesorders.view`, `.create`, `.cancel`, `.paymentterms.view|create`, `.advancereceipts.view|create|verify|retract`, `.commercialapproval.view|approve|retract`. Users must sign in again after the permissions are granted.
VERIFIED: `GET /sales-orders/:id/events` (`salesorders.view`) returns the lifecycle history, newest first, with the actor as `{ id, fullName }`. Events exist only for advance verified, advance rejected, accounts approved, advance verification retracted, accounts approval retracted and Sales Order cancelled (`ADVANCE_RECEIPT_VERIFIED`, `ADVANCE_RECEIPT_REJECTED`, `ACCOUNTS_APPROVED`, `ADVANCE_RECEIPT_VERIFICATION_RETRACTED`, `ACCOUNTS_APPROVAL_RETRACTED`, `SALES_ORDER_CANCELLED`). Each carries `result`, `fromStatus`, `toStatus`, `referenceId` (the receipt or approval; none for a cancellation) and, for a retraction or cancellation, the reason as `remarks`. Events are never edited.

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

### Retract and cancel (backend commits `e5536a8`, `483e546`, `075fba5`)

VERIFIED routes, each with the body `{ reason }` only: `PATCH /sales-order-advance-receipt/:id/retract-verification` (`salesorders.advancereceipts.retract`), `POST /accounts-commercial-approval/:id/retract` (`salesorders.commercialapproval.retract`) and `POST /sales-orders/:id/cancel` (`salesorders.cancel`). `reason` is mandatory, trimmed, 1-500 characters (otherwise 400); the request cannot name an actor or a status. The actor is the signed-in user.

VERIFIED responses: `{ message, receipt, salesOrder: { id, status } }`, `{ message, approval, salesOrder }` and `{ message, salesOrder }`.

VERIFIED rules:
- Retract verification: `PENDING_ACCOUNTS_APPROVAL` -> `PENDING_STORE_APPROVAL`. The receipt goes back to `PENDING` with `verifiedBy`/`verifiedAt` cleared. Not possible while the order is `READY_FOR_DISPATCH_ORDER` (retract the approval first).
- Retract approval: `READY_FOR_DISPATCH_ORDER` -> `PENDING_ACCOUNTS_APPROVAL`. The approval row is kept with `status` `RETRACTED`; a later approval is a new row.
- Cancel: from `PENDING_STORE_APPROVAL`, `PENDING_ACCOUNTS_APPROVAL` or `READY_FOR_DISPATCH_ORDER` to `CANCELLED`. `CANCELLED` is terminal: no reopen, no delete. Receipts (a `VERIFIED` advance included), payment terms and approvals are left exactly as they are; nothing is refunded or reversed.
- All three are refused with 409 for legacy `OPEN` and the OperationsOS statuses, for a step the workflow did not record, and once the order has a Dispatch Order, Dispatch or Sales Invoice. Cancel is also refused once an approved Purchase Requisition, a Purchase Order or reserved stock exists.
- A `CANCELLED` order refuses verify, reject, approve, retract, cancel, and creating payment terms or advance receipts (409). Payment terms and advance receipts can only be recorded while the order is `PENDING_STORE_APPROVAL` or `PENDING_ACCOUNTS_APPROVAL`.
- A Sales Invoice cannot be created for a `CANCELLED` Sales Order (409, "A cancelled Sales Order cannot be invoiced.").
- `GET /sales-reports/funnel` and `/quotation-conversion` leave cancelled orders out of `salesOrders`/`convertedToSalesOrders` and report `cancelledSalesOrders`; the frontend does not call them.

FRONTEND RULE: the UI offers each action only for the order status it fits, with its permission (disabled, with the reason, without it), and always asks for a reason. It never changes the order locally: after a success, or a 409, it reloads the order, records and history from the backend and shows the backend's message. A cancelled order shows a banner and no workflow action.

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
