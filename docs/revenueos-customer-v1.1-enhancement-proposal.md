# RevenueOS — Customer V1.1 Enhancement Proposal

**Status:** proposal only. No code, schema, migration or DB change was made to produce it. Nothing here is approved.
**Date:** 2026-10-07 · **Baseline:** frontend `03a8380`, backend `7c10ab0`, Customer V1 active in `texzium_erp`.
**Method:** read of the Customer cockpit, list, forms, hooks, rules and history components; the backend overview/statement/reminder services; the Quotation, Proforma, Sales Invoice, Payments, Opportunity and Lead screens; the CP7/CP8 browser sessions (real data, desktop/tablet/mobile); the 2026-09-23 baseline for the Finance-side capabilities.
**Constraints honoured:** frontend only; backend read-only; the 1–5 existing-capability classification and the 1/2/3 scope tag are applied to every item.

Legend — **Capability:** (1) existing, reuse · (2) existing, extend · (3) existing, replace · (4) new · (5) out of scope. **Scope:** S = screen-specific · P = reusable RevenueOS pattern · X = broader design-system/platform change.

---

## 1. Current Customer experience assessment

**What works and should be kept**
- The data model is right: one governed customer, GST registrations as first-class records, an event history, and a single overview call that returns the whole chain by id (`GET /customers/:id/overview`).
- Guardrails are visible: duplicate block while typing, "can't be quoted yet", inactive callout with who/when/why, visible reasons for disabled actions (CP8), designed loading/empty/error/403 states, bottom sheets on phones.
- Everything is verified against the real backend and the real DB.

**What is weak (evidence from the real data and the browser sessions)**
1. **The cockpit answers "who", not "what now".** Its first screen is identity, three flat buttons, a four-line "Ready to quote?" checklist and two callouts. The commercial picture (deals) is the third card, below GST. History is a separate column.
2. **The flagship real customer looks empty.** Raj Traders shows "No deals linked yet" and five `₹0.00` tiles, while its one real deal (4 quotations, 3 of them approved) is a *"Possible matches to link"* panel four cards down. The single most valuable action on that screen is the least visible.
3. **Deals are an indented dump.** Each deal is a nested list (quotation → proformas → orders → invoices, indented) with the same row treatment at every level. You cannot see at a glance where a deal is in the lifecycle, or what is stuck.
4. **Money is flat.** `formatInrExact` everywhere: five tiles of `₹0.00`, no "overdue", although every receivable's `dueDate` and balance are already in the overview. Elsewhere in the app the same values appear as `₹2.5 L`.
5. **Nothing points back to the customer.** The quotation, proforma, sales order and invoice screens show the *lead's* name and link to the *lead*; none imports a customer hook. The Payments page prints a name as text. The lead page has no customer concept. The customer is a dead end that nothing leads into.
6. **No "create the deal" from the customer.** The cockpit tells you to "choose this customer when creating an opportunity" but offers no button.
7. **Two-step setup is two trips.** Create customer → land on the cockpit → press "Add GST registration". A customer that can never be quoted without a GST registration is created without one.
8. **History is flat.** Opportunity link/unlink events carry `opportunityId` but render as plain text; no filter; a legacy customer's history is a paragraph of apology.
9. **Lifecycle decisions are made blind.** Deactivation says "everything is kept", but not *what is open* (deals in progress, unpaid invoices). All of that is already in the overview.
10. **Header actions are three equal buttons**, two of which are usually disabled-with-explanation on an inactive customer, producing a stack of reason text above the actual message.
11. **List rows carry two tags** (Active + "Can't be quoted yet") for what is really one state, and no sorting.

## 2. Functional gaps (what is missing or awkward)

