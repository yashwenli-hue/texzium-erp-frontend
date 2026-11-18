# RevenueOS Stage 2H — Customers & GST

## Objective

Implement Stage 2H of RevenueOS: Customers & GST.

This is a **frontend-only integration milestone** against the existing backend.

The backend must remain strictly read-only during this stage.

The goal is to make the existing Customer Master truthful and useful against the real backend, integrate real customer GST registrations, preserve a coherent mock mode, and clearly expose backend write limitations without inventing capabilities.

Do NOT use this stage to repair backend defects. Backend gaps will be reviewed after all functional frontend stages are complete.

---

## Important workflow principle

We are finishing the functional frontend stages first.

For Stage 2H:

- implement everything the backend genuinely supports now;
- preserve useful frontend workflows where they are valuable;
- do not pretend unsupported writes are persisted;
- do not invent backend relationships, permissions, validation, or endpoints;
- do not redesign the entire Version A UI;
- small UI/UX adjustments are allowed where required for truthful backend integration;
- broader UI/UX and functional completion work happens after Stage 2I.

Backend defects and missing capabilities will be addressed separately after all functional stages are complete.

---

# 1. Backend truth already verified

Backend HEAD at investigation:

`94faa5676f7a6ff4cb356860fa44ceb80fe4b460`

Backend investigation was read-only.

## Customer endpoints

Live RevenueOS customer routes:

- `GET /customers`
- `POST /customers` — currently broken for all payloads because `CreateCustomerDto` has no class-validator decorators while the global ValidationPipe uses `whitelist: true` and `forbidNonWhitelisted: true`.

There is currently:

- no `GET /customers/:id`
- no PATCH
- no PUT
- no DELETE
- no search query
- no filter query
- no sort query
- no pagination
- no activate/deactivate endpoint.

`GET /customers` returns the customer list with nested:

`gstRegistrations`

Customer code is:

- caller-supplied on direct customer creation;
- DB-unique;
- also backend-generated on the vendor `isCustomer=true` path.

Do not expose or invent the vendor creation path as the normal Customer Master creation mechanism.

## Customer model

Authoritative real fields:

- `id`
- `customerCode`
- `customerName`
- `panNumber`
- `email`
- `phone`
- `customerType`
- `isActive`
- `createdAt`
- `updatedAt`
- `isVendor`
- `linkedVendorId`
- `gstRegistrations`

Frontend/mock-only legacy presentation fields that have no real Customer model basis:

- `industry`
- `city`
- `ownerId`
- `ownerName`
- `lifetimeValue`
- `openOrders`
- `status`
- `customerSince`
- `originLeadId`

Do not present these as authoritative backend customer fields.

## Customer GST

Real model:

`CustomerGSTRegistration`

Fields:

- `id`
- `customerId`
- `gstin`
- `legalName`
- `tradeName`
- `branchName`
- `stateCode`
- `stateName`
- `addressLine1`
- `addressLine2`
- `city`
- `pincode`
- `isDefault`
- `isActive`
- `createdAt`
- `updatedAt`

A customer can have multiple GST registrations.

Live routes:

- `GET /customer-gst`
- `POST /customer-gst` — currently broken for the same DTO/ValidationPipe reason.

There is currently:

- no GST detail endpoint
- no PATCH
- no PUT
- no DELETE
- no deactivate/reactivate endpoint.

GST belongs to RevenueOS.

Seller/company GST is different:

- `CompanyGSTRegistration`
- belongs to ComplianceOS
- existing frontend already consumes it for Seller GST in quotations/sales orders.

Do not confuse customer GST with seller/company GST.

## Backend limitations

Document these honestly; do not work around them by inventing behavior:

1. Customer create endpoint is broken.
2. Customer GST create endpoint is broken.
3. Company GST create endpoint is also broken.
4. No Customer update/deactivate/reactivate.
5. No Customer GST update/delete/deactivate.
6. No backend-enforced single default GST registration.
7. No GSTIN format/checksum validation.
8. No Customer search/filter/sort/pagination API.
9. No real Customer foreign-key relationship to Quote-to-Cash documents.
10. Leads, quotations, sales orders, dispatch orders, sales invoices, AR, and customer ledger use customer-name strings rather than a Customer foreign key.

Do not create fake Customer IDs on those documents.

## Permissions

The investigation found **no auth/permission guards** on:

- customer-master
- customer-gst
- company-gst
- vendors

Do not invent permissions such as `customers.create`.

---

# 2. Required frontend implementation

## A. Customer Master list

Replace the current mock-only Customer Master behavior with a real repository-backed implementation.

Real mode:

- load from `GET /customers`;
- show loading state;
- show error state;
- show empty state;
- map real customer fields;
- support client-side search;
- support client-side filters where meaningful;
- support client-side sorting;
- preserve Version A table visual language.

Because the backend has no query parameters, all search/filter/sort behavior must operate on the fetched list.

Do not claim server-side filtering or pagination.

## B. Customer detail

Provide a real Customer detail experience using the existing list-scan pattern because there is no `GET /customers/:id`.

The detail should expose authoritative information such as:

- customer name
- customer code
- PAN
- email
- phone
- customer type
- active/inactive state
- vendor-linked state
- created/updated dates where useful
- GST registrations

Handle:

- loading
- not found
- error

Do not invent detail endpoints.

## C. GST registrations

