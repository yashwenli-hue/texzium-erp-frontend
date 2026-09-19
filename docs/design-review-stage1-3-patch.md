# RevenueOS Stage 1.3.1 — Small UX Fixes

## Scope
Small polish/fix pass only. Do NOT reopen the larger Stage 1.3 redesign.

Work ONLY in `/root/texzium-erp/frontend`.

Backend is READ ONLY. Use `CLAUDE.md` and `docs/backend-ui-contract.md`. Do not invent backend endpoints or fields. Preserve existing Stage 1.3 functionality.

## 1. Lead Master — sorting + cleaner table

### 1.1 Add useful recency/date sorting
Add a clear table sort control/column header for a meaningful recency/date field, such as lead-created/received date or assigned date, **only if that field exists in the verified backend contract or current frontend data**.

Inspect the actual data first. Do not invent a backend field or endpoint. If no suitable backend date exists, use an existing supported frontend date rather than fabricating one.

Support ascending/descending sorting.

### 1.2 Simplify Lead Master visual layout
Use the attached reference screenshot as the visual direction:
- clean, simple rows
- clear lead/customer identity
- company + city/location beneath the identity
- source as its own column
- clear status/score/follow-up badges
- useful columns remain visible
- reduce visual clutter and unnecessary decorative elements

Keep Product/Category, Follow-up, Assigned To, and Last Activity unless responsive constraints require adjustment.

### 1.3 Fix Score and Status colors
Score:
- Hot → hot accent
- Warm → clearly distinguishable
- **Cold → BLUE**

Status/stage should use clearly different, consistent colors for the **verified Lead lifecycle statuses**. Do not invent new statuses.

Follow-up urgency should remain visually distinguishable. Do not rely on color alone.

## 2. Dashboard KPI cards — verify trend/change treatment

The KPI cards should use the reference visual language:
- small trend graph/line
- meaningful direction/state shown with color
- positive/growth → green
- negative/downward → red
- percentage/change shown when a valid comparison exists

IMPORTANT: If this treatment already exists and the current mock data simply produces a neutral/no-change state, **do not change the component unnecessarily**.

Do not invent historical data just to manufacture a percentage.

## 3. Customer page — New status color

If `New` is a supported customer status, change its badge to **BLUE** and keep the customer status color system consistent.

Do not invent or change the underlying customer status model.

## 4. Contacts — company navigation

On the Contacts page, clicking a contact's company name should navigate to that company's existing Customer/Company account detail page.

On that account page, show the other contacts associated with the same company/customer where those contacts already exist.

Requirements:
- company name is visibly clickable
- navigate using the existing customer/company route and actual identifiers
- customer/company detail shows associated contacts
- use existing frontend/backend data relationships
- if mock data powers Contacts, ensure mock contacts are linked to the correct customer/company records
- do not invent a company ID relationship
- do not create a new backend endpoint

## Validation

Run typecheck, lint, and production build.

Browser verify:
- Lead Master sorting and clean layout
- Cold Score badge
- Lead Status colors
- Dashboard KPI cards
- Customer `New` status
- Contacts → company navigation
- Company/customer detail → other contacts

Confirm backend remains untouched.

Create ONE small frontend commit.

Suggested commit:
`fix(revenueos): polish lead and contact ux`

Then stop.
