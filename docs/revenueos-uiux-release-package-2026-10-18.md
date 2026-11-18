# RevenueOS UI/UX release — deployment package (2026-10-18)

**Release candidate:** frontend `2477799` (branch `revenueos-uxi`, 22 commits on the deployed `5114eb9`).
**Status: prepared and rehearsed on an isolated clone. Nothing merged, pushed, deployed or restarted.
Waiting for your explicit approval.** Frontend only: no backend, database, migration, permission or environment change.

Evidence behind it: `docs/revenueos-leads-presales-opportunity-redesign-2026-10-18.md` (register, §1–§8) and
`checks_final_2477799.txt` (scratchpad): tests 130/130, typecheck rc=0, lint clean, production build OK, 45/45 responsive
checks, quotation creation verified once (one row), grants removed and 403 verified with a fresh token.

## 1. Repository state verified (2026-10-18 ~23:10)

| Item | Value |
|---|---|
| Worktree `…/scratchpad/ux/fe` | branch `revenueos-uxi`, HEAD `24777994f0bd4ac1d5ca94f3f0a480ddf4387b43`, **0 tracked changes, 0 untracked** (only the tool-written `tsconfig.tsbuildinfo` is modified, never committed) |
| Ancestry | `5114eb9` is an ancestor; no merge commits; 22 commits ahead, 0 behind `revenueos-remediation` (tip `5114eb9`) → **the merge is a fast-forward** |
| Live checkout `/root/texzium-erp/frontend` | branch `revenueos-remediation`, HEAD `5114eb9`, tracked tree clean, nothing untracked/ignored outside `docs/`, `.next/`, `node_modules/`; no remote configured (nothing to push) |
| Diff vs `5114eb9` | 84 files (57 M, 26 A, 1 D), +3,287 / −1,253; only under `app/ components/ lib/ tests/`; **no** change to `package.json`, lockfile, `next.config.js`, `tsconfig.json`, env or `docs/` |
| Scan of added lines | no scratch emails, passwords, tokens, ports, record ids or test data; no AI/co-author lines in commit messages |
| Merge collisions | none (no `docs/` path is touched by the branch) |
| Production now | backend pid 1198136 (since Oct 17 23:37, build d9fc0c5), frontend pid 1202663, unit `texzium-frontend`, build `JOnUv4aCQzMpztv4Kiwfr`; scratch frontend `:3101` pid 3965153 |

Source = tested commit: the checks in the register ran on this exact tree (`d8d84bc6248e6fb0201a20ac9a741e45f91cc50a`);
the scratch build `h9wU9mz1KiQWmb2rCUHhs` was built from it. Note: the **production build will get a different BUILD_ID**
(Next.js generates one per build, and embeds the repository path); identity is proven by HEAD + content markers, below.

## 2. Release contents

22 commits, oldest first:
`10f4e34` accessible shell · `bceb1a4` keyboard back links / search results as links · `be5a25e` plain-language page help, notifications ·
`bd390c9` Follow-ups workspace, Previews, filter chips as buttons · `6c52efe` responsive document lists with search ·
`be31fdf` refused sign-in message · `f55123c` permission-aware navigation, access states on lists · `403b922` phone drawer focus ·
`4a687de` reschedule pre-fills local time · `4778cc8` calendar-day labels · `7e5c373` shared workspace patterns ·
`760aa16` lead workspace · `a598134` Pre-Sales queues · `8da953f` opportunity workspace · `0a701df` Assign/Qualify refused-list message ·
`1061cc6` merged permission lines · `34dc294` blocker first, journey label · `97e1504` dialog errors announced, focus first invalid field ·
`a5cc5a6` owner "Name not available" · `38074a9` lead/opportunity no-access state · `9693a96` unreadable deals shown as not visible ·
`2477799` document pages: one no-access state, Retry only for real failures.

