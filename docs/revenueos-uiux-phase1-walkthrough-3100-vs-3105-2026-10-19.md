# Phase 1 walkthrough — production (3100) vs redesign (3105)

Analysis only. Nothing is implemented, merged or deployed in this phase; production is only ever viewed.

## 1. What you are comparing (re-verified 2026-10-19, read-only)

| | Production | Redesign preview |
|---|---|---|
| URL (through your tunnel) | `http://localhost:3100` | `http://localhost:3105` |
| Commit | `5114eb9` (live checkout, branch `revenueos-remediation`) | `2477799` (branch `revenueos-uxi`) |
| Build ID | `JOnUv4aCQzMpztv4Kiwfr` | `h9wU9mz1KiQWmb2rCUHhs` |
| Service | system service `texzium-frontend`, up since Oct 18 00:12, unchanged | plain scratch process, up since Oct 18 22:06 |
| Backend and data | production backend :3000, **real data** | scratch backend :3002, scratch database `rev_enh_verify` |
| Sign-in | your own production login | scratch accounts (`admin.five.1@scratch.test` full; `priya.presales.2@scratch.test` restricted); password on line 2 of `scratchpad/ux/scratch_test_password.txt` |

Tunnel for both (your established ports): `ssh -N -L 3100:127.0.0.1:3100 -L 3105:127.0.0.1:3105 root@97.74.81.245`.
Port 3106 is **not used** in this phase (an idle scratch process of mine; it will be repurposed only in Phase 3).