Display real GST registrations associated with the customer.

Support multiple registrations.

For each registration, present useful real fields including:

- GSTIN
- legal name
- trade name when present
- branch name when present
- state
- address
- default indicator
- active indicator

The UI must not imply that exactly one default is guaranteed by the backend.

If multiple registrations are marked default, display the real data honestly rather than silently correcting it.

## D. Customer create/edit workflow

The existing frontend may contain Customer creation/edit UI.

Do NOT delete the useful workflow merely because the backend currently rejects writes.

In real/connected mode:

- clearly indicate that Customer creation is currently unavailable because the live backend endpoint rejects valid payloads;
- do not send fake successful persistence;
- do not insert a record into the real repository as a fallback;
- do not route through `/vendors` to manufacture a Customer;
- do not claim success.

If the existing Version A UI has a create form, preserve it where reasonable but make its real-mode limitation explicit and user-friendly.

If mock mode supports creation, it may continue to demonstrate the intended workflow.

The same principle applies to Customer GST creation.

Do not build fake edit/delete persistence.

## E. Customer GST creation

If an existing GST form/workflow exists:

- preserve it in mock mode if appropriate;
- in real mode, clearly explain that persistence is unavailable because `POST /customer-gst` is currently broken;
- never report a successful real save.

Do not invent an alternative endpoint.

## F. Customer → Quote-to-Cash references

Do not invent relational joins.

The backend has no Customer foreign key on:

- Lead
- Opportunity
- Quotation
- Proforma
- Sales Order
- Dispatch Order
- Sales Invoice
- Accounts Receivable
- Customer Ledger

Do not present these as guaranteed Customer relationships.

If existing frontend screens have customer-name-based references, retain them only as name-based/contextual information and do not label them as foreign-key relationships.

---

# 3. Repository architecture

Follow the established Stage 2A–2G architecture.

Create/use:

- domain types
- repository interfaces
- real repository implementation
- mock repository implementation
- mappers where required
- hooks for data access

Keep real and mock behavior explicitly separated.

Do not bypass repositories with direct fetch calls inside pages/components if the existing architecture provides a repository layer.

Use the existing backend proxy/auth architecture.

Do not expose backend URLs directly in the browser.

---

# 4. Data model discipline

Separate:

### Authoritative real Customer data

- id
- customerCode
- customerName
- panNumber
- email
- phone
- customerType
- isActive
- createdAt
- updatedAt
- isVendor
- linkedVendorId
- gstRegistrations

### Authoritative real GST data

- id
- customerId
- gstin
- legalName
- tradeName
- branchName
- stateCode
- stateName
- addressLine1
- addressLine2
- city
- pincode
- isDefault
- isActive
- createdAt
- updatedAt

Do not silently map legacy mock fields into these real fields.

Legacy fields may remain in mock/presentation models only where needed for compatibility, but they must not be represented as backend truth.

---

# 5. UX requirements

Stay within the Version A visual language.

Allowed:

- small layout corrections required by real data;
- clearer empty/loading/error states;
- backend limitation notices;
- sensible customer/GST detail presentation;
- permission-style messaging only where supported by actual backend facts.

Avoid:

- wholesale redesign;
- new visual system;
- dark mode;
- unrelated navigation changes;
- speculative workflows.

The user-facing wording for backend write limitations should be concise and factual.

Example:

> Customer creation is unavailable in connected mode because the current backend endpoint is rejecting valid customer payloads. Existing customers can still be viewed and searched.

Equivalent wording is fine.

Do not expose internal implementation details such as DTO decorators or Prisma terminology to normal users.

---

# 6. Mock mode

Mock mode should remain coherent.

Where mock Customer/GST creation already works:

- preserve it;
- keep it clearly separate from real mode;
- do not make mock behavior look like backend persistence.

Real mode must remain truthful even if that means a disabled/unavailable action.

---

# 7. Do not fix backend gaps in this stage

Absolutely do NOT:

- edit backend DTOs;
- add validation decorators;
- add customer endpoints;
- add GST endpoints;
- add permissions;
- add Customer foreign keys;
- change Prisma schema;
- execute database repair scripts;
- modify backend data;
- modify `create-superadmin.ts`.

We will address backend gaps after all functional frontend stages are complete.

---

# 8. Validation

Before commit:

Run:

- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`

Also perform reasonable frontend runtime/API verification against the existing backend.

Do not create or mutate backend records for testing.

Read-only verification is allowed.

Browser/DOM testing may remain unavailable due to the existing environment limitation. If so, report it honestly rather than claiming browser verification.

---

# 9. Git / commit discipline

One milestone = one commit.

Before committing:

- inspect `git status`;
- ensure only Stage 2H source files are staged;
- do not stage docs unless explicitly requested;
- do not stage `.save` files;
- do not stage `tsconfig.tsbuildinfo`;
- do not stage unrelated concurrent work;
- do not modify backend files.

Commit exactly:

`feat(revenueos): integrate customers and GST`

Do NOT add:

`Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`

After committing, report:

1. commit hash
2. exact files committed
3. validation results
4. real-mode behavior
5. mock-mode behavior
6. backend limitations surfaced
7. backend HEAD/status confirmation
8. confirmation that `create-superadmin.ts` was untouched
9. any browser-testing limitation

STOP after the commit.

Do not proceed to Stage 2I automatically.
