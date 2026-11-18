# RevenueOS — Frontend UI/UX Excellence Initiative: audit and improvement register (2026-10-18)

Base: frontend **5114eb9** (deployed, pid 1202663), backend **d9fc0c5** (deployed, read-only here).
Work branch: `revenueos-uxi` in an isolated git worktree (scratchpad `ux/fe`, real copy of `node_modules`;
the live frontend serves `.next` from the repo folder, so nothing is built there).
**Nothing is deployed.**

Classification: DONE · PARTIAL · MISSING · BLOCKED. Scope: S = screen-specific, R = reusable RevenueOS
pattern, P = platform / design-system.

## 0. Baseline (worktree at 5114eb9, before any change)

| Check | Result |
|---|---|
| `npm test` | 73 / 73 |
| `tsc --noEmit` | clean |
| `next lint` | no warnings or errors |
| `next build` | OK, 33 routes |

## 1. Route inventory (as found)

| Route | Data | List/detail pattern | Notes |
|---|---|---|---|
| /dashboard | real + **mock tasks** | stat cards, focus list, kanban | "Today's Focus" mixes demo tasks (links to records that don't exist) with real leads/quotes |
| /leads, /presales | real, server search | ResponsiveList (table ↔ cards), FilterBar, chips, paging | strong |
| /leads/[id] | real | profile + actions + history | strong; gated actions, CNC, reopen, returning-enquiry panel |
| /pipeline | real | Kanban | OK |
| /opportunities | real | **DataTable only** (sideways scroll on phones) | product column reads a mock-only field → always "—" in production |
| /opportunities/[id] | real | stepper, stage dialog | OK |
| /quotations, /proforma-invoices, /sales-orders, /sales-invoices | real | **DataTable only**, status chips, no search | |
| /quotations/[id], /proforma-invoices/[id] | real | CP3 cockpit (header, callout, chain, summary, lines, history) | reference quality; back link is a click-only `<a>` |
| /sales-orders/[id], /sales-invoices/[id] | real | cockpit-like | back link click-only `<a>` |
| /customers, /customers/[id] | real | ResponsiveList; customer cockpit (NextUp, SectionNav, snapshot) | strong |
| /payments (Collections) | real, finance-scoped | worklist, groups, LoadingRegion, record-payment dialog | strong |
| /contacts, /activities, /tasks, /notes | **mock only** (no backend module) | | shown to production users; nothing entered is saved |
| /notifications | real | feed | |
| /search | real (combined lists) | **click-only `<div>` results** | not reachable by keyboard |
| /reports | ComingSoon | | backend report endpoints judged unsound (see page) |
| /content, /content/[id], /recycle-bin, /access, /document-settings | real | | OK |

## 2. Register

| # | Area | Item | Class | Evidence | Intended outcome | Scope | Status | Tests | Commit |
|---|---|---|---|---|---|---|---|---|---|
| A1 | Shell | Skip link, `<nav>` landmark, `aria-current` on the active item | MISSING | Sidebar.tsx renders `<aside>` + plain links; no skip link | keyboard and screen-reader users can skip to content and know where they are | P | DONE (this initiative) | shell.test.tsx | 10f4e34 |
| A2 | Shell | Breadcrumb parent is a `<span onClick>` | PARTIAL | Topbar.tsx crumbTrail | real link, focusable, `<nav aria-label="Breadcrumb">`, `aria-current="page"` | P | DONE (this initiative) | shell.test.tsx | 10f4e34 |
| A3 | Shell | Mobile drawer: scrim is a box-shadow (tap outside does nothing), no Escape, closed drawer still in the Tab order, menu button has no `aria-expanded` | PARTIAL | globals.css `.rail.show{box-shadow:0 0 0 100vmax}`, AppShell | tap-outside and Escape close it, focus moves in and back, closed drawer is inert, closes on navigation | P | DONE (this initiative) | shell.test.tsx | 10f4e34 |
| A4 | Shell | No search on phones/tablets (topbar search hidden ≤ 860 px, /search not in navigation) | MISSING | globals.css `.topbar .search{display:none}` | a search button that opens /search on narrow screens | P | DONE (this initiative) | shell.test.tsx | 10f4e34 |
| A5 | Shell | Topbar search input has no label; notifications button doesn't say how many are unread | PARTIAL | Topbar.tsx | labelled input; "Notifications, 3 unread" | P | DONE (this initiative) | shell.test.tsx | 10f4e34 |
| A6 | Shell | Collapsible rail, tooltips, theme toggle, permission-filtered nav (visibleNavSections, not used as security) | DONE | Sidebar.tsx, navVisibility.ts, tests | leave | | | | |
| B1 | Leads | Server-side search/filters/sort/paging, phone search, facets, sticky view, cards on phones | DONE | leads/page.tsx, useLeadListView, leadList tests | leave | | | | |
| B2 | Leads | Lead detail: assign/unassign/qualify/reject/reopen/CNC/status move with confirmations, returning-enquiry panel, history | DONE | leads/[id]/page.tsx, LeadDuplicatesPanel, enhancements tests | leave | | | | |
| B3 | Leads | Bulk actions (bulk assign) | BLOCKED | no bulk endpoint in backend; N single calls would bypass nothing but would need a per-row result and rollback design | not built; documented | | | | |
| C1 | Pre-Sales/Sales | Pre-Sales panel, handoff, historical filter, routing to mapped salesperson | DONE | presales/page.tsx, handover §14 | leave | | | | |
| C2 | Sales | Source-based pre-sales pools; sales-side reassignment | BLOCKED | handover §10 (no mapping data; no route) | documented | | | | |
| C3 | Opportunities | List is table-only on phones; product column reads mock-only `uiContext.productInterest` (always "—" connected) though the lead's real product exists | PARTIAL | opportunities/page.tsx l.32 | responsive list with search; real product name | R/S | DONE (this initiative) | documentLists.test.tsx | 6c52efe |
| D1 | Quotation/Proforma | CP3 cockpit: header with total, callout, chain, commercial summary from backend amounts, lines, lifecycle history | DONE | quotations/[id], proforma-invoices/[id] | leave (no recalculation added) | | | | |
| D2 | Document lists | Quotations / Proforma / Sales Orders / Sales Invoices lists: DataTable only, sideways scroll on phones, no search | PARTIAL | */page.tsx use DataTable | ResponsiveList (real row links, cards on narrow widths) + search over the loaded list + announced loading | R | DONE (this initiative) | documentLists.test.tsx | 6c52efe |
| D3 | Document detail | Back links on quotation/proforma/sales-order/sales-invoice pages are `<a onClick>` without href (not focusable) | PARTIAL | 12 occurrences | shared BackLink (real link, history-aware) | R | DONE (this initiative) | pageSource.test.ts | bceb1a4 |
| E1 | Customers | Create flow with GSTIN check, strong vs weak match, mapped salesperson / creator, "nothing was saved" | DONE | CustomerCreateFlow.tsx, handover §14 | leave | | | | |
| E2 | Customers | Customer cockpit, statements | DONE | customers/[id] | leave | | | | |
| F1 | Finance | Collections worklist, record payment, statements, finance-scoped visibility | DONE | payments/page.tsx, components/collections | leave | | | | |
| F2 | Finance | Company-wide BI/receivables dashboards in RevenueOS | BLOCKED / out of scope | FinanceOS owns them; RevenueOS shows totals only with finance visibility (dashboard) | none | | | | |
| F3 | Reports | Report pages | BLOCKED | backend report endpoints give unsound figures (documented on /reports) | keep ComingSoon | | | | |
| G1 | Content | Developer "Design note" blocks on 17 pages name endpoints, source files and "mock data" to production users | PARTIAL | `<DesignNote>` in 17 pages | remove developer notes; keep the user-relevant ones as short, plain-language help | R | DONE (this initiative) | pageSource.test.ts | be5a25e |
| G2 | Data integrity | Dashboard "Today's Focus" uses demo tasks in connected mode (links to records that don't exist) | PARTIAL | dashboard/page.tsx allFocusItems | use the real, record-scoped follow-ups (`GET /lead-followups`) | S | DONE (this initiative) | followups.test.tsx | bd390c9 |
| G3 | Data integrity / workflow | Follow-ups: the backend has a scoped list of every follow-up (`GET /lead-followups`, leads.followups.view) but /tasks shows demo tasks; follow-ups are only reachable lead by lead | MISSING | lead-followups.controller.ts findAll; tasks/page.tsx | a real Follow-ups workspace (overdue / today / upcoming) with complete / reschedule / cancel through the existing endpoints and permissions | S | DONE (this initiative) | followups.test.tsx | bd390c9 |
| G4 | Data integrity | Contacts, Activities, Notes have no backend; they show demo data and lose anything entered | PARTIAL | realRepository.ts uses Mock* | grouped in navigation as "Previews", each page says plainly that nothing is saved | R | DONE (this initiative) | followups.test.tsx | bd390c9 |
| G5 | Shared | Search results are click-only `<div>`s | PARTIAL | search/page.tsx | real links | R | DONE (this initiative) | pageSource.test.ts | bceb1a4 |
| G6 | Shared | Modal: focus in/trap/return, Escape, stacked dialogs, phone sheet | DONE | Modal.tsx, uiPatterns tests | leave | | | | |
| G7 | Shared | Toasts, ConfirmDialog, singleFlight double-submit guard, LoadingRegion | DONE | lib/ui, components/ui | leave | | | | |
| G9 | Shared | Filter `Chip` had role=button + tabIndex but no Enter/Space handling and no on/off state (37 uses) | PARTIAL (found during work) | Tag.tsx | real `<button aria-pressed>` | R | DONE (this initiative) | followups.test.tsx | bd390c9 |
| G10 | Shared | Notifications: a failed load read as "You're all caught up"; click-only items; anything older than 2 days was "This week" | PARTIAL (found during work) | notifications/page.tsx | loading/error states, Mark read buttons, calendar-day groups | S | DONE (this initiative) | notifications.test.ts | be5a25e |
| G11 | Shared | Cancelling a follow-up on the lead page happened on one click, though a cancelled follow-up is final | PARTIAL (found during work) | leads/[id] follow-up panel | shared FollowupActions with confirmation ("Keep it" / "Cancel follow-up") | R | DONE (this initiative) | followups.test.tsx | bd390c9 |
| G12 | Shared | Dashboard "Today's Focus" rows were click-only `<div>`s | PARTIAL (found during work) | dashboard/page.tsx | links | S | DONE (this initiative) | — | bd390c9 |
| G13 | Preview screens | Notes cards (sample-data preview) are click-only | PARTIAL | notes/page.tsx | not changed: the screen has no backend; fix when it is built for real | — | OPEN | | |
| G8 | Shared | Some list skeletons are not announced (no LoadingRegion) | PARTIAL | quotations/opportunities/… pages | announced loading on the lists touched in D2 | R | DONE (this initiative) | documentLists.test.tsx | 6c52efe |
| H1 | Responsive | Lead/customer lists, dialogs, cockpits responsive | DONE | container queries, sheet dialogs | leave | | | | |
| H2 | Responsive | Document lists sideways-scroll on phones | PARTIAL | = D2 | | R | DONE (this initiative) | documentLists.test.tsx | 6c52efe |

## 3. Decisions taken under the brief (reversible, frontend only)

- Contacts, Activities, Notes stay reachable but are moved to a navigation group named "Previews" in connected
  mode, with a page notice that nothing is saved. Hiding them entirely is a product decision left to you.
- /tasks becomes "Follow-ups" in connected mode, backed by the real follow-ups; the demo task list remains in
  mock mode only.

## 4. Verification (worktree `revenueos-uxi`, HEAD 6c52efe)

| Check | Result |
|---|---|
| `npm test` | **94 / 94** (baseline 73; 21 new across shell, pageSource, notifications, followups, documentLists) |
| `tsc --noEmit` | clean |
| `next lint` | no warnings or errors |
| `next build` (BACKEND_API_URL=scratch :3002) | OK, 33 routes |
| Scratch server 127.0.0.1:3105 → scratch backend :3002 (`rev_enh_verify`) | all 32 routes 200, 12/12 assets 200, 0 errors in server log; `GET /api/backend/lead-followups` unauthenticated → 401 (route present and guarded) |
| Real-browser pass (responsive, keyboard, signed-in flows) | **not performed**: the connected Chrome is on your PC; `localhost:3105` there is an error page. No credentials used or created |

Responsive and keyboard behaviour is verified structurally (rendered markup and stylesheet rules in tests), not by a
real browser at 390 / 820 / 1440 px.

## 5. Ownership, security, data

- No backend change. The only new API use is `GET /lead-followups`, an existing route (leads.followups.view, record-scoped by
  the backend); complete / reschedule / cancel use the existing routes and permission. Hidden navigation is never relied on.
- No finance, GST, inventory or HR logic added; no new figures computed. Opportunity "product" is the lead's recorded product.
- Production untouched: nothing built, linted or started in the repo folder; live pids unchanged.

## 6. Real-browser pass (2026-10-18, your tunnel → scratch 127.0.0.1:3105 → scratch backend :3002, `rev_enh_verify`)

Scratch preparation (scratch database only; recorded with undo statements in the session scratchpad):
- New test password on `admin.five.1`, `priya.presales.2`, `sam.sales.4` @scratch.test.
- Three PENDING follow-ups `uxi-fu-1..3` (3 h ago, in 2 h, tomorrow) on existing scratch leads.
- Not done: granting `leads.followups.create` in scratch. The code does not exist there, and the grant was refused as a
  permission change needing your approval. So Complete / Reschedule / Cancel were **not exercised in a browser**
  (covered by unit tests only); their absence without the code was verified.

| Check | Result |
|---|---|
| Wrong password on sign-in | showed "Your session has expired" (bug, also in production) → fixed `be31fdf`; now "The email or password is incorrect…" (seen in browser) |
| Follow-ups, admin | 3 rows grouped Overdue / Due today / Upcoming, relative + absolute time, remarks, lead stage; no actions without the create code |
| Follow-ups search / chips | "catalogue" → 1 row via remarks; 2 digits not treated as a phone; **Space on the focused "Assigned to me" chip toggled it** (aria-pressed false→true, real key press) |
| Record scope through the new list | admin 3, Pre-Sales 2 (her leads), Sales 0 |
| Dashboard focus (Pre-Sales) | real follow-ups first ("Overdue", "Due today"), then unassigned leads; rows are links |
| Phone 390 px shell | drawer inert when closed; aria-expanded false→true; Escape closes and returns focus to the menu button; scrim tap and link click close it; search button shown; breadcrumb parent and back link are real links; skip link → `#stage` |
| Drawer focus on open | **did not move focus** (first focusable was the hidden desktop collapse button) → fixed `403b922`, re-checked: focus lands on the current page's link |
| Overflow sweep | 22 pages × 390 / 820 / 1440 px: 61 of 66 measured, **no sideways overflow** (the last 5, at 1440 px, were cut off when the tab navigated) |
| 403 states | scratch admin lacks opportunities/quotations/proformas/salesorders view codes: Opportunities and Sales Orders said "Couldn't load…" with a useless Retry → fixed `f55123c` (names the permission, no Retry), and navigation now hides pages the person can't open |

Commits added in the pass: `be31fdf`, `f55123c`, `403b922`. Tests now **98 / 98**; typecheck, lint, build clean.

### 6b. Follow-up actions in the browser (you approved a temporary scratch grant)

`leads.followups.create` was added to SUPER_ADMIN and SALES in `rev_enh_verify` only, used, then **removed** (code
count back to 0; the tab was signed in again and showed no actions, then signed out).

| Check | Result |
|---|---|
| Cancel | asks first, naming the lead and due time; "Keep it" changes nothing and returns focus to the Cancel button; a real Escape closes it; confirming → "Follow-up cancelled", list refetched, row moved to "Recently completed or cancelled" |
| Reschedule | **pre-filled 10:40 AM for a 4:10 PM follow-up** (UTC cut, also in production on the lead page; saving unchanged would have moved it 5½ h earlier) → fixed `4a687de`; after the fix: 04:10 PM pre-filled, saving unchanged kept 16:10 IST in the database, a change to 20 Oct 11:30 moved it from "Due today" to "Upcoming" |
| Complete | one click → "Follow-up completed", "Completed by Admin Five" (the backend records the actor) |
| Day labels | a follow-up 45 h away read "Tomorrow" (shared `formatRelative` used 48-hour windows) → fixed `4778cc8`; now "in 2 days" |

Branch head after the pass: **4778cc8**; tests **101 / 101**, typecheck, lint, build clean.
