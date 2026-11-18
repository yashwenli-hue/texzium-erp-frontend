# RevenueOS Version A — Dark Mode V3 (Proposed Design Candidate)

**Status:** Proposed / not implemented. This document preserves the redesign
direction proposed during the dark-mode A/B audit, as an implementation-ready
specification for a future milestone. No application files have been changed
to produce this document.

**Baseline:** `8045a6e` — `fix(revenueos): restore Version A light theme`.
All token values, line references, and "current" descriptions below are as
of that commit.

**Relationship to prior work:**
- Supersedes nothing yet. `dark-v1` and `dark-v2` (commits `f326db0`,
  `66138bb`) remain the shipped, selectable themes. This document specifies
  a third candidate, `dark-v3`, to be built alongside them, not in place of
  them.
- Directly addresses the five audit findings from the post-A/B review: (1)
  no elevation/depth system, (2) zero semantic KPI differentiation on the
  Dashboard, (3) V1 and V2 differ in only 4 of ~25 tokens, (4) `NEGOTIATION`
  collides with the brand accent in dark mode, (5) one hardcoded color and
  several unthemed shadows never picked up the token system.
- Does not reopen or touch the light-theme restoration completed in
  `8045a6e`. See §7, "Protection of the restored light theme," which is a
  hard constraint on every change proposed here.

---

## 1. Problem statement (why V3, not another V1/V2 tweak)

The audit of `f326db0`/`66138bb` found that dark mode today is a **palette
swap over unchanged light-mode rules**, not a dark-specific design:

- One `--surface` tier. No layered depth — cards, modals, dropdowns, and
  toasts all sit on the same flat surface color as the canvas, differing
  only by a border.
- Most floating-surface shadows (`.kcard`, `.modal`, `.fd-panel`, `.toast`,
  the avatar/rail-tooltip popover) are still hardcoded to light-tuned
  near-invisible `rgba(10,10,12,…)`/`rgba(0,0,0,…)` values — on a
  `#0B0E17` canvas these read as flat, not elevated.
- The Dashboard's KPI tiles (`.tile .ic`) always use the brand accent
  (`var(--m)`/`var(--m-soft)`), regardless of what the tile represents.
  The brief's "colorful KPI accents… cyan/blue/green/amber financial and
  operational indicators" direction (inspired by the NAQIX reference) was
  never implemented in either shipped variant.
- `dark-v1` and `dark-v2` differ in exactly 4 of ~25 tokens
  (`--good`/`--warn`/`--bad`/`--info` + their `-bg` pairs). Everything that
  dominates a screen — nav rail, canvas, surface, borders, body text, and
  the brand accent `--m` itself — is byte-identical between them. This is
  the direct, mechanical reason the two variants read as visually
  indistinguishable in normal use.
- `LEAD_STATUS_STYLE.NEGOTIATION` in dark mode renders as `var(--m)` /
  `var(--m-soft)` — the exact brand accent color, identical to the "active
  nav item" tint, the primary button color, and every other brand-purple
  UI element. Post-`8045a6e`, **light mode already has its own restored,
  distinct violet** (`--lead-negotiation-bg:#EDE9FE; --lead-negotiation-fg:
  #5B21B6`) that reads as clearly separate from the brand accent
  (`--m:#059669`, green, in light). Dark mode has no equivalent — it still
  collapses Negotiation into the brand color, which the original commit's
  own reasoning explicitly said it was trying to avoid.
- One hardcoded, non-token color slipped past the original dark-mode
  conversion entirely: `.af-chip button:hover{background:rgba(5,150,105,.18)}`
  ([app/globals.css:562](../app/globals.css) at baseline) — a fixed
  brand-green tint that does not adapt under any dark variant.

V3 proposes fixing all of the above **as additive, dark-only token and rule
changes** — no light-mode value changes, no layout/component/structure
changes, no removal of `dark-v1`/`dark-v2`.

---

## 2. Design principles

1. **Depth over recoloring.** The single highest-leverage change is a real
   elevation system — layered surfaces and shadows tuned for a near-black
   canvas — not another hue pass.
2. **Restrained, purposeful semantic color**, per the brief. KPI accents
   are added only where a tile carries genuine positive/negative/urgency
   meaning; the brand purple remains the default and majority accent.
3. **V1 stays restrained; V2 stays expressive** — the existing brief's
   intent — but the *mechanism* for that difference widens from "4 tokens"
   to "4 tokens + whether KPI semantic accents are on + a touch more
   surface contrast," so the two variants are meaningfully distinguishable
   at a glance, not just on close inspection of small badges.
