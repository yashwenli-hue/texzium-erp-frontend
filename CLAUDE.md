@AGENTS.md

# Texzium ERP — RevenueOS Frontend

## 1. Scope

You are working ONLY on the RevenueOS frontend of Texzium ERP.

Frontend repository:
`/root/texzium-erp/frontend`

Backend repository:
`/root/texzium-erp/backend`

Do NOT implement frontend screens for Inventory, HR, Finance, Procurement, Manufacturing, or other ERP modules unless explicitly instructed.

---

## 2. Backend is READ ONLY

The existing backend is the functional and data authority for RevenueOS.

You MAY READ the backend to understand:
- Controllers and routes
- DTOs
- Services
- Prisma models/schema
- Enums and statuses
- Relationships
- Validation rules
- Business rules
- Authentication and authorization requirements
- Response/request shapes

You MUST NOT modify anything inside:

`/root/texzium-erp/backend`

Never:
- edit backend source files
- edit controllers
- edit services
- edit DTOs
- edit Prisma schema
- create or modify migrations
- modify backend package files
- modify backend environment files
- modify backend configuration
- change database structure
- delete or rename backend files
- generate backend code
- change backend APIs
- add backend endpoints
- "fix" backend behavior to make the frontend easier
- run commands that intentionally mutate the backend

If a backend limitation or mismatch is discovered, adapt the frontend instead.

If a backend change appears genuinely necessary, STOP and report it to the user before making any change.

---

## 3. Source of truth hierarchy

Use this hierarchy:

1. Existing RevenueOS backend
   - Source of truth for functionality, data, API behavior, validation, permissions, and business rules.

2. RevenueOS frontend prototype
   - Starting source of truth for visual design, UX structure, navigation, layouts, interactions, and presentation.

3. User's explicit instructions
   - Highest authority for requested frontend design or behavior changes.

The prototype is NOT frozen.

The user may request major or minor design changes at any time. Implement those changes in the frontend without treating the original prototype as immutable.

If the prototype assumes functionality that conflicts with the real backend:
- keep the useful UX intent where possible
- adapt the frontend to the real backend
- never change the backend to fit the prototype

If the backend provides RevenueOS functionality that the prototype does not currently expose:
- add an appropriate frontend UI for it
- do not modify the backend

---

## 4. Never invent API contracts

Do not invent:
- API endpoints
- HTTP methods
- request fields
- response fields
- IDs
- enum values
- status values
- relationships
- permissions
- backend capabilities

Before implementing real API integration, inspect the existing backend and/or the verified RevenueOS UI contract.

Frontend types should reflect the actual backend contract.

If something is uncertain, mark it clearly and report it rather than silently inventing behavior.

---

## 5. API architecture

Keep backend communication isolated from presentation components.

Prefer a structure such as:

- `lib/api/`
- `lib/repository/`
- `lib/services/`
- `hooks/`

or an equivalent clean structure appropriate to the existing project.

React components should not contain large amounts of raw API/request logic.

Where a frontend-friendly model differs from the backend DTO, use an explicit mapping/repository layer.

Do not hide backend contract mismatches through unsafe `any` usage.

---

## 6. UI development phases

RevenueOS development may proceed in stages.

### Phase A — UI / interaction work

Local/mock/in-memory data is acceptable while building and testing UX.

During this phase:
- forms should validate
- lists should update
- filters should work
- search should work against the current dataset
- Kanban interactions should work
- task completion should work
- notes/timeline updates should work
- navigation/back buttons should work
- dialogs/forms should behave realistically

Mock data should follow the real RevenueOS domain model and backend field names/shapes as closely as practical.

Do not create mock behavior that contradicts known backend business rules.

### Phase B — Backend integration

Replace mock persistence with the actual RevenueOS backend.

Do not redesign the backend contract from the frontend.

Map frontend state to the real DTOs and response shapes.

Handle:
- loading states
- empty states
- validation errors
- API errors
- authorization/permission errors
- optimistic updates only where safe
- refetch/invalidation after mutations where appropriate

---

## 7. RevenueOS functionality

RevenueOS frontend work may cover the existing RevenueOS capabilities, including:

- Leads
- Lead sources
- Lead assignment
- Lead qualification/rejection
- Lead follow-ups
- Lead status
- Opportunities
- Quotations
- Proforma invoices
- Sales orders
- Sales order payment terms
- Sales order advance receipts
- Commercial approvals
- Sales invoices
- Sales invoice items
- Payment collections
- Payment links
- Customer master
- Customer GST registrations
- Customer statements
- Collection reminders
- Revenue/sales reports

Only expose functionality that is supported by the actual backend or explicitly requested by the user.

---

## 8. Authentication and permissions

Some RevenueOS backend routes require authentication and permissions.

Do not bypass authorization in the frontend.

Where the backend requires permissions, the UI should:
- respect the authenticated user's permissions
- hide or disable actions when appropriate
- handle backend authorization failures gracefully

Do not invent a permission model. Use the existing backend/shared authentication contract.

