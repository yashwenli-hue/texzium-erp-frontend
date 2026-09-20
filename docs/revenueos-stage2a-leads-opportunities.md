# RevenueOS Version A — Stage 2A
## Leads → Opportunities: Real Backend Integration

### Objective

Version A's UI/UX is now approved and should be treated as the current design baseline.

This milestone moves the existing frontend from mock/seed behavior to the real RevenueOS backend for the Lead → Opportunity workflow.

The goal is functional integration, **not a redesign**.

Work only in:

`/root/texzium-erp/frontend`

The backend at `/root/texzium-erp/backend` is strictly **READ ONLY**.

Do not modify backend source, Prisma schema, migrations, configuration, dependencies, or generated backend code.

---

# 1. Governing sources

Read these before making changes:

- `CLAUDE.md`
- `docs/backend-ui-contract.md`
- `docs/revenueos-stage2-plan.md`

The backend contract is authoritative for:

- API routes
- DTO fields
- response shapes
- statuses
- relationships
- permissions
- business rules

Never invent an endpoint, field, status, permission, query parameter, or workflow.

If something is uncertain, inspect the existing backend files/read-only and resolve it from evidence. Do not guess.

---

# 2. Approved UI baseline

The current Version A visual system is approved.

Preserve:

- Light RevenueOS theme
- Sidebar
- Topbar/global search
- Lead Master layout and spacing
- Lead Master columns
- Lead score/status/follow-up badge system
- Lead filters including Received Date
- Lead detail layout
- Opportunity list/detail visual structure
- Existing responsive behavior
- Existing navigation structure

Do NOT use this milestone to redesign the screens.

Do NOT introduce dark mode in this milestone.

Dark mode is a separate future milestone after functional integration is stable.

Small UI changes are allowed only when required for real API states, validation, loading, errors, permissions, or workflow clarity.

---

# 3. Current mock architecture

First inspect the current frontend implementation.

Identify:

- `lib/repository/interfaces.ts`
- `lib/repository/mock/*`
- `lib/repository/real/*`
- `lib/repository/RepositoryProvider.tsx`
- `lib/hooks/useLeads.ts`
- `lib/hooks/useOpportunities.ts`
- Lead pages/components/forms
- Opportunity pages/components/forms
- Current mock entity store
- Existing API/client utilities, if any
- Existing auth/session utilities, if any

Do not delete the mock architecture blindly.

The preferred migration is:

```text
UI
 ↓
domain hooks
 ↓
repository/service boundary
 ↓
real API client
 ↓
RevenueOS backend
```

Keep the mock repository available where it does not interfere with the real implementation.

The real repository should implement the same frontend-facing interface wherever practical.

---

# 4. Lead backend integration

Connect the existing Lead UI to the verified backend.

## 4.1 Lead list

Use the real:

`GET /leads`

The backend protects this route with:

`leads.view`

The Lead list should display backend data rather than seeded mock data.

Preserve the current Lead Master presentation.

The current UI contains fields such as Score, Product/Interest, Follow-up, City, etc.

Some of these were deliberately identified as mock/UI-only during Version A.

Do NOT send mock-only fields to the backend.

Only map fields that actually exist in the backend response.

For fields not provided by the backend:

- remove them from real-data assumptions,
- derive them only when derivation is genuinely supported by backend data,
- or show an honest empty/unavailable state.

Do not fabricate values.

---

# 5. Lead retrieval/detail

Use:

`GET /leads/:id`

Permission:

`leads.view`

The backend-confirmed Lead detail includes relationships for:

- source
- assigned user
- notes
- timelines
- follow-ups
- opportunities

Preserve the current Lead Detail design.

The detail page should stop reading the mock repository once the real repository is active.

---

# 6. Lead creation

Use:

`POST /leads`

Permission:

`leads.create`

Verified CreateLeadDto:

```text
leadCode?
customerName
companyName?
email?
phone
alternatePhone?
sourceId
```

