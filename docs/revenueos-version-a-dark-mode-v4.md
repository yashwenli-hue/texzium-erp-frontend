# RevenueOS Version A — Dark Mode V4: "Graphite & Emerald" (Proposed)

**Status:** Proposal only. Nothing has been implemented. No application file has
been changed to produce this document, and no commit has been made.

**Baseline:** `83d3593` — `feat(revenueos): add Version A dark mode V3`. Light
theme reference: `8045a6e` — `fix(revenueos): restore Version A light theme`.

**Relationship to prior work:** V4 is a fourth, independently-designed
selectable theme. It does not refine, extend, or recolor V3, and it does not
use V1/V2/V3 as a visual reference. V1, V2, and V3 remain exactly as shipped —
this document proposes adding a sibling, not editing any of them. The only
thing V4 reuses from V3 is a proven *engineering mechanism* (a self-contained
`:root[data-theme="…"]` block + the `var(token, fallback)` pattern already
in place on the shared rules), not any visual decision — that mechanism is
what makes light-theme isolation possible at all, and re-deriving it from
scratch would only add risk for no benefit. Every color, elevation, and
interaction decision below was made independently.

---

## 1. Overall V4 design concept

**"Graphite & Emerald."** A neutral, true-black-leaning foundation (not
navy-tinted) with a single refined accent — a deep emerald green — used
sparingly and precisely. The philosophy: let structure, spacing, and type
(all inherited unchanged from Version A) carry the hierarchy; let color
carry only two jobs — *brand* and *status* — and keep everything else as
close to monochrome as legibility allows. This is the visual language of
tools like Linear, Vercel's dashboard, and GitHub's dark mode: dense,
professional software that reads as calm and precise rather than
decorative. For an ERP handling leads, quotations, and money, "calm and
precise" is the right register — not "vivid app."

The emerald accent is not an arbitrary choice: it's the same hue family as
RevenueOS's actual light-mode brand color (`--m:#059669`, green). V1/V2/V3
all introduced purple as the dark-mode brand color — a hue that doesn't
exist anywhere in the light theme. V4 treats brand identity as something
that shouldn't flip on a theme toggle; a user switching between light and
dark should still recognize it as *the same product*.

---

## 2. Why this is meaningfully different from V3