| Gap | Why it matters to the workflow | Source of the data |
|---|---|---|
| A prioritised **"what needs attention next"** | The user currently has to read four panels to find the next step | Derivable from existing overview + statuses |
| **Where each deal is** in Opportunity → Quotation → Proforma → Order → Invoice → Paid | Answers "where are the deals" and "what's stuck" without opening five documents | Overview (all ids and statuses present) |
| **Overdue / due soon** receivables | The real money question, absent today | `receivables[].dueDate`, `balanceAmount` already returned |
| **Open pipeline value** (expected value of open deals) | "What could be sold" next to "what was sold" | `opportunities[].expectedValue/probability/stage` already returned |
| **Create a deal for this customer** | Closes the loop from the customer side | Needs a qualified lead (backend rule); `OpportunityForm` already accepts a customer |
| **Create customer + first GST registration in one flow** | Removes the guaranteed second trip | Two existing endpoints, sequenced |
| **Link back** from every document to its customer | Lets people move up from a document to the account | `Quotation.customerId` exists; the other documents resolve it through their quotation/opportunity, which their pages already load |
| **Impact preview before deactivation** | A destructive-ish decision shown with its consequences | Overview |
| **GST usage** ("used on N quotations") | Informs deactivate/edit decisions | `quotations[].buyerGstId` in the overview |
| **History that can be filtered and followed** | Audit questions ("who changed the PAN", "which deal was linked") | Events already carry the references |
| **Clickable contact** (mail / call / WhatsApp) | Customer contact is a daily action | Existing `QuickActions` component |

Information that **exists in the backend but is not surfaced:** receivable due dates and paid/balance split; quotation `buyerGstId`; proforma validity and expiry; invoice posted/draft; opportunity probability and expected close (shown only as text inside a deal header); the order/proforma amounts as a chain per deal; `legacyMatches` (surfaced, but buried).

**Not surfaced because the backend does not support it (kept out):** customer contacts, notes, owner/account manager, activities (those modules are mock-only), per-customer statement by id (statements are keyed by customer *name*, see §13), persisted collection reminders, real payment links.

## 3. UX/UI weaknesses (by area)