Important:

`sourceId` is a UUID for an existing LeadSource.

The existing prototype contains UI-only fields such as Product/Interest and Remarks.

Those fields are NOT confirmed as CreateLeadDto fields.

Do not send them to the backend.

If the UI still displays those fields for Version A presentation reasons, clearly isolate them as local/mock-only and never include them in the API payload.

The create form must validate the actual backend-required fields.

---

# 7. Lead editing

Use:

`PATCH /leads/:id`

Permission:

`leads.edit`

Verified UpdateLeadDto:

```text
customerName?
companyName?
email?
phone?
alternatePhone?
sourceId?
```

Only send these supported fields.

After a successful update:

- refresh/update the Lead detail
- update the Lead list state where appropriate
- do not rely on mock-store mutation as the source of truth

---

# 8. Lead sources

Use:

`GET /lead-sources`

Lead creation requires a valid `sourceId`.

The source selector must therefore use real LeadSource records rather than hard-coded mock source IDs.

Verified LeadSource fields:

```text
id
name
description?
```

Do not assume source categories exist in the backend.

The current UI may continue showing representative source icons where they are purely visual.

The source ID/name relationship must come from the API.

---

# 9. Lead assignment

Use:

`POST /lead-assignments`

Permission:

`leads.assign`

Use the verified `AssignLeadDto` after inspecting its exact backend definition.

Do not guess the assignment payload.

The Lead Detail should retain the explicit Assign action introduced in Version A.

On success:

- update the displayed assignee
- refresh relevant Lead data
- reflect the backend timeline/event where returned

On 401/403:

- show a clear permission/auth error
- do not pretend assignment succeeded

---

# 10. Qualify / Reject

These are separate backend operations.

## Qualify

`PATCH /lead-assignments/:id/qualify`

Permission:

`leads.qualify`

The backend operation requires a `salesUserId`.

Inspect the exact backend DTO/body before implementing.

Do not use the old prototype's generic stage-change behavior.

## Reject

`PATCH /lead-assignments/:id/reject`

Permission:

`leads.reject`

The backend operation requires a rejection reason.

Inspect the exact body contract before implementing.

The existing confirmation dialog should be preserved.

On success:

- refresh the Lead
- show the backend-supported resulting state
- update timeline/history from real backend data

Never perform a fake local transition when the API request fails.

---

# 11. Lead status updates

Use:

`POST /lead-status`

Permission:

`leads.status.update`

Inspect the exact `UpdateLeadStatusDto` before implementation.

The frontend must use the actual deployed/backend-supported LeadStatus values.

IMPORTANT:

The prototype previously used visual labels such as:

- New
- Contacted
- Qualified
- Proposal
- Negotiation
- Won
- Lost

These are not automatically verified backend statuses.

Do not send those values merely because they exist in the prototype.

Map the actual backend status enum/value set to the approved UI presentation.

---

# 12. Lead follow-ups

Replace the prototype's mock follow-up behavior with the dedicated LeadFollowup API.

Verified routes:

```text
POST   /lead-followups
GET    /lead-followups
GET    /lead-followups/:leadId
PATCH  /lead-followups/:id/complete
PATCH  /lead-followups/:id/reschedule
PATCH  /lead-followups/:id/cancel
```

Permissions include:

- `leads.followups.create`
- `leads.followups.view`

Inspect the exact DTO/body requirements for:

- create
- reschedule
- complete
- cancel

before implementation.

The backend model contains:

```text
leadId
followupDate
remarks?
status
completedAt?
completedById?
createdAt
updatedAt
```

Supported follow-up statuses include:

- PENDING
- COMPLETED
- CANCELLED

The Lead Detail should show real follow-ups.

Implement:

- Create follow-up
- Complete
- Reschedule
- Cancel

Do not use the generic mock Task repository as a substitute for LeadFollowup.

---

# 13. Lead notes and timeline

The backend confirms:

### LeadTimeline

