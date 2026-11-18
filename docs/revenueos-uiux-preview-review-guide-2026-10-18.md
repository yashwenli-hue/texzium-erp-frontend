# RevenueOS UI/UX release candidate — preview and review guide

**What you are reviewing:** frontend commit `24777994f0bd4ac1d5ca94f3f0a480ddf4387b43` (`2477799`, branch `revenueos-uxi`),
scratch build **`h9wU9mz1KiQWmb2rCUHhs`**, served on **127.0.0.1:3105** of the server, talking to the **scratch backend :3002**
and the **scratch database `rev_enh_verify`**. It is not production and shares nothing with it.
Production, for comparison: commit `5114eb9`, build `JOnUv4aCQzMpztv4Kiwfr`, port 3100 (do not open it for this review).
Other scratch servers on :3101 and :3102 are *older* builds: ignore them.

## 1. Open it

Run on your PC (Windows PowerShell or any OpenSSH client), and leave it running:

```
ssh -N -L 3105:127.0.0.1:3105 root@97.74.81.245
```

Then open **http://localhost:3105/login** in your browser. If port 3105 is already in use on your PC, an old tunnel is still
running; close it first. (Nothing is exposed publicly: the preview listens on the server's loopback only.)

**Confirm it is the release candidate (any one is enough):**
- Press **Ctrl+U** on the login page and search for `h9wU9mz1KiQWmb2rCUHhs` — it must be found. Production shows `JOnUv4aCQzMpztv4Kiwfr` instead.
- Sign in, then press **Tab** once: a **"Skip to content"** link appears top-left. Production has none.
- The sidebar has a **Follow-ups** entry and a **Previews** group (Contacts, Activities, Notes). Production still has "Tasks" and no Previews group.

## 2. Accounts (scratch only; password is **not** a real credential)
The shared scratch test password is on line 2 of `/tmp/claude-0/-root-texzium-erp-frontend/3b2d99b5-81a3-4312-bb4a-d20732bed259/scratchpad/ux/scratch_test_password.txt`
(`sed -n 2p` of that file; it is a scratch-only password).

| Account | Role | Use it to see |
|---|---|---|
| `admin.five.1@scratch.test` | SUPER_ADMIN, with **temporary review grants** (see §6) | everything: Pre-Sales queues, assign / qualify, opportunities, creating a quotation |
| `priya.presales.2@scratch.test` | PRE_SALES | a pre-sales person's view: leads, follow-ups (view only), **no** opportunities or quotations → access-denied states |
| `sam.sales.4@scratch.test` | SALES | a sales person's view, also **no** opportunity or quotation access |

Sign out and in between accounts (the permission list is read at sign-in). Chrome's "Incognito" window per account avoids mixing sessions.

## 3. What to look at (about 20 minutes)

**As admin.five.1**
1. **Dashboard** → "Today's Focus" now lists real follow-ups and unowned leads (rows are links).
2. **Pre-Sales** → seven queues with counts (Needs an owner, Follow-up due, Not connected, Never called, Worked by me, Handed to sales, All). Click one, open a lead: top-right shows **"3 of 6 in Pre-Sales · Needs an owner" with ‹ ›** to step through the queue.
3. **A lead** (e.g. Dev Patel, Ravi Kumar) → header with held-by, last call, next follow-up; **Next up** card (what to do first); actions grouped (work / decisions) with the reason line for anything your role can't do; **⋯** menu (use the arrow keys, Esc); Deal panel; returning-enquiry panel; follow-ups with Complete / Reschedule / Cancel (Cancel asks first).
4. **Assign** a lead, then **Qualify** it (you must confirm in each dialog; nothing changes before that), then **Create opportunity** from the Next up card. Leave the customer empty to see the "Link a customer before quoting" blocker (red, first).
5. **Opportunity page** → journey strip (Received → Pre-sales → Qualified → Opportunity → Quotation), stage stepper, "Move to Proposal" asks for confirmation and a remark, customer link / change / remove, close-date and quiet-deal flags.
6. **Quotation creation** → on "Orbit looms" press **Create quotation**: leave the price empty (inline message, focus moves to it), pick **Needle Loom 100 (NL-100)** (Braider 16 has no HSN, the backend refuses it and the form shows that as a red alert), quantity 2, price 480000, **Create**. A toast, the quotation in the list, and on its page the tax and total computed by the backend. (This adds one scratch quotation per run; it is harmless.)
7. **Follow-ups** page (`/tasks`) → Overdue / Due today / Upcoming groups, search, "Assigned to me".
8. **Quotations / Opportunities / Sales Orders lists** → search box, cards on narrow screens.

**As priya or sam (restricted)**
9. Navigation shows no Opportunities / Quotations. Open `http://localhost:3105/opportunities/6cfe4759-efa1-4417-8c92-8bfe8b044d45` and `/quotations/d57eb503-9652-429c-b6e5-4e8d23c4d0cf` directly: you get **one "No access" panel naming the permission, no Retry**.
10. Open a qualified lead (Ravi Kumar): it says the deals **"aren't visible to you"** and offers no "Create opportunity" (it could duplicate a deal).
11. Assign / Qualify dialogs (if your role can open them) say why the list of people is missing instead of "nobody available".
(A genuine server or network error still shows "Couldn't load … Retry": to see that, stop the tunnel while a page is open and press Retry.)

## 4. Mobile layouts
In Chrome/Edge press **F12**, then **Ctrl+Shift+M** (device toolbar), choose a phone (e.g. iPhone 12, 390 wide) and a tablet (820). Check: no sideways page scroll; the **☰** menu opens a drawer, closes on a tap outside or Esc; a **search** icon appears in the top bar; the lead page has a **Call / Log call** bar fixed at the bottom; Pre-Sales queues scroll sideways inside their own row; dialogs are full-height sheets with the buttons always visible; lists become cards.

## 5. What is deliberately unchanged / limits
- Same business rules: nothing is qualified, assigned, merged, deleted or rejected unless you confirm a dialog; returning-enquiry and duplicate-GSTIN panels are unchanged.
- Contacts, Activities and Notes still run on sample data (no backend); they now say so.
- Not tested on a physical phone; the checks used a desktop browser at phone widths.
- Preview data is scratch: 12 leads, 2 opportunities, 2 quotations, 3 follow-ups.

## 6. Clean-up (after the review; I do it when you tell me, or you can)
The review grants are on the **scratch** SUPER_ADMIN role only (users.view, leads.qualify, leads.reject, leads.status.update,
leads.followups.create, opportunities.view/create/edit, quotations.view/create), ids `uxi5-*`. To remove them:
```
delete from "RolePermission" where id like 'uxi5-rp-%';
delete from "Permission" where id like 'uxi5-perm-%';   -- in database rev_enh_verify only
```
The preview server is left running until you say stop (`kill` the process on 127.0.0.1:3105; I'll do it on request).
**Production was not touched.**