| Dimension | V3 | V4 |
|---|---|---|
| Canvas hue | Navy-black (`#0B0E17` — blue-shifted) | Neutral graphite-black (`#0A0A0C` — no blue cast) |
| Brand accent | Purple (`#7C3AED`) — doesn't exist in light mode | Emerald (`#10B981`) — same hue family as light mode's actual brand color |
| Borders | Flat hex per surface tier | Alpha-white overlays (`rgba(255,255,255,.05–.14)`) that scale naturally with whatever surface they sit on |
| Hover states | Flat hex tokens (`--row-hover:#1E2740`) | Alpha-white overlays (`rgba(255,255,255,.04)`) — same mechanism as borders, not a separate design |
| Elevation technique | Lightness step + external shadow only | Lightness step + external shadow **+ a 1px inset top highlight** on raised surfaces (modals/dropdowns/toasts) — simulates light catching an edge, a technique V1/V2/V3 never used |
| Navigation rail | Same surface tier as cards (inherited from light mode's rail philosophy) | Sits at canvas level, receded from content — nav recedes, content advances |
| Negotiation vs. brand collision | Required a dedicated escape hatch (`--stage-violet`) specifically *because* purple was already spent on the brand | Never occurs — violet was never claimed by anything else, so Negotiation gets a natural, uncontested violet (and echoes light mode's own violet for the same status) |
| Semantic palette | Stock, easily-recognizable Tailwind swatch values (`#34D399`, `#FBBF24`, `#F87171`, `#60A5FA` / `#22C55E`, `#F59E0B`, `#EF4444`, `#22D3EE`) | Custom-tuned values, chosen for hue separation from the brand accent and from each other, not lifted from a default framework palette |

---

## 3. Color philosophy and proposed palette

Principles:
- **Neutral, not navy.** Every gray in the system (canvas, surfaces, text)
  has a negligible color cast — true graphite, not blue-black. Avoids the
  "generic SaaS dark mode" signature all three existing dark variants share.
- **One brand hue, used sparingly.** Emerald appears on primary actions,
  active nav state, links, and focus rings — nowhere else. It is not reused
  for "good/positive" status (see below), avoiding V1/V2/V3's collision
  pattern by construction rather than by patch.
- **Status colors are secondary and desaturated relative to the brand
  accent.** They inform, they don't compete for attention.
- **Borders and hovers are alpha-white overlays**, not flat hex per tier.
  This is a genuine mechanism change, not just new numbers: an alpha
  overlay automatically reads correctly on canvas, surface-1, *or*
  surface-2 without needing a separately-tuned hex for each combination.

Proposed values (all additions live only inside a new
`:root[data-theme="dark-v4"]` block — see §11):

**Foundation**
| Token | Value |
|---|---|
| `--canvas` | `#0A0A0C` |
| `--surface` (surface-1: cards, tables, kanban cards) | `#141416` |
| `--surface-2` (raised: modals, dropdowns, popovers, toasts) | `#1B1B1F` |
| `--surface-inset` (sunken: form inputs) | `#101012` |
| `--surface-rail` (nav rail — new, see §5) | `#0A0A0C` (== canvas) |
| `--line` | `rgba(255,255,255,.08)` |
| `--line-2` | `rgba(255,255,255,.05)` |
| `--border-soft` | `rgba(255,255,255,.10)` |
| `--ink` (headings, high-emphasis) | `#F5F5F7` |
| `--text` (body) | `#E4E4E7` |
| `--muted` (secondary) | `#9A9AA2` |
| `--faint` (tertiary/placeholder) | `#6E6E76` |

**Brand**
| Token | Value |
|---|---|
| `--m` | `#10B981` |
| `--m-soft` | `rgba(16,185,129,.15)` |
| `--m-2` (gradient partner / lighter hover state) | `#34D399` |
| `--m-rgb` | `16,185,129` |
| `--control-accent` (native checkbox/radio) | `#10B981` (== `--m`) |

**Semantic (four core statuses)**
| Token | Value |
|---|---|
| `--good` / `--good-bg` | `#4ADE80` / `rgba(74,222,128,.14)` |
| `--good-strong` | `#22C55E` |
| `--warn` / `--warn-bg` | `#F5A524` / `rgba(245,165,36,.14)` |
| `--bad` / `--bad-bg` | `#F0524F` / `rgba(240,82,79,.14)` |
| `--info` / `--info-bg` | `#4F9CF9` / `rgba(79,156,249,.14)` |

**Extra hue families (Lead Status / Lead Source — see §8)**
| Token | Value |
|---|---|
| `--stage-teal` / `-bg` | `#2BC8B4` / `rgba(43,200,180,.14)` |
| `--stage-indigo` / `-bg` | `#7C8CF8` / `rgba(124,140,248,.14)` |
| `--source-orange` / `-bg` | `#F2994A` / `rgba(242,153,74,.14)` |
| `--stage-violet` / `-bg` (Negotiation) | `#9F7AEA` / `rgba(159,122,234,.14)` |

**Utility**
| Token | Value |
|---|---|
| `--shadow-1` | `0 1px 2px rgba(0,0,0,.4)` |
| `--shadow-2` | `0 2px 4px rgba(0,0,0,.3), 0 16px 40px -12px rgba(0,0,0,.7), inset 0 1px 0 rgba(255,255,255,.06)` |
| `--scrim` / `--scrim-rail` | `rgba(0,0,0,.6)` |
| `--row-hover` / `--lead-row-hover` | `rgba(255,255,255,.04)` |
| `--mod-dot-bg` | `rgba(16,185,129,.15)` (== `--m-soft`) |
| `--mark-fg` | `#362B10` (dark warm text for the fixed pale-yellow `--mark-bg`, unchanged across every theme) |

---

## 4. Surface / elevation system

Four tiers, distinguished primarily by **lightness step**, reinforced by
**border alpha** and, for the top two raised tiers, an **inset top
highlight**:

1. **Canvas** (`#0A0A0C`) — the page background and the nav rail.
2. **Surface-1** (`#141416`) — default resting state: cards, tables,
   Kanban cards, notes. A ~9% lightness step above canvas — enough to read
   as "a panel," not enough to look washed out.
3. **Surface-2** (`#1B1B1F`) — raised: modals, dropdown panels, the
   account/theme popover, toasts. Gets `--shadow-2`, which layers a tight
   near-shadow, a soft far-shadow, *and* a 1px inset highlight
   (`inset 0 1px 0 rgba(255,255,255,.06)`) along its top edge — the detail
   that makes a raised panel feel like it's catching light rather than just
   being "a lighter box." This is the one technique in this proposal with
   no precedent in V1/V2/V3.
4. **Surface-inset** (`#101012`) — sunken: text inputs, search fields,
   date inputs. Slightly *darker* than canvas-adjacent surface-1, so a
   field reads as a recess in its parent card rather than another flat
   panel.

Shadows themselves are deliberately restrained (`--shadow-1` is a 2px-blur,
40%-opacity single layer) — on a near-black canvas, a big diffuse shadow
barely registers and mostly just adds murkiness; the lightness step and
border already do the separation work. Shadow's job here is only to ground
floating elements (modals, dropdowns), not to define every card.

---

## 5. Navigation treatment

The existing `.rail` rule (`app/globals.css`) uses `background:var(--surface)`
— by design, intentionally identical to card surface, per the light theme's
original rationale ("sidebar is a light rail... same surface/line/text
tokens as the rest of the app, not a separate dark theme"). V1/V2/V3 all
inherited that unchanged, so in every existing dark theme the rail is
indistinguishable in tone from a card.

V4 proposes the rail sit at **canvas level** instead — visually receding
behind the content, which advances via its surface-1 lightness step. This
is the one place V4 asks for a real design opinion about navigation: chrome
should be quiet, content should be the thing your eye lands on. It requires
exactly one small, safe rule change (§12): `.rail`'s background moves from
`var(--surface)` to `var(--surface-rail, var(--surface))` — under light
mode and V1/V2/V3 (which never define `--surface-rail`), this falls back to
the exact existing value, so nothing changes for them.

Active nav item, hover, and the left accent bar (`.mod.active`,
`.mod.active::before`) keep their existing mechanics, now resolving through
the emerald `--m`/`--m-soft` instead of purple.

---

## 6. Cards / panels / tables / forms

- **Cards / Kanban cards / notes** (`.card`, `.kcard`, `.note`): surface-1,
  `--line` border, `--shadow-1`. No change in structure — same padding,
  radius, and layout as Version A.
- **Tables**: header row keeps `--muted` text on transparent background (no
  new token — avoids adding visual weight to something that's supposed to
  recede). Row hover (`tbody tr.clickable:hover`, `.lead-row:hover`) uses
  the alpha-white `--row-hover`/`--lead-row-hover` overlay instead of a
  flat hex — reads correctly regardless of which row's underlying surface
  it's over.
- **Forms** (`.field input/select/textarea`, `.fd-search`,
  `.fd-date-row input`): surface-inset background, `--line` border,
  emerald focus ring (see §10). `accent-color` on native checkboxes/radios
  resolves to `--control-accent` (emerald), consistent with the rest of the
  brand treatment.
- **Modals** (`.modal`): surface-2, `--border-soft`, `--shadow-2` (with the
  inset highlight).
- **Dropdown panels** (`.fd-panel`) and the **account/theme popover**
  (`.user-menu`, shared by `UserMenu` and `ThemeToggle`): same surface-2 /
  border-soft / shadow-2 treatment as modals, for visual consistency across
  every floating panel in the app.
- **Toasts** (`.toast`) and the **rail tooltip** (`.rail-tooltip`): these
  stay "always-dark chips" per the existing `--chip-ink` architecture
  (unchanged, not part of the elevation system) — only their shadow
  upgrades to `--shadow-2`.

---

## 7. KPI / Dashboard treatment

Verified against the *actual* live component this time (not assumed):
RevenueOS's real KPI cards are `StatCard` (`components/ui/Card.tsx`),
rendered via `.stat` in `globals.css` — label, a small sparkline
(`.spark`), a large value (`.v`), and a delta indicator (`.d.up`/`.d.down`/
`.d.flat` with a `.pill`). There is no icon-chip element on this component
(a `.tile`/`.tile .ic` rule exists in `globals.css` but has zero consumers
anywhere in the app — confirmed via a full JSX search — so it's out of
scope here just as it was for V3).

Proposed treatment, entirely through existing tokens, no new component
structure:
- `.stat .v` (the big number) renders in `--ink` (near-white, `#F5F5F7`) —
  the highest-contrast text in the system, so the headline metric is the
  first thing that reads on a dense dashboard.
- `.stat .d.up`/`.d.down` keep using `--good`/`--bad` (now `#4ADE80`/
  `#F0524F`) — unchanged mechanism, refreshed colors.
- The Focus/Insight list (`app/dashboard/page.tsx`'s `.li .ic`, which
  already picks its background/color from each item's real `tone` field —
  `bad`/`warn`/`info`/`n` — via `var(--${tone}-bg)`/`var(--${tone})`) and
  the Dashboard's Opportunity-stage Kanban snapshot (via `KanbanBoard`'s
  default `TINT`/`STAGE_COLOR` map in `Tag.tsx`) both already implement
  genuine semantic-tone UI and both pick up V4's palette automatically —
  zero code changes needed for either.

---

## 8. Semantic / status color strategy

Same *mapping* as the current implementation (this is established business
presentation logic in `Tag.tsx`/`SourceBadge.tsx`/`Funnel.tsx` and isn't
being redesigned), refreshed with V4's palette:

- **Lead Status** (`LEAD_STATUS_STYLE`, also used as the Lead Pipeline
  Kanban's `colorMap`): `NEW`→info, `ASSIGNED`/`CONTACTED`/
  `PRE_SALES_ASSIGNED`→stage-teal, `QUALIFIED`/`SALES_ASSIGNED`/`WON`→good,
  `PROPOSAL_SENT`→warn, `NEGOTIATION`→**stage-violet** (dedicated, no
  collision — see §2/§13), `LOST`→bad, `REJECTED`→stage-indigo.
- **Lead Source** (`SOURCE_STYLES`): Website→neutral (line-2/muted),
  Meta Ads→info, Google Ads→warn, WhatsApp→good, IndiaMART→bad,
  TradeIndia→source-orange, ExporterIndia→stage-indigo.
- **Funnel** (`RAMP`): a 3-stop progression through the good/green family
  (bg tint → mid → `--good-strong`), unchanged mechanism.

Why brand and "good" can both be green without colliding: this already
happens in the *light* theme today (`--m:#059669` and `--good:#12805C` are
both green, differentiated mainly by usage context — solid button/active-nav
vs. a tinted status badge — not by hue). V4 keeps that same accepted
precedent rather than inventing a new rule, and additionally gives good/
brand a genuine lightness/saturation gap (`#10B981` deep emerald for brand
vs. `#4ADE80` brighter green for status) so they're also easy to tell apart
at a glance, not just "differentiated by context."

---

## 9. Border / shadow strategy

Borders are alpha-white overlays (`rgba(255,255,255,.05–.14)`) rather than
flat per-tier hex. Three weights: `--line-2` (subtlest, dividers),
`--line` (standard, card/table edges), `--border-soft` (raised-surface
hairlines — modals, dropdowns). Because these are alpha values, not fixed
hex, the same token reads correctly whether it sits on canvas, surface-1,
or surface-2, without needing a bespoke value per combination.

Shadows are two tiers (`--shadow-1`, `--shadow-2` — see §4), restrained in
opacity/blur since a near-black canvas doesn't need much shadow to read
elevation — the lightness step and border do most of the work; shadow adds
grounding, and `--shadow-2` additionally carries the inset top-highlight
that gives raised panels a genuine "catching light" quality.

---

## 10. Hover / focus / selected states

- **Row/list hover**: alpha-white overlay (`--row-hover`/`--lead-row-hover`,
  `rgba(255,255,255,.04)`) — a subtle brightness lift, not a hue shift.
- **Selected / active** (`.lead-row.sel`, `.mod.active`): keeps the
  existing `--m-soft` background mechanism, now emerald-tinted — ties
  "selected" to the brand color, which is the correct signal for it.
- **Focus ring**: proposed refinement over the current single soft-glow
  ring. `.field input:focus` etc. currently do
  `box-shadow:0 0 0 3px var(--m-soft)`. V4 proposes layering a crisp 1px
  accent border under the soft glow:
  `box-shadow:0 0 0 1px var(--m), 0 0 0 4px rgba(var(--m-rgb),.18)` — a
  more precise, "designed" focus indicator common in premium software,
  still fully accessible (clear contrast ring, not reliant on color alone
  since focus also moves the border-color as today).
- **Active-filter-chip hover** (`.af-chip button:hover`): continues
  resolving through `rgba(var(--m-rgb),.18)` (the fix already shipped in
  V3, reused as-is since it's theme-correct by construction — no new work
  needed here).

---

## 11. Light-theme isolation strategy

Identical mechanism to the one already proven safe in the V3 milestone,
applied fresh:

1. A wholly new, **self-contained** `:root[data-theme="dark-v4"]` block in
   `app/globals.css` — not joined to any other theme's selector list, not
   touching the base `:root` (light) block, and not touching `dark-v1`,
   `dark-v2`, or `dark-v3`'s blocks at all.
2. Every token V4 needs **already exists** as a name in the architecture
   (defined by light `:root`, by the `8045a6e` restoration set, and by
   V3's `--surface-2`/`--surface-inset`/`--border-soft`/`--shadow-1`/
   `--shadow-2`). V4 supplies **only new values** for these same names
   inside its own block — meaning the shared rules V3 already converted to
   `var(--token, <original-literal-fallback>)` need **no further editing**
   for V4 to work. Light mode and V1/V2/V3 continue resolving to their own
   values or their own fallbacks exactly as before.
3. The **one exception** is `--surface-rail` (§5), a genuinely new token
   name, requiring one new fallback on `.rail`'s existing background
   declaration: `var(--surface-rail, var(--surface))`. Under every other
   theme (where `--surface-rail` is undefined), this resolves to the exact
   current `var(--surface)` value — zero rendering change.
4. Post-implementation, the same regression check used for both prior
   milestones applies: diff the base `:root` block and the `dark-v1`/
   `dark-v2`/`dark-v3` blocks against `83d3593` and confirm byte-for-byte
   equality, plus `npm run typecheck && npm run lint && npm run build`.

---

## 12. Components / rules needing visual treatment

| Rule / file | Treatment |
|---|---|
| New `:root[data-theme="dark-v4"]` block ([app/globals.css](../app/globals.css)) | Full token set per §3 |
| `.rail` | **New** fallback: `background:var(--surface-rail, var(--surface))` (§5) — the only rule-level edit this proposal requires beyond the new block |
| `.field input/select/textarea`, `.fd-opt input` focus states | Optional refinement to the focus-ring `box-shadow` (§10) — additive, applies to every theme identically since it's a value refinement, not a new token; needs explicit confirmation before implementation since it's the one change that isn't purely inside the new block (flagged in §14 open items) |
| `.kcard`, `.modal`, `.fd-panel`, `.user-menu`, `.toast`, `.rail-tooltip` | No rule changes — already reference `var(--surface-2, var(--surface))` / `var(--shadow-2, …)` / `var(--border-soft, var(--line))` from V3; V4 just supplies its own resolved values |
| `components/ui/Tag.tsx`, `SourceBadge.tsx`, `Funnel.tsx` | No changes — already fully token-driven |
| `lib/theme/ThemeContext.tsx` | Add `"dark-v4"` to `ThemeName`, `THEMES`, `THEME_INIT_SCRIPT` (same mechanical addition as V3) |
| `components/shell/ThemeToggle.tsx` | Add the V4 option to `OPTIONS` |

---

## 13. Intentional departures from the existing dark implementation

- **Brand hue**: green (matches light mode), not purple. This is the
  single biggest philosophical break from V1/V2/V3.
- **Neutral graphite canvas**, not navy — removes the blue cast shared by
  every existing dark variant.
- **Alpha-based borders/hovers** instead of flat per-tier hex — a
  mechanism change, not just a recolor; scales correctly across surfaces
  without manual tuning per combination.
- **Inset top-highlight on raised surfaces** — an elevation technique with
  no precedent in V1/V2/V3.
- **Receded navigation rail** (canvas-level, not surface-level) — a real
  opinion about where the eye should land, different from every existing
  theme (which all inherit the light theme's "rail equals card surface"
  philosophy unchanged).
- **Custom-tuned semantic palette** rather than default-framework swatch
  values, chosen specifically for hue separation from the brand accent.
- **Negotiation's collision is resolved by design, not by patch**: because
  purple was never spent on the brand accent in V4, `--stage-violet` was
  never a scarce, invented escape hatch — it's simply "the violet," free
  from the start, and happens to echo the light theme's own Negotiation
  hue.

---

## 14. Preserving usability at ERP-level information density

- **Neutral text hierarchy** (`--ink`/`--text`/`--muted`/`--faint`, all
  true grays) avoids the slight legibility tax that blue-tinted dark
  themes can impose on small, dense table text — no color needs to be
  "read through" to parse a number or label.
- **Color is reserved for meaning**, not decoration: exactly one brand hue,
  four semantic hues, and four extra "stage" hues — the same total count
  Version A already uses today, just re-tuned. Nothing new is added purely
  for visual interest, which matters on screens like the Leads table or
  Sales Order detail that are already dense with data.
- **Elevation via lightness + alpha border**, not saturated color, means
  panels separate from canvas without adding hue noise — important on
  pages that stack many cards (Dashboard, Opportunity/Sales Order detail
  with several `Panel`s).
- **A single, consistent focus/selected/hover vocabulary** (alpha overlay
  for hover, brand-tinted soft background for selected, layered ring for
  focus) means a user's eye only has to learn one interaction language
  across leads tables, Kanban cards, dropdown options, and form fields —
  not a different treatment per surface type.
- **Restrained shadow use** keeps floating elements (modals, dropdowns)
  visually distinct from resting elements (cards, tables) without making
  every card look like it's floating — important so a dense list of
  Kanban cards or table rows doesn't read as a stack of separate "windows."

---

## Open items before implementation

1. **Focus-ring refinement** (§10, §12): the two-layer ring is proposed as
   an improvement applying identically to every theme (it's a value
   change to an existing shared rule, not a V4-only addition) — confirm
   whether that should ship as part of V4 specifically (gated to
   `dark-v4` only, requiring a fallback like the rest of this proposal) or
   as a small separate all-themes polish item. Everything else in this
   proposal is purely additive inside the new block and needs no such
   decision.
2. **Naming**: `--surface-rail` is the only genuinely new token this
   proposal introduces. No functional alternative under consideration —
   flagged only because it's the one name not already part of the existing
   architecture.

Neither item blocks writing or approving this proposal; they're
implementation-time confirmations once V4 is approved.