4. **Business-meaning colors stay theme-stable.** Exactly like
   `--stage-teal`/`--stage-indigo`/`--source-orange` today, the new
   dedicated Negotiation hue and any other business-semantic color do
   **not** vary between V1 and V2 — only the four core semantic tokens
   (`good`/`warn`/`bad`/`info`) and the new elevation/KPI treatment do.
5. **Zero light-mode risk.** Every change in this spec is additive to the
   `dark-v1`/`dark-v2`/new-`dark-v3` blocks, or is a change to a token's
   *dark* value only, where that token already has a light/dark split
   (post-`8045a6e`, several restoration tokens intentionally have separate
   light and dark values for exactly this purpose — see §7).
6. **No new architectural pattern.** Same mechanism as today: CSS custom
   properties scoped by `:root[data-theme="…"]` attribute selectors, no
   component-level dark-specific selectors, no Tailwind, no CSS-in-JS.

---

## 3. Scope decision: new variant vs. in-place change

**Proposed: `dark-v3` is a new, third selectable variant**, not a rewrite of
`dark-v1`/`dark-v2` in place.

Rationale: the current milestone-based workflow (per
`docs/revenueos-version-a-dark-mode-ab-brief.md`) treats each variant as a
disposable, independently comparable candidate until one is chosen as the
production dark theme. Overwriting V1 or V2 in place would destroy that
comparison capability and contradicts "preserve the current dark-mode
implementation" carried over from the light-restoration milestone. `dark-v3`
can reuse V1's foundation values wholesale (they're already good — navy
canvas, purple brand accent) and layer the elevation/KPI/Negotiation work on
top, making it cheap to build and directly comparable against V1/V2 in the
same running app via the existing `ThemeToggle`.

---

## 4. Token architecture

All new tokens below are added to a new block,
`:root[data-theme="dark-v3"]`, structured the same way `dark-v2` is today
(shared dark foundation via a combined selector, plus a dark-v3-only
override block for anything that should differ from V1's foundation). The
shared-foundation combined-selector list becomes:

```css
:root[data-theme="dark-v1"],
:root[data-theme="dark-v2"],
:root[data-theme="dark-v3"]{
  /* existing dark-v1/v2 foundation values, unchanged */
}
```

### 4.1 Elevation / surface hierarchy

Today there is one surface tier (`--surface`). V3 adds two more:

| Token | Proposed value | Used for |
|---|---|---|
| `--surface-1` | `#141A2C` (== current `--surface`) | Default cards, tables, standard panels — today's baseline, unchanged in appearance |
| `--surface-2` | `#1C2438` | Raised surfaces: modals, dropdown panels (`.fd-panel`), toasts, popovers (avatar tooltip) — visibly lighter than canvas and surface-1, giving floating elements real separation |
| `--surface-inset` | `#10141F` | Sunken surfaces: text inputs, search bars, textareas — reads as "recessed" relative to the card it sits in, mirroring both reference images' input-field treatment |

`--surface` itself stays defined (== `--surface-1`) so any rule not yet
migrated to the new tiers keeps working unchanged.

### 4.2 Border hierarchy

| Token | Proposed value | Used for |
|---|---|---|
| `--line` | `#262E47` (unchanged) | Standard borders — card edges, table dividers |
| `--line-2` | `#1B2136` (unchanged) | Subtle dividers, hover backgrounds |
| `--border-soft` | `rgba(255,255,255,.08)` | New — hairline separating a `--surface-2` element from whatever's behind it (e.g. a dropdown panel's own top edge), since a navy-on-navy border needs a lighter, alpha-based line rather than another flat hex to read at all |

### 4.3 Dark shadow strategy

Today, `--shadow` (one tier) is correctly used by `.card`/`.search-hero`,
but five floating-surface rules never adopted it and stay hardcoded to
light-tuned values. V3 adds a second shadow tier and migrates those five
rules:

| Token | Proposed value | Used for |
|---|---|---|
| `--shadow-1` | `0 1px 1px rgba(0,0,0,.3), 0 10px 30px -14px rgba(0,0,0,.65)` (== current `--shadow` in dark-v1/v2, unchanged) | `.card`, `.search-hero`, `.kcard` |
| `--shadow-2` | `0 4px 12px rgba(0,0,0,.4), 0 24px 60px -16px rgba(0,0,0,.75)` | Raised surfaces: `.modal`, `.fd-panel`, `.toast`, the avatar/rail-tooltip popover — stronger spread and darker so these visibly lift off a `--surface-2` background instead of blending into the canvas |

