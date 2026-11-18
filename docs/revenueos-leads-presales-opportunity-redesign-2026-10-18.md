# RevenueOS — Leads, Pre-Sales & Opportunity redesign: register and results (2026-10-18)

Branch `revenueos-uxi` (worktree in the session scratchpad), on top of `4778cc8`. Commits `7e5c373` … `1061cc6`.
Frontend only; no backend change; **nothing deployed**. Live pids unchanged (be 1198136, fe 1202663).

## 1. Audit (as found at 4778cc8)

| # | Area | Finding | Class |
|---|---|---|---|
| L1 | Lead page | Up to 9 equal-weight buttons in one row (Assign, Unassign, Qualify, Reject, Reopen, Update status, Delete, Deactivate…); reasons only in tooltips | PARTIAL |
| L2 | Lead page | Nothing says what the lead needs next (unowned, never called, CNC, overdue follow-up, ready to decide, qualified without a deal) | MISSING |
| L3 | Lead page | Owner, last call and next follow-up scattered or absent at the top; last-call outcome only on list rows | PARTIAL |
| L4 | Lead page | Related opportunities/quotations as small tables at the bottom of the side column | PARTIAL |
| L5 | Lead page | Log call / Log CNC hidden in the history panel's header | PARTIAL |
| L6 | Lead page | Returning-enquiry panel, history, follow-ups, all confirmations, deactivate/delete/reopen | DONE (kept intact) |
| L7 | Leads ↔ lead | Working through a list means returning to it after every lead | MISSING |
| P1 | Pre-Sales | A filtered report of leads, not a work queue; no "who needs what" | PARTIAL |
| O1 | Opportunity | Stage stepper, confirmed moves, customer link rules, quotation creation | DONE (kept) |
| O2 | Opportunity | No statement of the blocker (no customer → no quotation) or next commercial step; quotations without their next step; passed close date and quiet deals not flagged | MISSING |
| X1 | Shared | Assign/Qualify said "No other active user is available" when the people list was **refused (403)** | PARTIAL (bug) |
| X2 | Shared | `NextUp` tied to the customer cockpit's action type | PARTIAL |
| B1 | Bulk assign / bulk qualify | No bulk endpoint; per-row calls would need a result/rollback design | BLOCKED |
| B2 | Assign from Pre-Sales queue rows | Needs `GET /users` (users.view) to choose a person; inline assignment not built, the lead page does it | BLOCKED (permission design) |
| B3 | Editing expected close / value on an opportunity | No verified update route used by the frontend; only flagged, not editable | BLOCKED |
| B4 | Saved custom views (named by the user) | Would need storage beyond the browser tab; presets used instead | BLOCKED (decision) |

## 2. What was built

**Shared patterns (reusable)**
- `NextUp` made generic over the page's action type (`lib/ui/attention.ts`); the customer cockpit is unchanged.
- `RecordJourney`: Received → Pre-sales → Qualified → Opportunity → Quotation, the same strip on the lead and the opportunity; steps that are another record link to it.
- `RecordPager` + `lib/ui/recordSequence.ts`: "4 of 7 in Pre-Sales · Needs an owner ‹ ›" — the list a record was opened from (Leads, Pre-Sales queue, Follow-ups, Opportunities), per tab; tampered storage ignored, same-site paths only.
- `QueueBar`: counted presets of a list's filters, toggle buttons.
- Workspace layout CSS (`.ws-*`): header with identity, facts, actions, journey; one column under 1100 px; phone action bar.

**Lead workspace (screen-specific, logic in `leadWorkspace.ts`)**
- Header: what it is, who holds it, received when, last call (outcome, when, who), next follow-up.
- Actions grouped: working the lead (Log call, Log CNC, Schedule follow-up) / the lifecycle decisions that apply to its status (Create opportunity, Assign, Qualify, Update status, Reopen, Reject) / rare ones behind "⋯" (Edit, Unassign, Reactivate, Deactivate, Move to Recycle Bin). Actions the role lacks stay visible, disabled, with one shared reason line.
- "Next up": overdue follow-up, possible duplicates (link to the panel; nothing merged), nobody working it, no call yet, CNC, no follow-up, spoken-to → qualify or reject, qualified without a deal, the deal it became. Each suggestion opens the existing dialog; nothing changes the lead by itself.
- "Log call" no longer pre-selects an outcome.
- Side: Deal (opportunity and quotations as links), Contact & details, returning-enquiry panel (`#duplicates`).
- Phone: Call / Log call bar at the bottom.