```text
id
leadId
action
remarks?
createdAt
```

### LeadNote

```text
id
leadId
note
createdAt
```

Use these relationships from the real Lead detail response where available.

Do not invent separate backend activity records for Call, Email, Meeting, WhatsApp, etc.

Those may remain presentation concepts unless the backend provides an actual corresponding action/entity.

---

# 14. Opportunity integration

This milestone includes the Lead → Opportunity boundary.

Use:

`POST /opportunities`

Permission:

`opportunities.create`

Verified CreateOpportunityDto fields:

```text
leadId
title
expectedValue
probability
expectedCloseDate
```

The Lead Detail's existing "Create Opportunity" action should create a real backend Opportunity using the selected Lead's ID.

Do not invent additional required backend fields.

---

# 15. Opportunity list

Use:

`GET /opportunities`

Permission:

`opportunities.view`

Replace seeded Opportunity data with real backend data.

Preserve the current Opportunity list design.

Map backend fields into the existing presentation:

- Opportunity
- Lead/customer relationship
- Expected value
- Probability
- Expected close date
- Status
- Related quotation information where actually returned/available

Do not fabricate Customer/Product information if the Opportunity API does not provide it.

---

# 16. Opportunity detail limitation

The verified backend contract confirms:

- `POST /opportunities`
- `GET /opportunities`

It does **not** confirm a separate:

`GET /opportunities/:id`

Do NOT invent one.

If the current Opportunity Detail page requires individual retrieval:

- determine whether the list endpoint provides enough information to populate the detail view,
- or use already-loaded real Opportunity data where safe,
- or show an honest limitation/loading/error state.

Do not create a fake detail endpoint.

---

# 17. Opportunity status / pipeline

The Opportunity model currently has a status field, but the verified API contract does not establish a dedicated Opportunity stage/status mutation endpoint.

Therefore:

**Do not make the Stage 1 drag-and-drop pipeline appear server-persistent unless a verified backend mutation exists.**

If no mutation endpoint exists:

- the pipeline may display real Opportunity data,
- but moving a card must not falsely claim that the backend state changed,
- do not write a fake local state as though it were production persistence,
- explain the limitation honestly in the UI if the action is still exposed.

If the backend exposes a verified status update capability during read-only inspection, use it only after confirming the exact route, permission, DTO and allowed statuses.

Do not modify the backend to enable pipeline persistence.

---

# 18. Authentication

The backend uses JWT authentication and permissions.

Do not invent a second authentication mechanism.

Before wiring requests, inspect the existing frontend auth/session implementation and determine:

- where the token is stored
- how it is attached to API requests
- how login/session state is obtained
- how current-user identity is obtained
- how 401 is handled
- how 403 is handled

If the existing frontend has no real auth integration, establish the smallest clean API/auth boundary required by the verified backend contract.

Do not hard-code the prototype actor such as "RK" as the real authenticated user.

---

# 19. Permissions

Explicitly verified permissions include:

```text
leads.create
leads.view
leads.edit
leads.assign
leads.qualify
leads.reject
leads.followups.create
leads.followups.view
leads.status.update

opportunities.create
opportunities.view
```

Frontend permission checks are UX protection only.

The backend remains authoritative.

Implement permission-aware UI where the authenticated user's permission information is actually available.

Handle 401/403 responses cleanly.

Do not infer permissions from button labels or user role names.

---

# 20. Pagination, filters and sorting

The current prototype uses client-side filtering/sorting/pagination over mock data.

Do not assume the backend supports the same query parameters.

First inspect the actual response/query contract.

If the backend returns the full dataset:

- client-side filtering can remain temporarily.

If verified server-side query parameters exist:

- map them through the repository/API layer.

Do not invent query parameters.

The existing Lead Master filters should continue to work against whatever real dataset is loaded.

The Received Date filter should continue to operate on the actual backend `createdAt`/equivalent field only if that field is present in the response.

---