Rule migrations (dark-only effect; light keeps its own untouched literal
shadow values, since `--shadow-1`/`--shadow-2` are new tokens only defined
inside the dark blocks — see §7 for why light isn't touched):

- `.kcard` → `box-shadow:var(--shadow-1)` (was hardcoded `rgba(16,24,40,.03)`)
- `.modal` → `box-shadow:var(--shadow-2)` (was hardcoded `rgba(10,10,12,.35)`)
- `.fd-panel` → `box-shadow:var(--shadow-2)` (was hardcoded `rgba(10,10,12,.28)`)
- `.toast` → `box-shadow:var(--shadow-2)` (was hardcoded `rgba(10,10,12,.4)`)
- `.rail-tooltip` → `box-shadow:var(--shadow-2)` (was hardcoded `rgba(0,0,0,.5)`)

Since `--shadow-1`/`--shadow-2` don't exist in the light `:root`, each of
these five rules needs a `var(--shadow-1, <original literal>)` fallback (CSS
custom-property fallback syntax) **or** `--shadow-1`/`--shadow-2` are also
defined in light `:root` equal to each rule's own pre-existing literal
value, keyed per-rule the same way the `8045a6e` restoration tokens work.
The latter is recommended for consistency with the existing pattern (see
§7) and is assumed by the rest of this spec.

### 4.4 Semantic KPI accents (Dashboard)

No new color tokens — reuses the four existing semantic tokens (which
already vary correctly between V1/V2-style expressiveness). What's new is
a **mapping**, applied only to Dashboard tile icon chips
(`app/dashboard/page.tsx` + `.tile .ic` in `globals.css`), replacing the
current always-`var(--m)` treatment:

| Dashboard tile (indicative — exact tile set per current dashboard) | Accent token |
|---|---|
| Pipeline / total leads count | `--info` / `--info-bg` |
| Revenue / won value | `--good` / `--good-bg` |
| Pending / awaiting action | `--warn` / `--warn-bg` |
| Overdue / at-risk (AR past due, follow-ups missed) | `--bad` / `--bad-bg` |
| Everything else (counts with no positive/negative/urgency meaning) | `--m` / `--m-soft` (unchanged, stays the default/majority) |

Implementation shape: `.tile` gains an optional `accent` prop
(`"info" | "good" | "warn" | "bad" | undefined`) consumed by the existing
`.tile .ic` rule via a small set of modifier classes (`.tile.accent-info
.ic`, etc.) or an inline `style` override — either is a pure presentation
change to the Dashboard page only, no data/layout change. **This is the
one piece of this spec that touches light mode's rendered Dashboard too**
(since `--info`/`--good`/`--warn`/`--bad` already exist and are correct in
light) — flagged explicitly in §7 as the single intentional exception, and
it should be proposed for V1/V2 as well as V3 if adopted, since it's a
correctness improvement (using the semantic tokens that already exist
correctly) rather than a V3-only visual language change. If the user wants
KPI accents to be a V3-exclusive differentiator instead, gate it behind
`data-theme="dark-v3"` only — noted as an open decision in §9.

### 4.5 Dedicated NEGOTIATION token (dark)

Light mode already has this fix, from `8045a6e`
(`--lead-negotiation-bg:#EDE9FE; --lead-negotiation-fg:#5B21B6`, a violet
distinct from the light brand green `--m:#059669`). Dark mode's
`--lead-negotiation-bg`/`--lead-negotiation-fg` are currently *pinned* to
`rgba(124,58,237,.18)`/`#7C3AED` — i.e., identical to `--m`/`--m-soft`,
which is the exact collision the audit flagged, just preserved as-is
during the light-restoration milestone since dark mode was explicitly
out of scope that round.

V3 proposes a new pair of business-semantic tokens, parallel to the
existing `--stage-teal`/`--stage-indigo` pattern (same value across V1/V2/
V3, since this carries business meaning, not visual-expressiveness):

| Token | Proposed value |
|---|---|
| `--stage-violet` | `#E879F9` (fuchsia-400 — clearly distinct from brand `--m:#7C3AED`, reads as violet/magenta rather than blue-violet) |
| `--stage-violet-bg` | `rgba(232,121,249,.16)` |

`dark-v3`'s `--lead-negotiation-bg`/`--lead-negotiation-fg` would be
redefined to `var(--stage-violet-bg)`/`var(--stage-violet)` instead of
tracking `--m`/`--m-soft`. (If adopted for V1/V2 too — a defensible
follow-up, since it's fixing a real collision, not adding V3-only flair —
the same two new tokens get added to the shared dark foundation block
instead of only `dark-v3`'s. Kept V3-only in this spec by default, per the
"one variant at a time" instruction this milestone is under.)

### 4.6 Hardcoded color / hover fixes

One true bug, independent of any variant, safe to fix wherever dark-mode
rules are next touched:

```css
/* before (unthemed in every dark variant, including today's V1/V2) */
.af-chip button:hover{background:rgba(5,150,105,.18)}

/* after */
.af-chip button:hover{background:rgba(var(--m-rgb),.18)}
```

`--m-rgb` already exists and already resolves correctly per theme
(`5,150,105` light, `124,58,237` dark) — this rule just never got migrated
to it. Zero visual change in light mode (identical resolved value); fixes
the active-filter-chip hover tint to track the brand accent instead of a
frozen light-mode green in every dark variant, including the two already
shipped.

The restoration tokens introduced in `8045a6e` for hover/scrim states
(`--mod-dot-bg`, `--row-hover`, `--lead-row-hover`, `--scrim-rail`) were
deliberately pinned to *exactly* what V1/V2 already render, as a
restoration constraint. V3 is free to give these more deliberate, elevation
-aware dark values instead of the flat copies they currently carry in dark:

| Token | Current dark v1/v2 value (pinned, unchanged) | Proposed dark-v3 value |
|---|---|---|
| `--mod-dot-bg` | `rgba(124,58,237,.18)` (== `--m-soft`) | unchanged — already correct, no elevation dependency |
| `--row-hover` | `#1B2136` (== `--line-2`) | `#1B2136` blended toward `--surface-2` — proposed `#1E2740` for a slightly warmer, more visible row hover against `--surface-1` |
| `--lead-row-hover` | `#1B2136` | same as `--row-hover` in V3: `#1E2740` (the two rules had distinct light-mode values historically for no live design reason evident in code/comments; V3 may unify them — flagged as an open decision in §9 rather than assumed) |
| `--scrim-rail` | `rgba(3,5,14,.72)` (== `--scrim`) | unchanged — already appropriately dark/opaque for a mobile drawer overlay |

---

## 5. Component / rule-level treatment summary

Everything in this section is a **dark-v3-scoped token value change or a
shared-rule token-reference change**; no selector is newly scoped to
`[data-theme="dark-v3"]` specifically (keeping the existing "pure
custom-property, zero component-level theme selectors" architecture intact,
per the light-restoration milestone's precedent).

| Rule / file | Change |
|---|---|
| `.kcard`, `.modal`, `.fd-panel`, `.toast`, `.rail-tooltip` ([app/globals.css](../app/globals.css)) | Swap hardcoded `box-shadow` literals for `var(--shadow-1)`/`var(--shadow-2)` |
| `.modal`, `.fd-panel`, dropdown/popover surfaces | `background:var(--surface)` → `background:var(--surface-2)` |
| `.field input/select/textarea`, `.fd-search`, `.fd-date-row input` | `background:var(--surface)` → `background:var(--surface-inset)` |
| `.tile .ic` + Dashboard page | Add accent mapping per §4.4 |
| [components/ui/Tag.tsx](../components/ui/Tag.tsx) `LEAD_STATUS_STYLE.NEGOTIATION` | Dark-v3 value only: point at `--stage-violet`/`--stage-violet-bg` instead of `--m`/`--m-soft` |
| `.af-chip button:hover` | `rgba(5,150,105,.18)` → `rgba(var(--m-rgb),.18)` (all variants, see §4.6) |
| `app/pipeline/page.tsx` Kanban columns (via `LEAD_STATUS_STYLE` as `colorMap`) | No code change — automatically picks up the Negotiation fix since it consumes the same tokens |

---

## 6. How this differs from the current V1/V2 implementation

| Aspect | Current V1/V2 | Proposed V3 |
|---|---|---|
| Surface tiers | 1 (`--surface`) | 3 (`--surface-1/2/inset`) |
| Shadow tiers | 1, and only 2 of 7 floating-surface rules actually use it | 2, applied consistently to all floating surfaces |
| Border tiers | 2 flat hex | 2 flat hex + 1 alpha-based hairline for stacked surfaces |
| KPI tiles | Always brand purple | Semantic per tile (info/good/warn/bad), brand purple stays default |
| Negotiation vs. brand accent | Identical color (collision) | Distinct dedicated hue, parallel to Assigned/Rejected's existing treatment |
| Tokens that differ from V1's foundation | 4 (`good`/`warn`/`bad`/`info`) | Same 4, **plus** 3 surface tiers, 1 border tier, 1 shadow tier, KPI mapping, Negotiation hue — a genuinely distinct visual language, not a palette nudge |
| `af-chip` hover | Frozen light-green in all dark variants | Theme-correct in all variants (fixes V1/V2 too, not V3-exclusive) |

---

## 7. Explicit protection of the restored Version A light theme

This is a hard constraint carried forward from `8045a6e`, restated for this
proposal specifically:

- **No change to the base `:root` block's pre-existing token values.** Every
  new token in this spec (`--surface-1/2/inset`, `--border-soft`,
  `--shadow-1/2`, `--stage-violet(-bg)`) is either dark-only (defined solely
  inside `:root[data-theme="dark-v3"]` or the shared dark-foundation
  selector list) or, where a light-mode counterpart is required for
  fallback-free `var()` resolution (§4.3's shadow tokens), is added to
  light `:root` set to that rule's **own existing light literal**, changing
  nothing rendered.
- **No change to any of the thirteen `8045a6e` restoration tokens' light
  values** (`--lead-new-bg`, `--lead-good-bg`, `--lead-proposal-bg`,
  `--lead-negotiation-bg`, `--lead-lost-bg`, `--src-website-bg`,
  `--src-meta-bg`, `--src-google-bg`, `--src-whatsapp-bg`,
  `--src-indiamart-bg`, `--funnel-1-bg`, `--funnel-2-bg`, plus their `-fg`
  counterparts, `--mod-dot-bg`, `--row-hover`, `--lead-row-hover`,
  `--scrim-rail`, `--control-accent`, `--mark-fg`). V3 only ever touches
  these tokens' **dark-v3-scoped** values.
- **One flagged exception requiring explicit sign-off:** §4.4's KPI accent
  mapping is presentation logic on the Dashboard page itself (which accent
  a tile gets), not a token value — if implemented for all themes (not
  gated to V3 only), it changes light mode's Dashboard tile icon colors
  from always-brand-purple to semantic-per-tile. This is proposed as a
  correctness improvement using tokens that are already correct in light,
  but it is **not** covered by the "zero light-mode change" guarantee that
  applies to the rest of this document, and needs an explicit decision
  before implementation (see §9).
- **No selector, layout, spacing, typography, component structure,
  workflow, repository, or API changes anywhere in this spec.** Every
  change is a token value or a token *reference* inside an existing rule.
- Implementation of this spec must re-run the same verification the
  `8045a6e` milestone used: diff light-mode-resolved values before/after
  against the current baseline, `npm run typecheck`, `npm run lint`,
  `npm run build`.

---

## 8. Explicitly out of scope (per brief §4 and CLAUDE.md)

- Glassmorphism, blur, gradients on cards, animated accents.
- Any change to `dark-v1`/`dark-v2`'s own token values (they remain exactly
  as shipped, fully comparable against V3).
- Tailwind or any CSS framework.
- Any backend, API, repository, or data-shape change.
- Touching, inspecting, or executing `create-superadmin.ts`.

---

## 9. Open decisions before implementation

1. **KPI accent scope** (§4.4): V3-only, or applied to V1/V2/light too as a
   correctness fix? Affects whether light mode's Dashboard visually changes.
2. **`--row-hover` vs `--lead-row-hover` unification** (§4.6): keep as two
   tokens with possibly-identical V3 values, or formally merge them? No
   functional difference either way; affects token count only.
3. **`af-chip` hover fix rollout** (§4.6): since it's a genuine bug fix with
   zero light-mode effect, should it ship as its own tiny fix commit ahead
   of the V3 milestone (touches V1/V2 too) rather than bundled into V3?
4. **Naming**: `--stage-violet` risks read as "the Lead-stage teal/indigo
   family" despite being dark-only. Alternative: `--dark-negotiation` scoped
   name. No functional difference — naming only.
5. **Whether V3 becomes a fourth `ThemeToggle` option** immediately on
   implementation, or is built behind a flag/comment until reviewed — this
   document assumes the former (matching how V1→V2 shipped), but is not
   itself a decision this document makes.

None of the above block writing this specification; they block *starting*
implementation, and should be resolved with the user first.