**Pre-Sales work queues (screen-specific, presets in `presalesQueues.ts`)**
- Needs an owner, Follow-up due, Not connected, Never called, Worked by me, Handed to sales, All — each the backend's own count; the list, filters and search are the existing server search. Follow-up column added. Opening a lead steps through the queue.

**Opportunity workspace (screen-specific, `opportunityWorkspace.ts`)**
- Header facts: value, probability bar, expected close (flagged when passed), owner and last contact.
- "Next up": lead deactivated, close date passed, no customer → link (never creates or merges), ready to quote, the latest quotation's next step (from the proforma/order chain), no contact for 14 days (display heuristic), next stage (confirmed in the existing dialog).
- Quotations listed with their next step; stage actions with visible reasons.

## 3. Business rules preserved
All status, assignment, qualification, reopen, stage, customer-link and quotation rules are the existing ones; every change still goes through its existing dialog and backend route. No automatic Hot/qualified/assigned. Returning-enquiry and duplicate-GSTIN behaviour untouched (`LeadDuplicatesPanel` unchanged). Navigation and buttons are presentation only.

## 4. Verification

| Check | Result |
|---|---|
| `npm test` | **119 / 119** (18 new in `tests/workspaces.test.tsx`) |
| typecheck / lint / build | clean / clean / OK |
| Browser (your tunnel → scratch :3105 → scratch be :3002, `admin.five.1`) | Pre-Sales queues with live counts (Needs an owner 7, Never called 9, …); choosing a queue filters and is remembered; opening a lead shows "4 of 7 in Pre-Sales · Needs an owner"; Next up "Nobody is working this lead yet"; **logged a CNC call** → Next up became "Last call didn't connect", facts "Not connected just now · Admin Five", status unchanged; "⋯" menu with real ArrowDown / Escape, focus returns; next-in-list → "5 of 7"; Assign dialog now explains the 403 (found and fixed in this pass); 390 px: no overflow on lead or Pre-Sales, phone bar 44 px buttons |
| Second pass (temporary scratch grant you approved; removed afterwards) | see §5 |

Scratch data written: one CNC call on scratch lead "Dev Patel" (recorded in the session scratchpad).

## 5. Second browser pass — Assign, Qualify, Create opportunity, Opportunity workspace

You approved a temporary grant on SUPER_ADMIN in `rev_enh_verify` only: users.view, leads.qualify, leads.reject,
opportunities.view/create/edit, quotations.view (ids `uxi2-*`). **Removed afterwards** (7 role rows and 7 codes deleted,
count 0); a fresh sign-in then got 403 on opportunities, users and quotations. Tab signed out and closed.

One journey on scratch lead "Ravi Kumar", end to end in the browser:

| Step | Result |
|---|---|
| Assign (dialog, keyboard select) → Priya Presales | toast; status Pre Sales Assigned; "Held by Priya Presales (pre-sales)"; journey → Pre-sales; Next up → "No call has been logged yet"; button becomes Reassign |
| Qualify → Sam Sales | toast; status Sales Assigned; "Held by Sam Sales (sales)"; Assign/Qualify leave the lifecycle row; Next up → "Qualified — no opportunity yet" with Create opportunity |
| Create opportunity from Next up (lead pre-selected; customer left for later) | toast; Deal panel shows it; journey → Opportunity; Next up links to it — no reload |
| Opportunity workspace | facts, probability bar, stepper, journey; history shows Assigned → Qualified → Opportunity Created |
| Link a customer (existing dialog) → Esha Mills | toast; header names the customer; blocker cleared; "Ready for a quotation" shown disabled with "needs quotations.create" (not granted) |
| Move to Proposal (existing confirmation, remark) | toast; stage Proposal; remark in history "Remark by Admin Five"; stage buttons → Negotiation / Back to Qualified / Lost |
| 390 px, opportunity and lead | no sideways overflow; journey scrolls inside itself |