**Two caveats about the comparison:**
1. The two versions show **different records** (production's real data vs scratch). Compare *kinds* of screen, not the same lead. On 3100 pick: a lead that has a call logged and a follow-up; a lead with an earlier enquiry from the same person if you have one; an opportunity that already has a quotation.
2. On 3100 **look, don't act.** Do not confirm any dialog (Assign, Qualify, Reject, stage move, Log call…) and do not create anything. Opening a dialog and pressing Cancel is harmless; pressing the confirm button would change production data.

## 2. Screens to open, and what to expect

Scratch records on 3105 (admin account):
- Dev Patel (CNC call logged, no owner): `/leads/9576a07c-c1ba-4119-aedf-fd88f37a18bf`. The duplicate check reports **1 repeat enquiry** (an earlier rejected enquiry of the same name) and no open duplicate: on 3105 the returning-enquiry panel says so, but **Next up says nothing about it** (it reacts only to open potential duplicates). This is the D2 gap, live.
- Esha Gill, two open enquiries: `/leads/e27c75b5-7372-485f-9e67-23e8f818a637` and `/leads/1078c170-3049-4640-b0b2-d819bf7a8533`. Each reports **1 potential duplicate**, so Next up shows "Another open enquiry looks like this one".
- Ravi Kumar (qualified, with a deal): `/leads/de67059f-358e-4338-b20c-1321bf0016fa`. The check reports **1 linked customer**; Next up says nothing about it, the panel does.
- Opportunity with a customer, a stage move done and a quotation: `/opportunities/6cfe4759-efa1-4417-8c92-8bfe8b044d45`.
- Opportunity ready for a quotation: `/opportunities/fa1a16a9-9ddf-4562-854d-f8294060f68f`.

### A. Lead page — D1 (compactness, repeated actions) and D2 (returning enquiries)

| Look at | On 3100 (from its code) | On 3105 (seen in the browser) | Your question |
|---|---|---|---|
| First screen at your usual window size | One card: avatar, name, tags, call/email/meet/WhatsApp buttons, a row of up to 8 action buttons, then an info grid (phone, place, email, product, next follow-up), then the lead → opportunity trail | Header with four facts, contact buttons, two action rows plus a reason line, a five-step journey; "Next up" starts at the fold on a 1536×679 window | Is the redesign's header too tall? Can you see what to do next without scrolling? |
| Where the phone number is | In the first card's info grid | Side panel, after the history on a phone; not in the header | Do you want it in the header (D1 says yes)? |
| Action buttons | Up to 8 in one row, disabled ones explained only by a tooltip | Work row + decision row; disabled ones list a reason line; Delete/Deactivate/Unassign/Edit in the "⋯" menu | Hidden "⋯" for Delete/Deactivate: better or worse than visible? |
| "Next up" | Not present | A card with ordered suggestions and buttons | Does it help, and are any lines noise? |
| Repeated buttons | Each action appears once | Assign in the row and in Next up; Log call in the row, Next up, history header and the phone bar | Confirms D1's "one location per action" |
| Returning-enquiry / duplicate panel | Second panel of the main column (after Follow-ups) | Last panel of the side column; Next up mentions only open potential duplicates | Open Dev Patel, Esha Gill and Ravi Kumar on 3105: which of the three would you have noticed without opening the panel? (D2) |
| Phone width (browser device toolbar, 390) | Not seen by me; expect the wrapped button row | Fixed "Call / Log call" bar at the bottom; contact details far down | Is the bottom bar wanted? |

### B. Pre-Sales

| Look at | On 3100 | On 3105 | Your question |
|---|---|---|---|
| Concept | A filter report of leads by pre-sales person, held-by, status | Seven counted queues above the same list; ‹ › on the lead to step through | Do the queues match how pre-sales actually work? Which queue should it open on? |
| Qualification | Qualify button → choose sales owner → confirm | Same dialog; plus "Spoken to — qualify or reject when you've decided" after a connected call | Confirms D3 (the prompt goes) |

### C. Opportunity list, detail and stages — D3 (facts, not nudges)

| Look at | On 3100 | On 3105 | Your question |
|---|---|---|---|
| List | Table with sortable headers; the Product column shows "—" for every row | Search box, cards on a phone, real product from the lead | Fixed defect; anything missing from the table? |
| Detail layout | One large card (identity, trail, stage bar and buttons, facts, history) with the customer and quotations on the right | Header with four facts and a probability bar, stage bar, a second five-step journey strip, Next up, then history/customer/quotations | Two progress strips: keep one? which? |
| Stage move | Stepper + Move / Back / Mark Lost buttons → confirmation with remark | Same, and Next up repeats "Move to …" | One location only |
| Flags | None | "Expected close date passed", "No contact logged for N days" (14-day constant) | Wording and tone (D3: neutral facts) |

### D. Quotation creation and navigation

| Look at | On 3100 | On 3105 | Your question |
|---|---|---|---|
| Entry point on an opportunity | "+ Create Quotation" link in the Quotations panel header | Same link plus a Next up "Create quotation" when ready | One primary entry |
| The form | Defaults to the first item; a missing HSN is only reported by the backend after submit; error text stays after you fix a field | Identical form; the refusal is shown as an alert and the first invalid field is focused | Both need the form fixes listed in the register |
| After creating | Toast; quotation in the table | Toast; quotation with its next step, journey strip updates | — |

(Do **not** create a quotation on 3100.)

### E. Shared navigation and structure — D4 (Previews)

| Look at | On 3100 | On 3105 | Your question |
|---|---|---|---|
| Sidebar | Contacts under Accounts; Activities, **Tasks**, Notes under Activity (counts show "Demo" for the sample-data ones) | **Follow-ups** under Activity (real); a **Previews** group: Contacts, Activities, Notes, with a notice on each page | Is "Previews" unmistakable enough? |
| Top bar | Breadcrumb; search hidden on narrow screens | Search icon on narrow screens; breadcrumb parent is a link | — |
| Tab key | No skip link; closed phone drawer is tabbable | "Skip to content" on the first Tab | — |
| Developer notes | "Design note" boxes at the bottom of ~17 pages | Removed | — |

## 3. How to run the comparison (about 15 minutes)
1. Open both in two browser windows side by side (or two tabs), same window size.
2. For each table above, open the same kind of screen in both and answer the "your question" column in a line or two. Screenshots help: send them as you like, or just describe.
3. In the toolbar press F12, then Ctrl+Shift+M, choose 390 px wide, and repeat for the lead and the opportunity.
4. Then use the decisions and the extra preference items in the register (§7–§8 of `revenueos-uiux-comparison-production-vs-redesign-2026-10-19.md`).