- **Information hierarchy** — identity, then process hints, then GST, then deals. Should be identity → next action → deals → GST/details/history.
- **Density and grouping** — five cards of similar weight; the deal list uses indentation to show a hierarchy that is really a *sequence*.
- **Actions** — equal-weight buttons; the primary action changes with state (Add GST / Reactivate / Link a deal / Quote) but is not always the primary-styled one.
- **Status treatment** — status is a tag in four places (header, checklist, callout, list). One readiness state would carry it.
- **Money presentation** — exact rupees and paise for scanning contexts; zero tiles shown at full weight.
- **Tablet** — the cockpit is one long column with the desktop sidebar still open; the first screen is almost all header and actions (CP8 fixed the list, not the cockpit's order).
- **Mobile** — correct and tidy, but long: no way to jump to Deals / GST / History.
- **Themes** — both themes hold up (CP8 measured); the lock note and a few muted texts are the only contrast watch-items (`--muted` light is 4.32:1, a platform token).

## 4. Opportunities for genuinely better functionality

Each states the workflow reason, not just the component.

1. **A "Next up" strip, computed from the chain** (new capability, pure function). It replaces the checklist panel *and* both callouts. Priority order (first that applies is the headline, up to three shown): inactive → no active GST → existing deal that looks like this customer (link it) → no deals → quotation awaiting approval (draft/revised) → approved quotation without a proforma → proforma pending approval or **expired** → approved proforma without an order → order waiting on approvals → draft invoice → **overdue receivable** → "All caught up". *Why:* the user's first question is "what do I do with this customer", and today the answer is spread over four places. It would also turn Raj's buried "link the 4-quotation deal" into the headline.
2. **A deal progress chain per deal** — Opportunity stage → Quotation → Proforma → Order → Invoice → Paid, one compact chip per step with status and amount, the current step emphasised, the next step as text. Multi-quotation deals expand to the document list. *Why:* "where are those deals in the lifecycle" is answered in one glance, and it uses the same visual language as the quotation cockpit's document chain, so it feels like RevenueOS.
3. **A commercial snapshot that shows only real numbers** — open pipeline (expected value), quoted, ordered, invoiced, collected, outstanding with **overdue** called out. Hidden when a customer has no deals (the Next-up strip speaks instead). *Why:* five zero tiles say nothing and push content down.
4. **Create-and-add-GST** as one two-step dialog (details → optional first registration; skippable). *Why:* a customer is not quotable without GST; do it while the GSTIN is on the person's desk.
5. **New deal from the customer** — `OpportunityForm` gets a locked customer; the lead list suggests same-name qualified leads. *Why:* closes the customer → opportunity → quotation loop from the account page. The backend requires a qualified lead, so the dialog says so and links to Leads when there is none.
6. **Customer chip on every commercial document** (quotation, proforma, order, invoice, opportunity list) linking to the cockpit. *Why:* people navigate *up* from a document to the account constantly; right now they can only go to the lead.
7. **Deactivation impact preview** — "3 open deals, 1 draft quotation, ₹2.1 L outstanding (₹0.4 L overdue)", from the overview. *Why:* the decision is irreversible only in effect (you can reactivate), but the consequences are currently invisible.
8. **GST registration usage** and a calmer list (inactive collapsed, default explained once). *Why:* tells you what deactivating or editing a registration touches.
9. **History you can filter and follow** — All / Details / GST / Deals; opportunity events link to the opportunity; grouped by day. *Why:* turns the history from a log into an audit tool.
10. **Quick contact** — email/phone as links and the existing Call / Email / WhatsApp quick actions. *Why:* reuse of a pattern users already know from leads and opportunities.
11. **A customer list that states readiness once** — "Ready to quote / Needs GST / Inactive" as one pill, GST states as a chip ("Gujarat +1"), sortable columns, an "Also a vendor" filter.

## 5. Proposed information architecture — the cockpit

The cockpit must answer, in this order, in the first screenful: *who · active? · can I quote · what next*; then *GST, deals, sold, invoiced/received* without scrolling past low-value content.

```
A  IDENTITY             name · code · type · PAN · [Active] [Ready to quote] [Also a vendor]
   (header card)        email · phone (links) · Call/Email/WhatsApp
                        [ Primary: the next action ]  [ ⋯ Edit · Add GST · Deactivate ]
B  NEXT UP              one prioritised headline + up to 2 more; every item is a button/link
                        chips:  ✓ Active   ✓ GST (2 active · default Gujarat)   ! Deals (0 linked)
C  SNAPSHOT             Open pipeline · Quoted · Ordered · Invoiced · Collected · Outstanding (overdue)
                        (only when there is something to show)
D  DEALS (main column)  one card per deal: title · stage · expected value · probability · close
                        [Opp] → [Quotation] → [Proforma] → [Order] → [Invoice] → [Paid]
                        next-step text · expand: documents list · [New quotation]
                        suggested (unlinked) deals appear here as "Looks like this customer — Link"
E  RIGHT RAIL           GST registrations (compact cards, default marked, usage, ⋯ menu, lock note)
                        Details (contact, PAN, type, created/updated, vendor)
                        Activity (last 5, "All history" → filtered sheet)
```

Answers to your nine questions: *Who* = A · *Active* = A tags + B chips · *Can I quote* = A "Ready to quote" + B chips · *GST I can use* = E (and B chip) · *Opportunities/deals* = D · *Lifecycle position* = D chains · *Sold* = C quoted/ordered · *Invoiced/received* = C invoiced/collected/outstanding · *Needs attention* = B.

## 6. Proposed navigation and action model

- **One primary action, always the right one** (derived from the same function as Next up): Add GST registration → Link a deal / New deal → New quotation → Open the quotation awaiting approval → Open the overdue invoice → Reactivate. Everything else moves into an **⋯ action menu** that keeps the visible reason for any disabled item (the CP8 pattern, inside a menu).
- **The cockpit navigates; it does not duplicate document actions.** Approving, creating a proforma or an order stay on their documents (they own the rules, the dialogs and the history). The cockpit deep-links to the right place with the label of the next step ("Approve QT-8F53 →"). The one exception stays: **New quotation** from a deal, which already exists.
- **Customer ⇄ document links in both directions** (chip on documents; document links in the chain).
- **After create → cockpit, with the Next-up strip already pointing at "Add GST"** (or, with the two-step dialog, straight to "Link or create a deal").
- **Keyboard/AT:** the menu is a real menu button; the sections are landmarks/headings; the in-page nav (tablet/mobile) is a `nav` with `aria-current`.

## 7. Proposed desktop / tablet / mobile

**Desktop (≥1100):** two columns. Left (≈66%): Identity, Next up, Snapshot, Deals. Right (≈34%): GST, Details, Activity. The sidebar rail stays as today.

**Tablet (720–1100):** one column in the order A, B, C, D, E(GST), E(Details), E(Activity); snapshot as a 3-up grid; GST as a 2-up card grid; a sticky in-page nav (*Overview · Deals · GST · Activity*) under the top bar. (The full-width sidebar at tablet is a *platform* question, listed as deferred in CP8; this design does not depend on it because the layout responds to its own container.)

**Mobile (<720):** header compressed to name, status, one **full-width primary action** and the ⋯ button; Next up as the first card; snapshot as a 2-up grid; sticky in-page nav; each deal as a card with a **vertical** mini-chain; GST as cards with the ⋯ menu; Activity collapsed to the last 3 with "All history" in a sheet; every dialog a bottom sheet (done).

**Customer list:** table when it has room, cards when it does not (done, container-based). Rows get the readiness pill, GST-state chips, vendor tag, "updated"; sorting on name/created/updated; filters Active · Inactive · Can't be quoted · Also a vendor. Money columns are deliberately not proposed (see §11).

## 8. Reusable patterns to introduce or strengthen

| Pattern | What it is | Scope | Used first by | Could later serve |
|---|---|---|---|---|
| **Next-up engine + banner** | pure `attention(entity, chain, now)` → ordered `{severity, message, action}`; one banner component | P | Customer cockpit | Opportunity, Quotation, Lead pages |
| **StageChain (compact)** | horizontal/vertical chain of status chips, derived from the existing `DocumentChain` | P | Customer deals | Opportunity/quotation lists |
| **ActionMenu** | primary action + overflow menu, disabled items keep visible reasons, a sheet on phones | P | Customer header, GST rows | any page with >3 actions |
| **SectionNav** | sticky in-page anchors for long pages on narrow screens | P | Customer cockpit | long detail pages |
| **EntityChip** (CustomerChip) | name + code + status as a link | P | documents, lists | lead/opportunity chips |
| **MoneyText** | one rule: compact (`₹2.5 L`) in scan contexts, exact on demand/title and in documents | P (candidate **X**) | Customer cockpit/list | everywhere |
| **Two-step dialog** | a `Modal` with a step header and a skippable second step | P | Create customer (+GST) | other create flows |
| **Disclosure** | accessible expand/collapse for secondary lists | P | deal documents, inactive GST | anywhere |
| **Filter chips for history** | existing `Chip`s applied to the timeline | P | Customer history | document histories |

Nothing here changes the shell, theme tokens or routing. `MoneyText` is the one item I would flag as a *potential* design-system change: I propose to introduce it for Customer screens only and decide separately whether other screens adopt it.

## 9. Existing components and capabilities to reuse (class 1)

`DocumentActions` (+ `sharedReason`), `LifecycleCallout`, `LoadingRegion`, `Modal`/`ConfirmDialog`/`FormField`, `ResponsiveList` (container-based), `Tag` and the status tag set (`OpportunityStageTag`, `QuotationStatusTag`, `ProformaInvoiceStatusTag`, `SalesOrderStatusTag`), `DocumentChain`/`DocumentTrail`, `QuickActions`, `Chip`/`ChipGroup`, `PageHeader`, the lifecycle libraries (`quotationLifecycle`, `proformaLifecycle`, `salesOrderLifecycle`, `commercialChain`) for what each status *means*, `useCustomerDetail`, `CustomerForm` / `GstRegistrationForm` / `LinkCustomerDialog`, the duplicate-check hook, the whole repository/mapper layer and the mock parity harness, and every existing permission check.

**Extend (class 2):** `DocumentChain` (compact variant) · `OpportunityForm` (locked customer) · `CustomerHistory` (filters, links) · `CustomerForm` (second step) · `ResponsiveList` (sorting, richer cards) · document headers (customer chip) · `ConfirmDialog` (impact summary slot).

## 10. Existing components and capabilities to replace (class 3)

| Replace | With | Why |
|---|---|---|
| "Ready to quote?" checklist panel **and** the two callouts (inactive / can't be quoted) | one Next-up strip + three readiness chips | One source of truth; stops repeating the same sentence in four places |
| Three flat header buttons + their reason list | primary action + ⋯ menu | One obvious next step; reasons stay visible but quieter |
| The five-tile `₹0.00` KPI strip | the conditional snapshot | No empty metrics; adds pipeline and overdue |
| The indented `deal-docs` nested list | the per-deal StageChain with an expandable document list | Sequence is shown as a sequence |
| The separate "Possible matches to link" panel | suggested deals inside Deals, promoted into Next up | Puts the most valuable action where the eye is |
| The list's Active + "Can't be quoted yet" tag pair | one readiness pill | One state, one signal |
| The long "no lifecycle history" paragraph | one muted line | Quieter for legacy customers |

## 11. Backend changes required

**None.** Every item in this proposal is computed from, or sequenced over, endpoints that exist and were verified in CP1–CP8.

**Optional, *not* proposed for V1.1, each would need your explicit approval and its own design:**
1. Additive fields in the overview select (order inventory item and quantity, buyer GST on proformas/orders, owner names) — only if "what has been sold" should mean *products* rather than amounts. (To be verified against the schema before it is even proposed; nothing is assumed.)
2. A read-only `GET /customers/summary` (open deals, outstanding, overdue per customer) — only if the list should show money. Today there are three customers, so the cost of omitting it is nil; at scale the alternative (an overview per row) would be wrong.
3. An id-keyed statement (FinanceOS-owned) — see §13.

## 12. Backend changes explicitly not required

No schema change, no migration, no new permission, no new event type, no change to the overview, customer, GST or opportunity contracts, no new endpoint for Next up / deal chains / snapshot / impact preview / usage counts / list changes / create+GST / cross-links. The Next-up and "overdue" logic is **presentation derived from recorded data**; it is labelled as such and never persisted or sent.

## 13. Cross-OS ownership implications

- **FinanceOS** owns invoices, receivables and the ledger. The cockpit shows them **as recorded, read-only** (already the rule). "Overdue" is computed in the browser from the recorded due date and balance, mirrors the backend's own collection-reminder rule, and is labelled derived. **No** reminder, payment-link or statement actions are added: reminders are stateless (no model, no dispatch), payment links are fabricated strings, and **statements are keyed by customer *name*** against a name string in the ledger, which is the lead's name, not necessarily the customer's. Showing a statement on the cockpit would be wrong whenever the two differ. It waits for an id-keyed FinanceOS contract.
- **OperationsOS** writes order statuses beyond RevenueOS' own (e.g. ready for invoicing, dispatch created). The cockpit shows them neutrally with the raw label and **offers no action** on them. `isVendor`/`linkedVendorId` stay a read-only "Also a vendor" chip; there is no vendor screen to link to. The known risk that the vendor flow can still create a same-named/duplicate-PAN customer is unchanged and out of scope.
- **ComplianceOS** has no real GSTIN verification. The UI keeps saying "format checked" and never "verified".
- **HRMS** — none.
- **Contacts, Notes, Activities, Tasks** are mock-only modules. Customer cockpit will not show contacts/notes/owner (that would present fabricated or mock data in real mode). These are class 5 until those modules exist.

## 14. Proposed checkpoints

Each is frontend-only, one commit, scratch-first verification, and a stop for your approval. Recommendation: CP1 and CP2 may be **combined** (as CP4+CP5 were) if you prefer fewer stops; I would keep CP1 separate only if you want to approve the patterns before any screen changes.

| CP | Scope | Classes / scope |
|---|---|---|
| **1 Foundation** | Pure, tested derivations: next-up/attention, deal chain builder, overdue/aging, snapshot totals, deactivation impact, GST usage, money rules. Shared patterns: StageChain, ActionMenu, SectionNav, EntityChip, MoneyText, Disclosure. No screen changes beyond adopting them in a throwaway test harness. | 2/4 · P |
| **2 Cockpit** | The new information architecture on desktop/tablet/mobile; replaces §10 items; New deal from the customer (locked-customer `OpportunityForm`); suggested-deal promotion; ⋯ menu; quick contact. | 3/2 · S+P |
| **3 List + create** | Readiness pill, GST chips, sorting, vendor filter; two-step create-and-add-GST dialog with partial-failure handling. | 3/2/4 · S+P |
| **4 Links + lifecycle** | Customer chip on quotation/proforma/order/invoice/opportunity list; deactivation impact preview; GST usage; history filters/links/grouping. | 2/4 · P |
| **5 Browser verification and polish** | Real-mode pass with your session (read-only first, then an agreed minimal write budget on the smoke customer only); responsive sweep; light/dark contrast; a11y; screenshots before/after; DB audit. | verification |

## 15. Verification strategy

1. **Pure logic first.** Unit tests for every derivation against *real overview responses* captured from the activated DB (Raj, ABC, the smoke customer) and against the scratch-DB chain copy (`load_chain.sh`) that contains a linked deal with quotations, proformas, orders, invoices and receivables. Table-driven tests for the Next-up priority order, including ties and legacy rows.
2. **Mock/real parity.** The mock repository and the fake-backend harness serve the same contract; the same scenario must render identically (the CP5 harness).
3. **Static markup UI tests** (`renderToStaticMarkup`) for every state: loading, empty, error, 403, inactive, no GST, with deals, with overdue, legacy match, no permission.
4. **Throwaway-copy `tsc`/lint/build**, and every earlier suite as a regression gate (all still pass at `03a8380`).
5. **Responsive evidence.** Same-origin iframe harness at 320/390/820/1024/1440 with screenshots and an overflow sweep, plus forced loading/empty/403/500 states (technique proven in CP8).
6. **Real browser pass** through your tunnel: read-only on Raj/ABC/smoke customer first; one clearly-labelled smoke deal path only if you agree to it; **no persistent Opportunity→Customer link on a deal that already has quotations** (Raj's deal is shown as a *suggested* link and verified as UI state, as in CP8).
7. **Accessibility:** structural audit (headings, names, landmarks, targets, `aria-describedby` on disabled controls), measured contrast in both themes, honest note that real Tab traversal cannot be exercised by the browser tool and needs a quick manual pass from you.
8. **DB fingerprint** before/after every write session; only the smoke customer's rows and events may change.
9. **A linked-deal real-contract preview** (optional): run the compiled backend against a **scratch** DB copy on a spare loopback port with a scratch-only test user, so you can see a cockpit with a full chain in your browser without touching the real data. Needs a second tunnel port.

---

## Appendix A — enhancement register (classification)

| # | Enhancement | Capability | Scope | Workflow reason |
|---|---|---|---|---|
| 1 | Next-up strip | 4 new (replaces 3) | P | The next step without reading four panels; promotes the buried real deal |
| 2 | Deal StageChain | 3 replace | P | Lifecycle position at a glance |
| 3 | Conditional snapshot + overdue + pipeline | 3 replace | S | No empty tiles; the money question answered |
| 4 | ⋯ ActionMenu | 4 new | P | One obvious next action, quieter reasons |
| 5 | SectionNav | 4 new | P | Mobile/tablet jump between long sections |
| 6 | Create + add GST | 2 extend | S (two-step = P) | Removes the second trip |
| 7 | New deal from the customer | 2 extend | S | Closes the customer → deal loop |
| 8 | Customer chip on documents | 2 extend | P | Navigate up from any document |
| 9 | Deactivation impact preview | 2 extend | S | Decide with the consequences visible |
| 10 | GST usage + calmer list | 2 extend | S | Know what a change touches |
| 11 | History filters + links | 2 extend | P | Audit and navigation |
| 12 | Quick contact | 1 reuse | S | Daily contact action |
| 13 | List readiness pill / sorting / vendor filter | 3 replace / 2 extend | S | One state, one signal; find things |
| 14 | MoneyText rule | 4 new | P (candidate X) | Scannable money |
| 15 | Customer money columns in the list | 5 out of scope (needs `GET /customers/summary`) | — | Not worth a backend change at 3 customers |
| 16 | Statement / reminders / payment links on the cockpit | 5 out of scope (FinanceOS) | — | Name-keyed / stateless / fabricated |
| 17 | Contacts / notes / owner on the customer | 5 out of scope | — | No backend; modules are mock-only |
| 18 | Shell icon rail at tablet, nav landmark, skip link, search label | 5 out of scope here (platform, deferred in CP8) | X | Separate decision |
| 19 | Customer merge / dedupe of legacy duplicates | 5 out of scope | — | Ledger is name-keyed; needs FinanceOS decision |

## Appendix B — what the real data looks like (why some items are weighted as they are)

- 3 customers: Raj Traders (2 active registrations, 0 linked deals, 1 suggested deal with 4 quotations — 3 approved, 1 revised), ABC Industrial Suppliers (no registration, also a vendor), the CP7/CP8 smoke customer.
- 4 opportunities, none linked. 8 sales orders and 6 invoices exist but belong to unlinked chains, so a customer cockpit cannot show them until their deal is linked — which is exactly why surfacing the suggested link matters.
- Scale is tiny, so list aggregates and pagination are not worth backend work now; chain clarity and next-step guidance are.