# 21. Loading/error/empty states

Every real API screen must explicitly handle:

### Loading

Use the existing RevenueOS loading patterns.

### Empty

Examples:

- no leads
- no opportunities
- no follow-ups
- no lead sources

Do not display seeded mock records when the API returns an empty dataset.

### Validation errors

Display backend validation messages in a useful user-facing way.

### 401

Handle expired/missing authentication according to the existing auth contract.

### 403

Explain that the user does not have permission for the requested action.

### 404

For missing Lead records, show an appropriate not-found state.

### 5xx/network errors

Show an honest retry/error state.

Never silently fall back to mock data after a real API failure.

---

# 22. API architecture

Prefer:

```text
UI
 ↓
hooks
 ↓
repository/domain service
 ↓
API client
 ↓
backend
```

Keep API request logic out of presentational components where practical.

Create typed frontend API models/mappers based on the verified contract.

Do not spread backend DTO assumptions throughout UI components.

---

# 23. Mock-data transition

Do not remove every mock repository in one destructive change.

For this milestone:

1. Add/complete the real Lead repository.
2. Add/complete the real Opportunity repository.
3. Switch the relevant hooks/provider to real repositories.
4. Keep mock implementations available for isolated development/testing if useful.
5. Remove mock-only production paths only after the real workflow is verified.
6. Never send mock-only fields to backend DTOs.

The real API becomes the source of truth once the screen is switched to it.

---

# 24. Scope boundary

This milestone DOES include:

- Leads
- Lead sources
- Lead assignment
- Lead qualification/rejection
- Lead status
- Lead follow-ups
- Lead notes/timeline where supported by existing Lead responses
- Lead → Opportunity creation
- Opportunities list
- Opportunity data used by the existing detail/pipeline UI
- Permission-aware states
- API loading/error/empty states

This milestone DOES NOT include:

- Quotations backend integration
- Proforma invoices
- Sales Orders
- Sales Invoices
- Payments
- Customer/GST backend integration
- Reports/dashboard backend integration
- Global search backend integration
- Notifications backend integration
- Dark mode
- Version B
- Backend modifications

Those belong to later milestones.

---

# 25. Validation

Before committing:

```text
npm run typecheck
npm run lint
npm run build
```

Then run the frontend and browser-test the real workflow.

### Lead tests

Verify:

- real Lead list loads
- real Lead detail loads
- real Lead creation works
- real source selector works
- real Lead editing works
- assignment works when permitted
- qualify works when permitted
- reject works when permitted
- follow-up creation works
- follow-up completion works
- follow-up reschedule works
- follow-up cancellation works
- real notes/timeline data appears where supported
- unauthorized actions produce appropriate UX
- API failures do not silently produce mock success

### Opportunity tests

Verify:

- Opportunity list loads from backend
- Create Opportunity from a Lead works
- created Opportunity appears after refresh
- Opportunity fields map correctly
- Opportunity permissions are respected
- pipeline behavior does not falsely claim persistence without a verified mutation endpoint

### Regression tests

Verify the approved Version A visual design remains intact:

- Lead Master spacing unchanged
- badge styling unchanged
- filters unchanged
- date filter unchanged
- sidebar unchanged
- Opportunity visual design unchanged
- responsive behavior unchanged

---

# 26. Git

Create ONE frontend commit for this milestone after all validation passes.

Suggested commit:

```text
feat(revenueos): integrate leads and opportunities
```

Before committing:

```text
git status --short --branch
```

Confirm:

- correct Version A branch
- only frontend files changed
- no backend files modified

Then commit.

Leave the working tree clean.

---

# 27. Stop condition

STOP after this milestone.

Do not continue into Quotations or later Quote-to-Cash modules.

Do not begin dark mode.

Do not begin Version B.

Report:

- what was integrated
- what remains mock-only
- any backend limitations discovered
- validation results
- browser verification results
- commit hash
- confirmation that backend remained untouched