Changed paths: `git diff --name-status 5114eb9..2477799` (84 entries). Group summary:
- shell: `components/shell/{AppShell,Sidebar,Topbar}.tsx`, `app/globals.css`
- pages: `app/{access,activities,contacts,dashboard,leads,leads/[id],notes,notifications,opportunities,opportunities/[id],pipeline,presales,proforma-invoices,proforma-invoices/[id],quotations,quotations/[id],reports,sales-invoices,sales-invoices/[id],sales-orders,sales-orders/[id],search,tasks}/page.tsx`
- new components: `FollowupActions, FormError, ListSearch, LoadFailure, QueueBar, RecordJourney, RecordPager`; changed `ConfirmDialog, NextUp, PageHeader, ResponsiveList, Tag`; **deleted** `ComingSoon.tsx` (unused)
- forms (shared error display): 15 files under `components/forms/`
- logic: `lib/{format,pageMeta,api/httpClient,types/domain}.ts`, `lib/hooks/{useAssignableUsers,useFollowupWorklist,usePresalesQueueCounts}.ts`, `lib/repository/{interfaces,mock/mockLeadFollowupRepository,real/mappers,real/realLeadFollowupRepository,real/realOpportunityRepository}.ts`, `lib/repository/shared/{followupWorklist,leadWorkspace,opportunityWorkspace,presalesQueues}.ts`, `lib/ui/{attention,listSearch,notificationGroups,recordSequence}.ts`
- tests: 9 new test files (130 tests total; 73 before)

New backend usage: the frontend now calls the **existing** `GET /lead-followups` (leads.followups.view, record-scoped). No new route, no new field.

## 3. Deployment

**Script:** `/tmp/claude-0/-root-texzium-erp-frontend/3b2d99b5-81a3-4312-bb4a-d20732bed259/scratchpad/release/activate_uxi_fe.sh`
sha256 `4c9e9bd11f5e65881cf38919c7d3181ac3a5ad6921e485b70e8b170a58b180cc` (copy in `/root/backups/revenueos_uxi_release_20261018/`).
It is the verified `activate_enh_fe.sh` (used for the 5114eb9 deploy) with new constants and markers — see §4 for what was
changed and why the old script could **not** be reused as is.

### Prerequisites (all checked today)
1. Backend `d9fc0c5` running on :3000 and answering (the script re-proves this: process cwd, start time, anonymous PATCH `/roles/:id/permissions` via the proxy → 401).
2. Live checkout clean and at `2477799` — step 1 below makes it so.
3. Google Fonts reachable for the in-place build (checked: 200); 148 GB free; `/root/backups` on the same filesystem (rename, not copy).
4. Scratch frontend `:3101` still pid 3965153 (the script leaves it alone).

### Sequence (you run these; I run nothing)
```bash
# 1. Source only; the running server keeps serving its built .next, so there is no outage here
git -C /root/texzium-erp/frontend merge --ff-only revenueos-uxi

F=/tmp/claude-0/-root-texzium-erp-frontend/3b2d99b5-81a3-4312-bb4a-d20732bed259/scratchpad/release/activate_uxi_fe.sh
# 2. Read-only: checks HEAD, clean tree, running pid/build/proxy, runs the 130 tests, fonts, backend readiness
bash $F preflight
# 3. Verified copy of the running build -> /root/backups/frontend_next_pre_uxi_<TS>.tar.gz (+ SHA256SUMS), cache excluded
bash $F archive
# 4. THE CHANGE: stop the frontend, move .next aside, build, start texzium-frontend as a systemd-run unit
bash $F deploy
# 5. Anonymous HTTP checks only (no sign-in, no data): 59 checks (61 on the live paths: it also checks :3101 and the backend), prints ALL VERIFY CHECKS PASSED
bash $F verify
```
Then the browser acceptance in §5. **Rollback (only if you say so):** `bash $F rollback`.

### Expected service impact
- Frontend downtime from stop to serving: **about 50 s** (rehearsal: 51 s; earlier live deploys 39–67 s). Everyone sees the site unavailable for that time; sessions survive (no token or permission change, no sign-out needed).
- Backend: **not touched, no restart.** Database: not touched.
- If the build fails or the new server does not serve, `deploy` restores the previous build **automatically** (rehearsed with an injected build failure: restored byte-identical 38 s after the stop) and stops with the previous build serving.