Found and fixed in this pass (`34dc294`): Next up put "no call logged" above "link a customer"; the missing
customer blocks every commercial step, so it now leads. The journey's Opportunity step said "Qualified" (its stage),
which read like the lead step; it now says "Stage: Qualified".

Scratch data written: Ravi Kumar assigned and qualified; opportunity "Needle loom NL-100 (scratch test)" created,
Esha Mills linked, moved to Proposal (all recorded in the session scratchpad).

Branch head **34dc294**; tests **119 / 119**; typecheck, lint, build clean.

## 6. Quotation-from-opportunity pass (continued session, 2026-10-18)

**Start state verified:** worktree branch `revenueos-uxi`, head `34dc294`, clean except the tool-written
`tsconfig.tsbuildinfo` (never committed). Deployed baseline `5114eb9` (live repo HEAD, live build
`JOnUv4aCQzMpztv4Kiwfr`, be pid 1198136 / fe pid 1202663 unchanged).

**Scratch preparation (`rev_enh_verify` only; ids and undo in the session scratchpad):**
- Test data the scratch database lacked for any quotation: Company `uxi3-company`, seller registration
  `uxi3-company-gst` (27AAACT1234Z1Z5), HSN `uxi3-hsn-8446` (18%) mapped to item NL-100. `POST /companies` could not
  be used: its DTO has no validators, so the strict validation rejects every field (pre-existing backend gap; not fixed).
- Temporary grant on SUPER_ADMIN: opportunities.view, quotations.view, quotations.create (`uxi3-*`). **Removed**;
  fresh sign-in then: GET /opportunities 403, GET /quotations 403, POST /quotations 403, GET /quotations/:id 404;
  in the browser the navigation dropped Opportunities/Quotations and the page refused.

**Browser results (build of `a5cc5a6`, `wbk5GlaS1fc2fsTRFDA4K`):**

| Check | Result |
|---|---|
| Empty unit price | inline "Enter a unit price greater than 0", field invalid, **focus moved to it** |
| Backend refusal (item without HSN) | "HSN not mapped to inventory item" shown as an announced alert, scrolled into view |
| Success (NL-100, qty 1, ₹9,25,000, double-clicked) | toast "Quotation created as Draft"; QT27/26-27/00001 listed with "Needs approval"; journey → Quotation; **exactly one** row in the database: DRAFT, CGST_SGST, taxable 925000, GST 18% = 166500, total 1091500 (backend-computed) |
| Navigation | quotation link → quotation page showing ₹10,91,500.00 / "Taxable ₹9,25,000.00 + GST 18%" / chain to Proforma and Sales Order; Back returns to the opportunity |
| Customer-blocker priority | page rendered with the opportunity response stubbed in the browser (customer removed, no data changed): Next up = "Link a customer before quoting" (red), ahead of "No call…" |
| Journey label | "Opportunity · Stage: Proposal" |
| Responsive | 13 pages × 390/820/1440 = 39/39, no sideways overflow, no load errors |

**Found during the pass and fixed:**
- `97e1504` A dialog's save error was rendered at the end of a scrolling body: a backend refusal looked like "nothing
  happened". Shared `FormError` (role=alert, scrolls into view) now in 15 forms and ConfirmDialog; the quotation form
  focuses the first invalid field.
- `a5cc5a6` Opportunity lists said "Unassigned" when the owner's name could not be looked up (needs users.view); now
  "Name not available".
- `38074a9` A refused lead/opportunity page said "Something went wrong … Retry"; now "You don't have access … needs the
  X permission", no Retry (seen in the browser at `38074a9`).
- `9693a96` Without opportunities.view the lead page said "no opportunity" and offered **Create opportunity** for a lead
  that already had one (risk of a duplicate deal); without quotations.view the opportunity page did the same for
  quotations. Both now say "not visible to you" and suggest nothing (seen in the browser at `9693a96` for the lead page).

**Final checks at `9693a96`** (output in scratchpad `checks_final_9693a96.txt`): tests **126/126**, typecheck rc=0,
lint clean, production build OK (`Yk01ODO8wCubixhd7YpWH`), host-side sweep 32/32 routes and 23/23 assets 200, server
log 0 errors. **Not rerun at `9693a96`:** the 39-page responsive sweep and the quotation flow (both passed on the
`a5cc5a6` build) — your tunnel was down; the two later commits change the lead and opportunity pages only.

