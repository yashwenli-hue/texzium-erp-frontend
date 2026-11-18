# RevenueOS — Production vs Redesign: comparative UX review (analysis only)

**Production:** commit `5114eb9`, build `JOnUv4aCQzMpztv4Kiwfr` (live, port 3100).
**Redesign candidate:** `2477799` (22 commits, branch `revenueos-uxi`), scratch build `h9wU9mz1KiQWmb2rCUHhs` (port 3105).
Nothing was implemented, merged, deployed or changed for this review; no source file of either version was edited, and no scratch record was created.

## 0. How much of this is verified

Every finding carries a tag in the *Reason* column:

| Tag | Meaning |
|---|---|
| **[B]** | Seen by me in a browser on the candidate (scratch data), in the earlier review passes: screenshots at 1536×679, 854×728 and 390 px, plus scripted DOM readings. |
| **[C]** | Read from the code of both versions (`git show 5114eb9:<file>` against the candidate files). Reliable for structure, content and where things sit; says nothing about how it *feels*. |
| **[U]** | Not verified. Mainly: **I have not seen production's screens in a browser.** I have no production credentials and did not touch production. So every statement about production's look at phone width, spacing or first-screen density is inferred from its code and marked [U]. |

To close that gap I rebuilt `5114eb9` in an isolated clone and serve it on scratch port **3106** (same scratch data, loopback only, not production's `.next`).
If you add it to your tunnel I can capture the same lead and opportunity on both versions side by side:
`ssh -N -L 3105:127.0.0.1:3105 -L 3106:127.0.0.1:3106 root@97.74.81.245` → `http://localhost:3106` is the old UI, `http://localhost:3105` the candidate.
I do not have your own side-by-side impressions yet; this review should be read next to them, not instead of them.

**What is identical in both versions** (verified by diff): the Leads list page (apart from remembering its order for ‹ ›), the whole Customer area (cockpit, GSTIN duplicate flow, statements), the returning-enquiry panel's content, the Link-customer dialog, the opportunity stage rules and dialog, quotation lifecycle pages, and every business rule. The redesign changed *presentation and guidance*, not behaviour — except the items in §3 marked "behaviour".

## 1. Summary of what I found

**The redesign's real gain is guidance and progression**: "what do I do next", who holds the record, last call, one list to step through, honest no-access / unreadable states, and real data in place of demo data (follow-ups, dashboard focus, opportunity product). It also fixed accessibility gaps (keyboard, announced errors, real links) that production has everywhere.

**What production does better** (I'd call these real regressions, not taste):
1. The lead's **phone, email, location and product sit in the first card**; the redesign moved them to a side panel that, on a phone, comes after the whole follow-up and history list, and the header shows no number [C][B].
2. The **returning-enquiry / duplicate panel** was the second panel of the main column; the redesign put it last in the side column, and the "Next up" card only reacts to *open potential duplicates*, not to repeat enquiries or an existing-customer match [C]. This is the business-critical guidance you asked to preserve.
3. The redesign **repeats controls**: Assign appears in the action row and in Next up; Log call in four places (action row, Next up, history header, phone bar); "Move to Negotiation" in the stage bar and again in Next up [C][B]. Production has one place for each.
4. **First-screen density**: on a 1536×679 viewport the candidate's lead header (identity, four facts, contact buttons, two action rows with reason lines, journey) fills the screen, and the "Next up" card that should answer "what now" starts at the fold [B].
5. On the opportunity page the candidate shows **two progress strips** (stage stepper and sales journey) plus facts plus Next up before any content [B].

**What both versions get wrong:** the quotation form defaults to the first inventory item (a Braider with no HSN) so the backend refuses a default submission, and neither says so beforehand [B]; corrected fields keep their red message until the next submit [B]; document lists page by 8 rows [C]; assigning needs `users.view` just to list people, so a role that may assign can be unable to pick anyone [B]; Contacts, Activities, Notes are sample data in a real product [C]; nothing can be done in bulk [C].

## 2. Comparison register

Recommendation vocabulary as requested. "Detail" pages = lead and opportunity.

| Area / element | Production | Redesign | Recommendation | Reason |
|---|---|---|---|---|
| **LEADS LIST** | | | | |
| List: search, filters, facets, sort, paging, cards on phones | Server-side search incl. phone formats, facet counts, per-tab saved view | Identical | KEEP PRODUCTION VERSION (same code) | Not changed by the redesign [C]. |
| Row → detail → back | Open, then Back; filters and page kept | Same, plus "4 of 7 in Pre-Sales · Needs an owner ‹ ›" on the detail | KEEP REDESIGN VERSION | Stepping through a queue without returning to the list is a clear speed gain; remembered per tab, links work from keyboard [B]. |
| Bulk assign / qualify | Not available | Not available | REDESIGN FROM SCRATCH (blocked) | The backend has no bulk endpoint; per-row calls need a result/rollback design. Needs a backend decision, not a UI one [C]. |
| **LEAD DETAIL** | | | | |
| Identity header (name, company, status, source, product) | Avatar, name, tags; Edit link beside the name | Same plus "LEAD" kicker and product tag | KEEP REDESIGN VERSION | Product in the header is useful and is real data; otherwise equivalent [C]. |
| Contact details (phone, email, place, product) | In the first card, directly under the tags | Side panel; on a phone after follow-ups and history; header shows no number | COMBINE BOTH | Keep the redesign's tidy panel, but show phone + product in the header facts. Hiding the number under the history is a loss [C][B]. |
| Who/where facts (owner, received, last call, next follow-up) | Owner as a tag; next follow-up in the info grid; **last call is not shown on the detail page** | Four-fact row with outcome, time and who | KEEP REDESIGN VERSION | Directly answers "who owns it, what happened last"; last call was only visible on the list [B]. |
| Action area | Up to 8 equal buttons in one row; unavailable ones disabled, reason only in a tooltip | Work row (Log call, Log CNC, Schedule follow-up) + decision row (Assign, Qualify, …) with a visible reason line; rare actions in "⋯" | COMBINE BOTH | Keep grouping and visible reasons (tooltips fail on touch). But make it one row + one collapsed "why unavailable" line, not two rows plus a reason line [B]. |
| "Next up" guidance | None on lead/opportunity (the customer page has the same idea) | Ordered suggestions with the right button | NEEDS MY PREFERENCE | Valuable, but see decisions D1 and D3: where it lives, and how much it may nudge [B]. |
| First-screen layout | Card + info + trail, then Follow-ups | Large header block, then Next up at the fold at 1536×679 | REDESIGN FROM SCRATCH | The card meant to say "what now" must be on the first screen; compact the header (single-line facts, actions folded) [B]. |
| Where a lead is in the journey | Two-node trail Lead → Opportunity | Five-step strip Received → Pre-sales → Qualified → Opportunity → Quotation with owner/stage detail | KEEP REDESIGN VERSION (lead page) | One glance answers "what stage"; the opportunity link is inside it [B]. |
| Related deals | Two small tables (opportunities, quotations) low in the side column | One "Deal" panel of links with stage/status tags | KEEP REDESIGN VERSION | Fewer panels, same information, navigable [B]. |
| Follow-ups panel | Text links Complete / Reschedule / **Cancel (one click, irreversible)** | Buttons, pending first, Cancel confirms, reschedule time pre-filled in local time | KEEP REDESIGN VERSION | Production's one-click cancel and a UTC-sliced reschedule time were real defects (behaviour change) [C][B]. |
| Returning-enquiry / duplicate panel | Second panel of the main column | Last in the side column; Next up triggers only for open potential duplicates | NEEDS MY PREFERENCE | Business-critical; decision D2. Recommendation: back in the main flow plus a Next-up trigger for repeat enquiries and customer matches [C]. |
| Call / meeting history | "Activity & History", Log CNC / Log Activity links | Same content, "Calls, meetings & history" | KEEP REDESIGN VERSION | Equivalent; clearer title [C]. |
| Log call entry points | History header + Log Activity | Action row, Next up, history header, phone bar (four) | COMBINE BOTH | Keep the action row and the phone bar; drop the others. Four routes to one form is noise [C][B]. |
| Delete / Deactivate | Visible buttons in the action row | In the "⋯" menu, disabled ones explain why | KEEP REDESIGN VERSION | Rare, destructive: quieter placement is right; they stay discoverable and keyboard-reachable [B]. |
| Edit lead | Link beside the name | Panel link and "⋯" menu (two places) | KEEP PRODUCTION VERSION | One obvious place (header) is enough [C]. |
| Phone layout | Header card + wrapping button row (appearance unverified) | Bottom bar "Call / Log call", 44 px targets | COMBINE BOTH | The bar is good for the two most-used actions; fix the contact-details position first [B] / production [U]. |
| **PRE-SALES** | | | | |
| Page concept | A filter report of leads by pre-sales person, owner, status | Seven queues with counts above the same list | KEEP REDESIGN VERSION | Answers "what needs doing" instead of "what exists"; the report stays available as "All" with every filter [B]. |
| Queue counts | n/a | One count request per queue (7) on load | KEEP REDESIGN VERSION | Counts are the backend's own totals; cost is small at current volumes, watch later [C]. |
| Working through a queue | Return to list each time | ‹ › with position | KEEP REDESIGN VERSION | See list row above [B]. |
| Qualification flow | Qualify → dialog (choose sales owner) → confirm | Identical dialog and rules, plus a "Spoken to — qualify or reject" prompt after any connected call | NEEDS MY PREFERENCE | The dialog is unchanged and safe; the prompt is a nudge — decision D3 [C]. |
| Hand-off clarity | "Held by" column | "Held by Sam Sales (sales)" in the header and the journey strip | KEEP REDESIGN VERSION | Makes the pre-sales → sales hand-off visible on the record itself [B]. |
| Assign when the people list is refused | "No other active user is available" (misleading) | "…needs the users.view permission" | REDESIGN FROM SCRATCH | The message fix is right, but the underlying design (assign permission without permission to list people) is a functional gap needing a backend/permission decision [B]. |
| **OPPORTUNITIES** | | | | |
| List | Table, sortable headers; **Product column always "—"** (read a field real data never fills) | Search, phone cards, sort control, real product from the lead | KEEP REDESIGN VERSION | Production defect fixed [C]. |
| Detail layout | One large card (identity, trail, stepper, buttons, facts, history) + customer and quotations beside | Header (4 facts, probability bar), stepper, journey, Next up, then history + customer + quotations | COMBINE BOTH | Keep the header facts and Next up; merge the two strips (below) and move history lower [B]. |
| Stage progression | Stepper + Move / Back / Lost buttons + confirmation dialog with remark | Same, **and** Next up repeats "Move to …" | KEEP PRODUCTION VERSION | The stepper bar is the right single home; Next up should not duplicate it [B]. |
| Two progress strips | One (stepper) | Stepper **and** journey strip | COMBINE BOTH | One strip: the stepper for stage, with "from lead X" as a link; the journey belongs on the lead [B]. |
| Missing customer | A note in the Customer panel | Blocker leads Next up (red) with the link action; no quotation suggestion until resolved | KEEP REDESIGN VERSION | It really blocks every commercial step [B]. |
| Close-date passed / quiet 14 days | Not flagged | Flags (14 days is a display heuristic I chose, not a business rule) | NEEDS MY PREFERENCE | Useful for managers, noise for others; threshold and whether to show at all are yours [C]. |
| Quotations on the opportunity | Small table (no., amount, status) | List with amount and the next step ("Needs approval") | KEEP REDESIGN VERSION | The next step is the useful part [B]. |
| **QUOTATIONS** | | | | |
| Entry points | "+ Create Quotation" in the panel header; "New Quotation" on the list | Also a Next up "Create quotation" | COMBINE BOTH | One primary entry on the opportunity (Next up when ready, panel link otherwise); keep the list button [B]. |
| Creation form | Defaults to the first inventory item (no HSN → backend refuses); errors stay after fixing | Same behaviour; adds an announced alert, scrolls to it, focuses first invalid field | REDESIGN FROM SCRATCH | Both: default to a sellable item, show "no HSN" before submit, clear a field's error when edited. The backend refuses a quotation without HSN, so this is surfacing a rule, not inventing one [B]. |
| Result and navigation | Toast, quotation appears | Same, plus journey updates and quotation links to its page and back | KEEP REDESIGN VERSION | Behaviour verified once: one row, backend totals [B]. |
| Quotation / proforma / order / invoice pages | CP3 cockpit pages | Unchanged; no-access state fixed on all four | KEEP REDESIGN VERSION | The only change is one honest refused state [B]. |
| **SHELL AND SHARED** | | | | |
| Navigation structure | Tasks, Contacts, Activities, Notes among real items | "Follow-ups" (real) and a "Previews" group for the three sample-data screens | NEEDS MY PREFERENCE | Decision D4 [C]. |
| Hiding pages by permission | Six items filtered (Pre-Sales, Sales Invoices, Content, Recycle Bin, Document Settings, Access) | Fifteen: every module page is filtered by its backend view code | KEEP REDESIGN VERSION | Avoids a menu of dead ends; direct URLs still show a clear no-access page. Matters once non-admin roles exist [C]. |
| Top bar | Breadcrumb parent is a click-only span; search hidden on narrow screens with no replacement | Real link; search icon on narrow screens | KEEP REDESIGN VERSION | Fixes keyboard and phone gaps [B]. |
| Keyboard / screen readers | No skip link; closed drawer tabbable; click-only back links, rows and results | Skip link, inert drawer, real links, announced errors, chips as buttons | KEEP REDESIGN VERSION | Production has real gaps here [C][B]. |
| "Design note" panels | On ~17 pages, naming endpoints and mock data | Removed; short plain help only where it helps | KEEP REDESIGN VERSION | Developer notes should not face users [C]. |
| Document lists (quotations, proformas, orders, invoices) | Table only, no search, sideways scroll on phones | Search, cards on narrow screens, announced loading | KEEP REDESIGN VERSION | Both page by 8 rows, which is small (see §1) [C]. |
| Dialog save errors | Plain text at the bottom of the dialog | Announced alert, scrolled into view | KEEP REDESIGN VERSION | A refusal no longer looks like "nothing happened" [B]. |
| Notifications | Click-only rows; "all caught up" even when loading failed | Mark-read buttons, loading and error states, calendar-day groups | KEEP REDESIGN VERSION | Honest states [C]. |
| Dashboard "Today's Focus" and Tasks | Built from **demo tasks** (links to records that do not exist) | Real follow-ups, unowned leads, quotations to approve | KEEP REDESIGN VERSION | Production showed made-up work in a real product [C]. |
| Follow-ups page | "New Task" (sample data, nothing saved) | Real follow-ups, but **no way to schedule one from this page** (only from a lead) | COMBINE BOTH | Keep real data; add "schedule for a lead…" on the page [C]. |
| Customer area, duplicate-GSTIN flow, statements | Existing | Identical | KEEP PRODUCTION VERSION (same code) | Untouched [C]. |

## 3. Behaviour (not just look) that changed

1. Cancelling a follow-up now asks first; reschedule pre-fills local time (production showed UTC, so saving unchanged moved it 5½ h).
2. A refused sign-in says "email or password is incorrect" (production said "session expired").
3. Dashboard, Tasks and the opportunity product column use real data; demo content moved behind a "Previews" label.
4. Pages the person cannot open are hidden from navigation; a 403 shows one "No access" panel (production showed "Couldn't load" and Retry on some pages).
5. Unreadable deals / quotations are shown as "not visible to you" (production, and an earlier candidate build, showed "none").
6. An owner whose name cannot be looked up reads "Name not available" (production: "Unassigned").
All of these are presentation or honesty changes; no backend call changed and no permission was added.

## 4. Decisions for you (four)

**D1 — How much guidance should the lead and opportunity pages carry?**
- *A. Production layout + one slim "Next up" line.* Densest, closest to what users know; least help.
- *B. Redesign as built.* Most guidance; tall header, repeated buttons.
- *C. Redesign compacted (my default):* facts on one line, one action row, Next up directly under the header on the first screen, no repeated buttons, phone and product in the header.
Trade-off: A sacrifices guidance, B sacrifices first-screen space and calm, C costs more rework but keeps both.

**D2 — How prominent should returning-enquiry / duplicate guidance be?**
- *A. Main column, second panel (production).* Always in view; takes space even when empty.
- *B. Side column (current candidate).* Calm; easy to miss on a phone.
- *C. A one-line banner at the top when anything is found (repeat enquiry, possible duplicate, existing customer), opening the full panel (my default).* Costs one more element; nothing can be missed.

**D3 — May the system nudge a decision?**
Today it shows "Spoken to — qualify or reject when you've decided" after any connected call, and flags deals quiet for 14 days or past their close date.
- *A. Facts only* (overdue, no owner, CNC, no call, blocked): never suggests a decision. Safest, least helpful.
- *B. Facts plus neutral prompts* ("Ready to decide?") without a recommended outcome.
- *C. As built.* (My default is A for the lead decision, B-style flags for deals, with the 14-day threshold configurable in code.)
Nothing ever qualifies, rejects or assigns by itself in any option; this is only about wording and pressure.

**D4 — What to do with Contacts, Activities and Notes (sample data, nothing saved)?**
- *A. Keep, labelled "Previews" (current).* Honest, but they remain half-products in the menu.
- *B. Remove from navigation until a backend exists.* Cleanest; loses the demo screens.
- *C. Keep only as a hidden admin/demo route.*
My default is A until you decide what they are for.

Everything else in the register I would decide myself: merge the two strips on the opportunity, drop repeated actions, move Edit back to the header, quotation-form defaults, one primary quotation entry, schedule-from-Follow-ups, page size.

## 5. Proposed third iteration (not started; waits for your preferences)

**Priority 1 — fix what regressed (screen-specific)**
- Lead page: phone, product (and email on desktop) in the header facts; compact header; Next up directly under it; one action row; remove repeated Log call and Assign.
- Duplicates / returning enquiries: banner or main-column placement per D2, and a Next-up trigger for repeat enquiries and customer matches.
- Opportunity page: one progress strip; Next up stops repeating the stage button; history lower.

**Priority 2 — finish and polish (screen-specific)**
- Quotation form: default to an item that can be quoted, show "no HSN" before submit, clear a field's error on edit, keep the entry-point count at one.
- Follow-ups page: schedule a follow-up for a chosen lead from the page.
- Pre-Sales: remember the last queue per tab; named-queue empty states with the next useful queue.

**Reusable RevenueOS patterns**
- One `WorkspaceHeader` (identity, key facts, actions) shared by lead, opportunity and customer, so the three look like one product.
- A documented rule for what "Next up" may say and in what order (facts before suggestions), per D3.
- One "refused vs failed" state for every record page (already exists as `LoadFailure`; extend to the remaining pages).

**Broader design-system changes**
- A density setting (compact/comfortable) for header blocks; consistent paging sizes (documents at 8 rows is small); a single pattern for "reason this is unavailable" (visible line, collapsed when several).

**Functional or business-rule gaps (need a decision or the backend; not invented here)**
- Assign needs a way to list assignable people for people who may assign (today `users.view`) — backend/permission decision.
- Bulk assign / qualify, inline assignment from queue rows — needs bulk endpoints.
- Editing an opportunity's close date or value; named saved views; source-based Pre-Sales pools; request-access workflow; more call outcomes (needs a business list).

## 6. State left behind
- Both versions and the release package are unchanged; production untouched.
- New in scratch only: an old-UI build (5114eb9) served on `127.0.0.1:3106` from an isolated clone for comparison, plus the review grants from the previous step (to be removed on your word). I can stop 3106 whenever you like.


## 7. Decisions received (Phase 1, initial — to be finalized after you compare 3100 and 3105)

| Decision | Your choice | What it means for the next iteration (spec I would build) |
|---|---|---|
| **D1** guidance on lead and opportunity pages | **C — compact redesign** | Keep Next up, but: no tall header; phone and product always in the header facts; Next up on the first screen directly under the header; **one primary location for each action** (no repeated Assign, Log call, Move to …); Edit back in the header. |
| **D2** returning-enquiry guidance | **C — conditional banner** | A clear banner only when the existing duplicate check reports a repeat enquiry, a possible duplicate, or an existing-customer match (linked or matching); it opens the existing details panel. Panel content and logic unchanged; nothing is merged, suppressed, rejected, reassigned or modified automatically. |
| **D3** nudging | **A for lead decisions, factual deal flags** | Remove "Spoken to — qualify or reject…". Qualify and Reject stay as ordinary actions in the action row (no suggestion, no highlight). Deals keep only factual flags ("Expected close date 12 Oct (passed)", "Last contact 18 days ago") in a neutral tone, no button and no implied obligation; the 14-day threshold stays one constant (`QUIET_DAYS`). No automated business decisions. |
| **D4** sample-data screens | **A — Previews group** | Contacts, Activities, Notes stay under "Previews", made unmistakable: a persistent notice on every page (sample data, nothing saved) and a "Sample" mark on each menu item; real Follow-ups stay separate under Activity. Removal can be decided later. |

**Verified today on 3105 (scratch):** the D2 gap exists as described. For Dev Patel the duplicate check reports one repeat enquiry and no open duplicate, and the page's Next up says nothing about it; for Ravi Kumar it reports one linked customer and Next up is silent too. Only an open potential duplicate (the two Esha Gill enquiries) triggers a Next-up line.

## 8. Remaining differences that need your preference (eight; each with my default)

Everything else I would decide myself (single progress strip on the opportunity is item 2 below; quotation-form defaults, one quotation entry, schedule-from-Follow-ups, document-list page size, Edit in the header).

| # | Difference | Options | My default |
|---|---|---|---|
| 1 | **How Next up and the action row share a button** (needed for "one location per action") | (a) Next up carries the button and the action row hides it while it is suggested; (b) the action row only, Next up is text; (c) the action row only, and the suggested action is highlighted there while Next up points to it | **(c)**: the row never changes shape, no duplicates, the guidance still connects to a button |
| 2 | **Progress strips**: production has none on the lead (a two-node trail) and one stage bar on the opportunity; the candidate has a five-step journey on both plus the stage bar | Lead: keep a slim one-line journey / drop it. Opportunity: stage bar only with "from lead X" as a link / keep both | Lead: slim line. Opportunity: stage bar only |
| 3 | **Rare or destructive actions** (Delete, Deactivate, Unassign): production shows them as buttons; the candidate puts them behind "⋯" | Visible / behind "⋯" | Behind "⋯" (each still explains why it is unavailable) |
| 4 | **Phone bottom bar** (Call, Log call): production has none | Keep on the lead page / keep on lead and opportunity / remove | Keep on the lead page only |
| 5 | **Pre-Sales opening view** | All / "Needs an owner" / the queue you used last | The last queue used in this tab, "All" the first time |
| 6 | **Email in the header** (phone and product are decided by D1) | Always / desktop only / only in the details panel | Desktop only, plus the details panel |
| 7 | **Where the returning-enquiry panel sits** once the banner exists | Main column, second panel (production) / side column (candidate) | Main column, second panel, as in production |
| 8 | **Reject's look**: production uses a red "danger" style; D3 asks for neutral | Red as in production / plain secondary button (its confirmation dialog stays red) | Plain secondary button |

Phase status: Phase 1 (comparison and decisions) is in progress; nothing is implemented. Port 3106 is not used until Phase 3.
