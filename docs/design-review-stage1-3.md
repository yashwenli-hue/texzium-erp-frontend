# RevenueOS Stage 1.3 --- Design & UX Refinement Brief

## Governing rules

-   Work ONLY in `/root/texzium-erp/frontend`.
-   RevenueOS frontend only.
-   Backend is READ ONLY. Do not modify backend files, Prisma schema,
    APIs, DTOs, migrations, or backend Git state.
-   Use `CLAUDE.md` and `docs/backend-ui-contract.md` as governing
    project rules.
-   Backend behavior/contracts are authoritative. Do not invent
    endpoints or fields.
-   Preserve working RevenueOS functionality unless this brief
    explicitly changes it.
-   Validate the work and create ONE frontend milestone commit when
    complete.
-   Stop after implementation, validation, and commit.

## Objective

Refine RevenueOS after Stage 1.2 using the Stage 1.3 design review. This
is primarily a UX/UI and interaction pass. Before changing any metric,
status, field, or workflow, verify it against the backend UI contract.

## 1. Dashboard

### Account/profile

The account is already visible globally in the top-right/topbar. Remove
the persistent account/profile block from the sidebar. Keep the global
topbar account/profile functionality.

### Sidebar collapse

Move the collapse/expand control to a small button at the top-right edge
of the sidebar, separated from navigation. Preserve expanded/collapsed,
tooltip, accessibility, and responsive behavior. Do not create a second
competing control.

### Today's Focus

Show only the 5 most important items by default. `View all` should
expose the rest. Each item should show activity type/icon, title,
customer/company, time/date, and whether it is overdue, due today, or
upcoming. Use available activity/follow-up data; do not invent a backend
priority field.

### Lead Source colors

Keep the donut chart. Use requested colors where sources exist: -
Website → grey - WhatsApp → WhatsApp green - IndiaMART → red -
TradeIndia → orange - Google → yellow

Retain text labels so color is not the only identifier.

### Dashboard KPI cards

Review the four current cards (Open Leads, Pipeline, Won Value, Total
Leads). Keep them only if they are meaningful and supportable from the
verified backend/report endpoints/current frontend data. If not, replace
them with useful metrics that can actually be derived from the verified
contract. Where a percentage/change indicator can be calculated
reliably, show it with appropriate positive/negative treatment. Do not
invent endpoints or imply unsupported comparisons.

## 2. Dashboard --- Funnel and source placement

### Lead Funnel

Use the dashboard area currently occupied by the lead-source
visualization for a Lead Funnel. Show the actual verified lead
lifecycle/status stages, with count and percentage where calculable.
Conversion/weak-conversion information is allowed only when derived from
available data. The screenshot's
New/Contacted/Qualified/Meeting/Proposal/Won stages are visual examples
only; do not invent unsupported statuses.

### Lead Source

Move Lead Source Breakdown next to Opportunity Pipeline. Keep the Stage
1.2 donut/ring with total in center, source legend, count, and
percentage. Keep the panels balanced and responsive.

## 3. Lead Master

### Preserve useful columns

Keep Product/category, Follow-up, Assigned to, and Last activity visible
if space permits.

### Source layout

Source should be its own table column, not tucked under the customer
card. Prefer real recognizable source logos (Google, Meta, etc.) where
reliable assets are practical. If good brand assets are unavailable, use
clean source names or lightweight icons/monograms rather than poor fake
logos or a large new dependency. Keep accessible text labels.

### Status / Score / Follow-up

Use clearly distinguishable, consistent badges for: - Status - Score
(Hot/Warm/Cold) - Follow-up urgency

Use the verified backend lead lifecycle for Status. Follow-up should
distinguish overdue, due today, upcoming, and completed where data
supports it. Do not rely on color alone. Keep Score frontend/mock-only
if backend does not support it.

### Filters

The filter area is too long. Convert high-cardinality filters such as
City, State/Region, Source, Status, Follow-up, and Assignment into
compact searchable multi-select dropdown/popover controls. Preserve
filtering behavior. General rule: many options → selectable/searchable
dropdown.

## 4. Lead Detail

### Notes vs activity remarks

Keep these separate.

**Activity remarks:** tied to a specific call, email, meeting, WhatsApp
interaction, or follow-up and describe what happened.

**Notes:** general customer/party context that remains useful across
activities, such as preferences, relationship context, or how to
approach the customer.

Use existing frontend/mock behavior where backend support is absent; do
not invent APIs.

### Lead badges

The lead header should clearly show current stage/status, Score as
`Hot lead` / `Warm lead` / `Cold lead`, source, and owner/assignee where
available. Use the same badge language as Lead Master. Do not introduce
unsupported statuses.

## 5. Opportunities

### KPI cards

Review the Opportunity KPI cards. Keep only metrics that are meaningful
and supportable from the verified Opportunity/Quotation/Sales data. Add
percentage/change indicators only where a valid comparison can be
calculated.

### Opportunity vs Customer

Avoid redundant Opportunity and Customer columns if they communicate
essentially the same thing. Keep the opportunity identity and use a
useful Product/setup column where the available data supports it. Do not
invent an unsupported product relation. Preserve expected value,
stage/status, probability, expected close date, and owner where
supported and useful.

## 6. Quotations

### KPI cards

Review quotation KPI cards and keep meaningful, supportable metrics. Add
percentage/change information only where reliably calculable. Do not
invent reporting endpoints.

### Status colors

Use the actual verified quotation lifecycle: - DRAFT - REVISED -
APPROVED - CONVERTED

Do not replace these with screenshot-only statuses such as Sent, Viewed,
Accepted, Rejected, or Expired unless the backend contract verifies
them. Color-code the real lifecycle consistently.

## 7. Customers

### Customer statuses

Verify which customer statuses are actually supported by the
backend/frontend contract. Screenshot statuses such as Active, At Risk,
New, and Churned are examples only. Do not invent unsupported customer
statuses. If supported statuses exist, make them consistent and
color-coded.

### Key Contacts

Make contact information actionable where data exists: - Phone →
clickable `tel:` action / Call action - Email → clickable `mailto:`
action - WhatsApp → action only when a usable phone number exists and it
can be implemented without a backend API

Do not invent contact-management APIs.

### Contacts tab

Make contact rows/details interactive rather than static. Provide Call /
WhatsApp / Email actions when appropriate. If a contact has no usable
communication detail, do not show a misleading action.

## 8. General UX quality pass

Across affected screens: - Check spacing, alignment, typography, table
density, card hierarchy, and responsive behavior. - Remove redundant
UI. - Make clickable elements visibly clickable. - Keep interactions
consistent across Dashboard, Leads, Lead Detail, Opportunities,
Quotations, Customers, and Contacts. - Preserve the light RevenueOS
theme. - Avoid unnecessary dependencies. - Avoid decorative elements
with no useful meaning. - Use color consistently and accessibly. - Do
not add functionality that requires backend changes.

## 9. Validation

Before finishing: 1. Run TypeScript/typecheck. 2. Run lint. 3. Run
production build. 4. Browser-verify Dashboard, Lead Master, Lead Detail,
Opportunities, Quotations, Customers, Contacts, sidebar
expanded/collapsed, and topbar account/profile. 5. Test redesigned
filters. 6. Test contact actions where data exists. 7. Confirm no
backend files were modified. 8. Confirm frontend Git working tree is
clean after the milestone commit.

## Git

Create ONE frontend milestone commit after implementation and
validation.

Suggested commit message:

`feat(revenueos): refine dashboard and sales ux`

Then stop.