Scratch data now present from testing: quotation d57eb503 (DRAFT) on opportunity 6cfe4759, plus the company, seller
registration and HSN above.

## 7. Re-run at `9693a96` (tunnel restored; served build `Yk01ODO8wCubixhd7YpWH`; no temporary grants active)

| Check | Result |
|---|---|
| Pre-Sales queues | counts from the backend (Needs an owner 6, Not connected 1, Never called 7, Worked by me 3, Handed to sales 2, All 12); navigation without Opportunities/Quotations |
| Queue → lead | "1 of 6 in Pre-Sales · Needs an owner"; Next up "Last call didn't connect"; actions and the merged permission line correct; next-in-list → "2 of 6" |
| Keyboard | "⋯" menu: real ArrowDown opens it on "Edit details", Escape closes it and returns focus |
| Lead with an opportunity the person can't see (Ravi Kumar) | Next up "This lead's deals aren't visible to you"; journey "Not visible to you"; no Create opportunity |
| Opportunity page without opportunities.view | "No access · … needs the opportunities.view permission", no Retry |
| Responsive sweep | 13 pages × 390/820/1440 = **39/39, no sideways overflow** |

Not re-run at `9693a96`: the quotation-creation flow (it needs the temporary grant again; it passed on the `a5cc5a6`
build, and the later commits don't touch the quotation form).

Follow-up found (not changed; the quotation page is outside this redesign): without quotations.view the quotation page
says "Couldn't load this quotation" above the correct "You don't have access…" text and still offers Retry — the same
small fix as `38074a9`.

## 8. Release readiness — final fix and verification at `2477799`

**Final head: `2477799`** on `revenueos-uxi`, 22 commits on the deployed frontend `5114eb9` (live repo still at
`5114eb9`, live build `JOnUv4aCQzMpztv4Kiwfr`, backend pid 1198136 and frontend pid 1202663 unchanged).

### The fix (`2477799`)
Quotation, Proforma Invoice, Sales Order and Sales Invoice detail pages now share one `LoadFailure` state
(`components/ui/LoadFailure.tsx`):
- **403:** panel "No access", lock icon, "You don't have access to this …", the permission it needs
  (quotations.view / proformas.view / salesorders.view / invoices.view), **no Retry**, no "Couldn't load".
- **Anything else (network, 5xx):** "Couldn't load this …", the real message, **Retry**; nothing about permissions.
- Presentation only: the backend still decides every request. Sales Order and Sales Invoice previously had no 403
  handling at all (they said "Something went wrong" with Retry).

### Browser evidence on build `h9wU9mz1KiQWmb2rCUHhs` (= `2477799`, confirmed served), scratch only
| Check | Result |
|---|---|
| Unauthorized quotation page (scratch admin without the codes) | single "No access" panel naming quotations.view, no Retry |
| Proforma / Sales Order / Sales Invoice, unauthorized | "No access" naming proformas.view / salesorders.view; invoice page keeps its own earlier invoices.view message; none offers Retry |
| Server error (500) and network failure on the quotation list call (stubbed in the page, no data changed) | "Couldn't load this quotation", "boom" / "Could not reach the RevenueOS backend…", **Retry** shown, no permission text |
| Authorized (temporary grant `uxi4-*`: opportunities.view, quotations.view, quotations.create) opens existing QT27/26-27/00001 | ₹10,91,500.00, "Taxable ₹9,25,000.00 + GST 18%", Draft, chain to Proforma / Sales Order |
| Create from opportunity "Orbit looms" (customer Orbit Narrow Fabrics, buyer GST preselected) | quantity 0 and empty price → both inline messages, focus on the first; backend refusal (item without HSN) shown as an announced alert; with NL-100, qty 2, ₹4,80,000, **double-clicked** → toast "Quotation created as Draft", quotation listed with "Needs approval", journey → Quotation |
| Database after | exactly **one** new row: QT27/26-27/00002 DRAFT, taxable 960000, GST 18% = 172800, total 1132800 (backend-computed; the form only previews the taxable amount) |
| Resulting quotation page | line "Needle Loom 100 · HSN 8446 · 2 · ₹4,80,000 · ₹9,60,000 · ₹1,72,800 (18%) · ₹11,32,800"; Back returns to the opportunity |
| Customer-blocker priority (opportunity response stubbed to no customer) | Next up = "Link a customer before quoting", red, above "No call logged" |
| Journey label | "Opportunity — Stage: Qualified" |
| Responsive | 15 pages × 390 / 820 / 1440 = **45/45**, no sideways overflow, no error states (includes both opportunity pages and both quotation pages) |
| Temporary grants removed | 3 role rows and 3 codes deleted; 0 codes left, 0 `uxi*` grant rows. Fresh sign-in: API GET /opportunities 403, GET /quotations 403, POST /quotations 403; browser: quotation and opportunity pages show "No access" and the navigation drops both entries |

### Checks at `2477799` (clean working tree apart from the tool-written `tsconfig.tsbuildinfo`, never committed)
Tests **130 / 130** (0 failed, 0 skipped) · typecheck rc=0 · lint no warnings or errors · production build compiled,
33 routes, build id `h9wU9mz1KiQWmb2rCUHhs` (same revision). Output: scratchpad `checks_final_2477799.txt`.

### Diff audit against `5114eb9` (84 files: 57 modified, 26 added, 1 deleted; +3,287 / −1,253)
- Only under `app/`, `components/`, `lib/`, `tests/`. **No** change to `package.json`, `package-lock.json`,
  `next.config.js`, `tsconfig.json`, `.env`, `docs/` or `tsconfig.tsbuildinfo → no new dependency.**
- Added lines scanned for scratch emails, the test password, `rev_enh`, ports, record ids, tokens and secrets: none.
  No test fixture refers to scratch data.
- Commit messages: no AI or co-author lines.
- Deleted: `components/ui/ComingSoon.tsx` (unused after the Reports page change).
- Live repo: tracked tree clean; the only untracked files I added are this register, the earlier register and three
  screenshots under `docs/` (all other untracked docs untouched). Rollback material intact:
  `sha256sum -c SHA256SUMS_frontend_pre_enh_20261018_001010.txt` → OK; 18 `dist.pre-*` / `client.pre-*` folders present.

### Rollback procedure and risks
- **Code only; no migration, no backend, no data change, no new permission code** — the release is frontend-only.
- Before deploying, archive the then-live `.next` (the existing `frontend_next_pre_enh_*` archive is the build *before* the
  last deploy, not the current one). Roll back by restoring that archive and restarting the `texzium-frontend` unit —
  the user-run flow used for every earlier frontend deploy. Alternatively redeploy `5114eb9`.
- Brief frontend outage while restarting (about 40–90 s in earlier deploys). People stay signed in; nothing else changes.
- Behaviour changes to expect: "Tasks" is now **Follow-ups** (real follow-ups; needs leads.followups.view);
  Contacts / Activities / Notes sit under **Previews** and say nothing they enter is kept; Pre-Sales is a queue page;
  lead and opportunity pages are re-laid-out; navigation hides pages the person has no view permission for.

### Known limitations / remaining blockers
- **Not browser-tested on a phone or real touch device**; mobile layout is verified at 390 px in a desktop browser.
- Keyboard checks used real Arrow / Escape / Space presses where possible; Tab traversal is verified structurally.
- Errors in the quotation form stay visible after the field is corrected until the next submit (pre-existing form pattern).
- Blocked on business decisions or backend capability (unchanged): bulk assign/qualify (no bulk endpoint), inline
  assignment from queue rows, editing expected close/value on an opportunity, named saved views, source-based Pre-Sales pools,
  request-access workflow, more call outcomes.
- Backend gap noticed, not touched: `POST /companies` rejects every field (DTO without validators under the strict pipe).
- Scratch database still holds test data from these passes (quotations d57eb503 and 67124dfc, a test company, seller GST and HSN,
  an opportunity, follow-ups and call logs); undo statements are in the session scratchpad.
- Needs your approval before anything goes live: **nothing has been merged, deployed or restarted.**