## 4. What I checked about the existing scripts (rather than assuming)

`activate_enh_fe.sh` could not simply be re-run:
- it hard-codes `COMMIT=5114eb9`, the old pid `950046`, old build `941ztr-…`, and `MIN_TESTS=73`;
- its preflight **refuses** if the running build already has the 5114eb9 features (`has_new … && die`), which is exactly the case now;
- its preflight also refuses while any `frontend_next_pre_enh_*.kept` exists, and `frontend_next_pre_enh_20261018_001010.kept` (the rollback build for the last release) is there and must be kept.

`activate_uxi_fe.sh` changes: new commit/pid/build constants; its own file prefix `frontend_next_pre_uxi_*` (it never reads or touches
any `pre_enh` material); the 5114eb9 markers must be present in **both** builds, a new set of UI/UX markers must be
**absent from the running build and present in the new one** (verified against both real builds: 8 CSS rules, 8 client strings);
`MIN_TESTS=130`; verify covers all 32 routes and the new stylesheets; the old "everyone signs out and in again" line removed.

**Rehearsal (isolated clone at `5114eb9`, own node_modules copy, systemd unit `texzium-frontend-rehearsal-3106`, scratch backend :3002; live not touched):**
| Run | Result |
|---|---|
| preflight on the clone (fast-forwarded to 2477799) | OK, 130 tests |
| deploy with an injected build failure | build failed → **auto-restore**, whole-tree manifest identical to before, serving, tree clean |
| normal preflight → archive → deploy → verify | 51 s to serving; **all verify checks passed** (59) |
| rollback | previous build back in ~1 s + start, whole-tree manifest identical to the pre-deploy one |
| rollback with the kept copy deleted (from the archive) | restored; matches the archive manifest (the archive excludes `.next/cache`, so the cache is simply absent) |
| After every run | tracked tree clean, no stray files, clone untouched by anything else |