---

## 9. Design system

Preserve and build upon the established RevenueOS visual language unless the user explicitly requests a change.

Important existing design characteristics include:
- clean enterprise CRM interface
- dark left navigation rail
- light main workspace
- sticky navigation/topbar where appropriate
- Plus Jakarta Sans / Inter typography
- restrained borders and shadows
- rounded cards
- clear status badges
- green RevenueOS accent
- responsive layouts
- desktop, tablet, and mobile support

Create reusable components rather than duplicating UI markup.

Examples:
- buttons
- inputs
- selects
- dialogs
- cards
- tables
- badges
- filters
- search
- pagination
- empty states
- loading states
- confirmation dialogs
- timeline items
- Kanban cards

Do not over-engineer abstractions prematurely.

---

## 10. Responsive behavior

RevenueOS must work across:
- desktop
- tablet
- mobile

Do not treat mobile as an afterthought.

Tables, filters, forms, Kanban boards, navigation, dialogs, and action areas should have intentional responsive behavior.

---

## 11. Data integrity

Never silently fabricate production data.

Clearly distinguish:
- mock/demo data
- data returned from the real backend

Do not make frontend calculations that contradict backend business rules.

For financial values, taxation, quotations, sales orders, invoices, payments, GST, and other business-critical values, prefer backend-provided values when available.

Frontend calculations may be used for presentation or temporary UI state, but must not be treated as authoritative when the backend is authoritative.

---

## 12. Important RevenueOS integration rules

Known backend behavior must be respected.

Examples:

### Leads
Lead creation requires the real backend lead fields and a valid `sourceId`.

Do not replace the backend's source relationship with arbitrary frontend-only source strings during real integration.

Lead lifecycle/status changes must follow the actual backend behavior.

### Lead follow-ups
Follow-ups have backend lifecycle states and dedicated create/complete/reschedule/cancel operations.

Do not invent a different lifecycle.

### Opportunities
Opportunities are linked to leads and contain expected value, probability, expected close date, and backend status.

### Quotations
Quotation creation depends on an opportunity, inventory item, seller GST, buyer GST, quantity, and unit price.

The backend calculates taxation/total values.

Do not assume the frontend can freely invent quotation numbers or tax calculations for persistence.

### Proforma invoices
Proforma invoices originate from quotations.

### Sales orders
Sales orders depend on the backend's proforma/GST/inventory validation and lifecycle.

### Sales invoices
Sales invoices depend on backend sales-order/dispatch conditions and accounting behavior.

### Payments
Payment collections and advance receipts follow backend-specific workflows and statuses.

### Customers
Customer creation uses the backend customer master contract, including its required customer code.

### Reports
Use the actual RevenueOS report endpoints and response shapes. Do not fabricate report data when real integration is active.

These are integration constraints, not reasons to alter the backend.

---

## 13. Error handling

Every real API-driven screen should have appropriate handling for:

- loading
- empty data
- validation errors
- network/API failures
- unauthorized access
- forbidden actions
- not-found records
- mutation failures

Show useful user-facing messages without exposing internal stack traces or sensitive backend details.

---

## 14. Git discipline

This repository is independently version-controlled.

Make meaningful commits at stable milestones.

Examples:

`feat(revenueos): add interactive lead management`

`feat(revenueos): integrate leads API`

`feat(revenueos): add quotation workflow`

`fix(revenueos): handle lead followup errors`

Do not make one enormous commit containing unrelated work.

Before major changes:
- inspect `git status`
- understand the current branch
- preserve working changes

After meaningful milestones:
- run appropriate checks
- commit the stable state

Never commit backend changes to this repository.

---

## 15. Validation

Before considering a frontend milestone complete, run the project's available checks, including as appropriate:

`npm run typecheck`

`npm run build`

`npm run lint`

If a script is unavailable or deprecated, inspect `package.json` and the project's current Next.js instructions before changing tooling.

Do not modify the backend to make frontend checks pass.

---

## 16. Next.js instructions

The repository contains `AGENTS.md`.

Follow its Next.js-specific instructions.

Before making significant framework-level changes, inspect the relevant documentation available in the installed Next.js package as instructed by `AGENTS.md`.

Do not upgrade Next.js, React, TypeScript, Tailwind, or other core dependencies merely for convenience.

Framework upgrades require an explicit reason and should be isolated as deliberate frontend-only changes.

---

## 17. Stop conditions

STOP and ask the user before proceeding if:

- a backend modification appears necessary
- a database schema change appears necessary
- an API endpoint appears missing but is required
- the real backend contract is ambiguous in a business-critical area
- authentication architecture must be changed
- a major frontend architectural rewrite is required
- a framework/dependency upgrade is required for the requested work
- an existing user instruction conflicts with the established project constraints

Do not solve these by guessing.

---

## 18. Core rule

Build a polished, production-quality RevenueOS frontend around the existing backend.

Make the frontend adapt to the backend.

Never make the backend adapt to the frontend.