The rehearsed script differs from the final one in one `echo` string (the last verify line); `bash -n` passes.
Not rehearsed: running against the real live paths (that is what step 2–5 do, with the script's guards).

## 5. Post-deployment acceptance (you, in the browser, signed in as Super Admin)

| # | Check | Pass when |
|---|---|---|
| 1 | Identity | `git -C /root/texzium-erp/frontend rev-parse HEAD` = `24777994…`; `cat .next/BUILD_ID` equals the id `deploy` printed ("new pid …, build …") and `$W/deploy.ok`; `curl -s localhost:3100/login` references it; `systemctl status texzium-frontend` active, no restart policy |
| 2 | Health | `verify` printed ALL VERIFY CHECKS PASSED; `/var/log/texzium-erp/frontend_uxi_<TS>.log` has no error lines; backend pid still 1198136 |
| 3 | Shell | "Skip to content" appears on first Tab; breadcrumb parent is a link; on a phone-width window the menu opens, Escape and tapping outside close it |
| 4 | Leads / Pre-Sales | Leads list unchanged (filters, phone search, deactivated toggle); Pre-Sales shows the seven queues with counts; choosing one filters and opening a lead shows "n of m in Pre-Sales · …" with working ‹ ›; on a lead: Next up, last call, actions grouped, "⋯" menu with arrow keys |
| 5 | Lead actions | Log call / Log CNC open the existing form (no outcome preselected); Assign and Qualify list people; nothing changes until confirmed; returning-enquiry panel and the "Assign lead to …" routing unchanged |
| 6 | Follow-ups | `/tasks` is "Follow-ups" with real follow-ups grouped Overdue / Due today / Upcoming; Complete, Reschedule (time pre-filled in IST), Cancel (asks first) |
| 7 | Opportunities | Opportunity page: stage stepper and confirmed stage move with remark; "Link a customer" first when none; link/remove customer as before; quotation list with next step |
| 8 | Quotation navigation | From an opportunity open a quotation and Back; **do not create test quotations in production** unless you choose to |
| 9 | Error states (scratch-proven; not reproducible in production with the existing all-Super-Admin accounts) | A 403 shows one "No access … needs the X permission" panel without Retry; a network/5xx failure shows "Couldn't load …" with Retry. Do not create restricted users or grants in production to test this without a separate approval |
| 10 | Authorization / visibility | Same records and counts as before for Super Admin (the release adds no record or permission); anonymous `curl -s -o /dev/null -w '%{http_code}' localhost:3100/api/backend/leads` → 401 (script checks it) |
| 11 | Responsive and console | At 390 / 820 / 1440 px: no sideways scrolling on Dashboard, Leads, a lead, Pre-Sales, Follow-ups, Opportunities, an opportunity, Quotations; browser DevTools console shows no red errors while doing 3–8 |
| 12 | Sign-out | Not needed. If anything looks wrong, tell me; do not retry the deploy |

## 6. Rollback
- **Command:** `bash $F rollback` (only on your instruction). It stops the frontend, puts the previous build back from the kept
  copy (`/root/backups/frontend_next_pre_uxi_<TS>.kept`, or re-extracts the verified archive if the kept copy is gone),
  proves it matches the archive manifest, restarts it as the same systemd unit and checks the served build id.
  Duration: seconds plus the server start (rehearsed ≈ 1–2 s + start).
- Prerequisite that the script enforces: `archive` and `preflight` completed for the same run (it reads their markers).
- **What rollback does not reverse:**
  1. The **git source**: the live checkout stays at `2477799` (a later in-place build would rebuild the new code). To put the source back as well,
     you would run `git -C /root/texzium-erp/frontend reset --hard 5114eb9` (moves only the branch pointer; the tree is clean; untracked `docs/` untouched) — optional, your call.
  2. Anything people did through the new screens (a follow-up completed or cancelled, a call logged, a stage moved, a lead assigned): that is ordinary backend data, kept, and the old UI shows it.
  3. The `frontend_next_pre_uxi_*` archive and `.kept` folder (kept, never auto-deleted).
  4. Browser-side leftovers: `sessionStorage` keys `revenueos.sequence.*` / list views (per tab, harmless, ignored by the old build).
  5. The backend and database (this release never changes them, so there is nothing to undo).
- **Existing rollback material** (not touched by any of this; checksum re-verified today, `frontend_next_pre_enh_20261018_001010.tar.gz: OK`):
  `/root/backups/frontend_next_pre_enh_20261018_001010.{tar.gz,kept}` and the older `frontend_next_pre_*`, `backend_dist_pre_enh_*`,
  `backend_prisma_client_pre_enh_*`, `texzium_erp_pre_enh_*.dump`, plus `dist.pre-*` / `client.pre-*` in the backend dir.
  Important: those restore the build **before** 5114eb9. **They are not the rollback for this release**; this release's rollback is the new `pre_uxi` archive that step 3 creates from the then-running 5114eb9 build.
  Do not use `activate_enh_fe.sh rollback` for this release.

## 7. Risks and limitations
- Real-device and real Tab-key traversal checks were not done (desktop browser, 390 px frames, structural keyboard checks plus real Arrow/Escape/Space presses).
- The in-place build needs Google Fonts at build time; if unreachable the deploy refuses before stopping anything (preflight reports it).
- Pre-Sales loads seven count requests when it opens (one per queue); small data today, noted for later.
- Navigation now hides pages the person has no view permission for; per the 2026-10-17 preflight all four accounts are Super Admin, so no one's menu should change — this is presentation only, the backend still decides.
- The 403/no-access and "not visible to you" states were proven in scratch only (no restricted production users exist).
- Rehearsal ran on a clone with the scratch backend; the first real run happens against the live paths.
- Scratch database still holds test data (quotations, a company, HSN, follow-ups, call logs); undo statements are in the session scratchpad. Not production.

## 8. Remaining blockers
None for this release. Decisions still open from earlier registers (unchanged): bulk assign/qualify, inline assignment from queues,
editing an opportunity's close date or value, named saved views, source-based Pre-Sales pools, request-access workflow, more call outcomes.
