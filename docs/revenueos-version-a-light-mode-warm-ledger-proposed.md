# RevenueOS Version A — Light Theme Candidate: "Warm Ledger" (Proposed)

**Status:** Proposal only. Nothing has been implemented. No application file
has been changed to produce this document, and no commit has been made.

**Baseline:** `61099e0` — `feat(revenueos): add Version A dark mode V4
(Graphite & Emerald)`. Authoritative existing light theme reference:
`8045a6e` — `fix(revenueos): restore Version A light theme`. Accepted dark
candidate (untouched by this proposal): V4 "Graphite & Emerald," also from
`61099e0`.

This document follows the same process and discipline as
`docs/revenueos-version-a-dark-mode-v4.md`: grounded in the real, current
component implementation (not assumed structure), a genuinely independent
visual concept rather than a recolor, and a token architecture that isolates
the new candidate from everything already shipped.

---

## 1. Design concept / name

**"Warm Ledger."** Where the current light theme (`8045a6e`) is a cool,
neutral, generic-SaaS white — the same off-white/white/near-black triad most
admin dashboards default to — Warm Ledger takes its cue from the physical
object RevenueOS's Quote-to-Cash workflow actually produces: paper. Quotes,
proforma invoices, sales orders, sales invoices, ledgers. The palette shifts
the entire neutral scale from cool-gray to warm-ivory: a soft parchment
canvas, warm-white cards, warm-taupe borders and text, and a deeper,
richer brand green than the current mint-leaning `#059669`. Nothing about
this reads as "themed" or novelty — the goal is a light interface a
finance or sales-ops professional would describe as "clean" and "premium,"
not "warm" as a conscious observation. Warmth is the mechanism, not the
message.

This is also the deliberate light-side counterpart to Dark V4's own
reasoning: V4 kept the brand accent in the same hue family as light mode's
real brand color (green) specifically so switching themes doesn't change
what product you feel like you're using. Warm Ledger keeps that same
green — deepened and warmed to match its new neutral scale — rather than
inventing an unrelated new brand hue. The two accepted candidates (V4 dark,
Warm Ledger light) would therefore share one design principle even though
their neutrals move in opposite directions (V4 toward graphite-black, Warm
Ledger toward warm ivory).

---

## 2. Comparison with current light theme (`8045a6e`)

| Aspect | Current light (`8045a6e`) | Warm Ledger |
|---|---|---|
| Canvas | `#FAFAFA` — cool, barely-off-white | `#FAF7F0` — warm ivory/parchment |
| Surface (cards/tables) | `#FFFFFF` | `#FFFEFB` — barely-warm white |
| Text/ink | `#1A1C20` / `#14171D` — cool near-black, the two tokens nearly identical | `#38301F` / `#241C0F` — warm espresso-brown, deliberately more separated (body vs. heading now read as two distinct depths, not near-duplicates) |
| Borders | `#EEEFF1` / `#F5F5F6` — cool light gray | `#E8E1D0` / `#F1ECDD` — warm taupe |
| Brand | `#059669` — bright mint-leaning green | `#1C7A4F` — deeper forest green |
| Shadow tint | Cool `rgba(10,10,12,…)` | Warm `rgba(40,30,10,…)` |
| Elevation cue | Canvas and surface are so close in hue that the "lift" is almost purely a lightness/shadow effect | Elevation is also a **warmth gradient**: canvas (warmest) → card (slightly warm) → modal/dropdown (crisp, near-neutral white) — a mechanism the current theme doesn't use at all |
| Nav rail | Same surface as cards (white), no separate identity | A distinct, slightly deeper warm tone — its own "ledger cover" identity (see §8) |
| Semantic hues | Standard-ish SaaS palette (blue info, amber warn, red bad) | Same four meanings, deliberately deepened/warmed (ochre instead of amber, brick instead of pure red, muted slate-blue instead of bright blue) so nothing reads as a bright "alert sticker" against the warm neutrals |

This is not "the same theme with warmer grays" — the elevation mechanism
(warmth-as-depth-cue), the brand hue depth, and the semantic palette are
all independently reconsidered, the same standard Dark V4 was held to.

---

## 3. Foundation palette

| Token | Value | Notes |
|---|---|---|
| `--canvas` | `#FAF7F0` | Page background |
| `--surface` | `#FFFEFB` | Cards, tables, kanban cards, notes |
| `--surface-2` | `#FFFFFF` | Modals, dropdown panels, popovers, toasts — the crispest, most neutral white in the system, reserved for the most "in-focus" surfaces |
| `--surface-inset` | `#F3EFE4` | Form inputs, search fields, date inputs — deeper/recessed relative to a card |
| `--surface-rail` | `#F1EBDB` | Nav rail — see §8 |
| `--line` | `#E8E1D0` | Standard borders |
| `--line-2` | `#F1ECDD` | Subtle dividers, default row-hover family |
| `--border-soft` | `rgba(36,28,15,.08)` | Alpha-based hairline for raised surfaces (modals/dropdowns) — dark-warm at low opacity, the light-mode mirror of V4's white-alpha borders |
| `--ink` | `#241C0F` | Headings, high-emphasis text, nav brand text |
| `--text` | `#38301F` | Body text |
| `--muted` | `#746952` | Secondary text/labels |
| `--faint` | `#B3A688` | Tertiary text, placeholders |

---

## 4. Brand palette

| Token | Value | Notes |
|---|---|---|
| `--m` | `#1C7A4F` | Primary brand — deep forest green |
| `--m-soft` | `#E6F0E6` | Soft brand background (active nav, selected rows, focus glow) |
| `--m-2` | `#3FA06B` | Lighter brand variant — hover states, the sidebar logo's gradient partner (mirrors `--m`/`--m-2`'s existing role) |
| `--m-rgb` | `28,122,79` | For alpha-based treatments (active-filter-chip hover, focus-ring glow) |
| Secondary accent | **None, deliberately** | Same restraint principle used in Dark V4: one brand hue, used sparingly. A second "ledger gold/brass" accent was considered and rejected — it would compete with `--warn` (already an ochre/amber-adjacent hue) and add a color with no consistent job, which is exactly the "unnecessary visual noise" the brief asks to avoid. The "ledger" character comes from the warm neutral scale and the elevation mechanism, not from a second brand color. |

---

## 5. Semantic palette

| Token | Value | Notes |
|---|---|---|
| `--good` / `--good-bg` | `#2F8F5B` / `#E8F3EA` | Success/positive |
| `--good-strong` | `#1C7A4F` (== `--m`) | Deepest good tone — mirrors the existing architecture's pattern (Funnel stop 3 already ties `--good-strong` to the brand-adjacent shade) |
| `--warn` / `--warn-bg` | `#A6650E` / `#FBF0DE` | Warning — a deep ochre rather than a bright amber, so it reads as "ledger ink," not a caution sticker, and keeps solid contrast on the warm background (bright ambers compress badly against warm-white — see §13) |
| `--bad` / `--bad-bg` | `#B23A2E` / `#FBE8E4` | Danger/negative — a warm brick-red rather than a pure cool red, consistent with the rest of the palette's warmth |
| `--info` / `--info-bg` | `#2E5FA3` / `#E7EEF7` | Informational — a muted, slightly deeper slate-blue rather than a bright SaaS blue, so it doesn't read as the coolest, most "foreign" color on an otherwise warm palette |

Good and brand share a hue family (both green), exactly as the *current*
light theme already does (`--m:#059669` / `--good:#12805C` are already both
green today, differentiated by context — solid button/active-nav vs. a
tinted badge — not by hue). Warm Ledger keeps that established, already-
accepted precedent rather than inventing a new rule, while still giving
brand and good real lightness/saturation separation (`#1C7A4F` deep forest
vs. `#2F8F5B` brighter green) so they're distinguishable at a glance too.

---

## 6. Stage / source colors

Reviewed directly against the live `LEAD_STATUS_STYLE` map
(`components/ui/Tag.tsx`) and `SOURCE_STYLES` map
(`components/ui/SourceBadge.tsx`) — the mapping (which token backs which
status) is established presentation logic and isn't being redesigned, only
re-colored:

| Status / Source | Token(s) | Value |
|---|---|---|
| Lead `NEW` | `--lead-new-bg` / `-fg` | `#E7EEF7` / `#2E5FA3` (info family) |
| `ASSIGNED` / `CONTACTED` / `PRE_SALES_ASSIGNED` | `--stage-teal` / `-bg` | `#2F8E82` / `#E3F1EF` |
| `QUALIFIED` / `SALES_ASSIGNED` / `WON` | `--lead-good-bg` / `-fg` | `#E8F3EA` / `#2F8F5B` (good family) |
| `PROPOSAL_SENT` | `--lead-proposal-bg` / `-fg` | `#FBF0DE` / `#A6650E` (warn family) |
| **`NEGOTIATION`** | `--stage-violet` / `-bg` | `#7A4FA0` / `#F0E7F5` — **dedicated, uncontested violet.** Same reasoning as Dark V4: since brand is green, not purple, here too, violet was never spent on anything else — Negotiation gets a natural, free hue rather than needing an escape hatch the way `8045a6e`'s own audit found dark-v1/v2 needed one |
| `LOST` | `--lead-lost-bg` / `-fg` | `#FBE8E4` / `#B23A2E` (bad family) |
| `REJECTED` | `--stage-indigo` / `-bg` | `#4A4A9C` / `#E9E9F5` |
| Source: Website | `--src-website-bg` / `-fg` | `#F1ECDD` / `#746952` (neutral) |
| Source: Meta Ads | `--src-meta-bg` / `-fg` | `#E7EEF7` / `#2E5FA3` (info) |
| Source: Google Ads | `--src-google-bg` / `-fg` | `#FBF0DE` / `#A6650E` (warn) |
| Source: WhatsApp | `--src-whatsapp-bg` / `-fg` | `#E8F3EA` / `#2F8F5B` (good) |
| Source: IndiaMART | `--src-indiamart-bg` / `-fg` | `#FBE8E4` / `#B23A2E` (bad) |
| Source: TradeIndia | `--source-orange` / `-bg` | `#B4600F` / `#FBEBDA` |
| Source: ExporterIndia | `--stage-indigo` / `-bg` | (shared with Rejected, as today) |

### Funnel (`components/ui/Funnel.tsx`) — including a real bug I found while grounding this section

`RAMP` stop 1: `--funnel-1-bg` / `-fg` → `#E8F3EA` / `#1C7A4F` (pale mint,
deep-green text — correct contrast for the *normal* state).
`RAMP` stop 2: `--funnel-2-bg` → `#3FA06B` (text is hardcoded `"#fff"` in
the component, unaffected by tokens).
`RAMP` stop 3: uses `--good-strong` (`#1C7A4F`), text hardcoded `"#fff"`.

**While grounding this section against the live component** (per your
instruction to design specifically against the real Lead Qualification
Funnel, not an assumption), I traced the exact cause of the V4 contrast
issue you flagged. It's in `Funnel.tsx` itself, not in any theme's tokens:

```tsx
background: flagged ? "var(--bad)" : ramp.shade,
color: ramp.txt,
```

When a stage is flagged as the "weakest conversion" stage (a real,
data-driven condition — in the live app today, `NEW` is usually the
flagged stage), the **background** switches to `var(--bad)`, but the
**text color** stays whatever that stop's normal `ramp.txt` was. For stop 1
("New"), `ramp.txt` is `--funnel-1-fg` — a green. Under Dark V4 this means
bright green text (`#4ADE80`) on a red background (`#F0524F`) — an
unintentional, jarring color clash, not a designed state. This is a
**pre-existing, cross-theme component bug**, not something introduced by
V4's tokens, and it would reproduce under Warm Ledger too (deep-green
`#1C7A4F` text on brick-red `#B23A2E` — still poor, still clashing).

This can't be fully solved with token values alone: stop 1's *normal* state
needs dark text on a pale bg (correct, accessible design), while the
*flagged* state needs light text on a solid `--bad` fill — the same
`color` property can't correctly serve both cases as currently written.
**Recommended fix (one line, outside this proposal's token-only scope,
flagged for a separate tiny follow-up):**

```tsx
color: flagged ? "#fff" : ramp.txt,
```

This is a component logic change (not a token/style value), so it's
explicitly **not** part of this proposal and **not** something I'm
implementing here — but it should be fixed before or alongside whichever
light-theme candidate ships next, since it affects every theme, not just
the one under review. Section 17 restates this as a risk.

---

## 7. Surface / elevation system

- **Cards / Kanban cards / notes** (`.card`, `.kcard`, `.note`):
  `--surface` (`#FFFEFB`), `--line` border, `--shadow` (warm-tinted, see
  below). Structurally identical to today — only the warmth of the
  background and shadow change.
- **Tables**: header row (`th`) keeps `--faint` uppercase text on
  transparent background — unchanged mechanism. Row hover
  (`tbody tr.clickable:hover`, `.lead-row:hover`) uses the warm
  `--row-hover`/`--lead-row-hover` tints (`#F6F2E7` / `#F5F0E3` — kept as
  two distinct tokens, matching the precedent set by the `8045a6e`
  restoration work, which deliberately preserved them as separate values
  rather than merging).
- **Forms** (`.field input/select/textarea`, `.fd-search`,
  `.fd-date-row input`): `--surface-inset` (`#F3EFE4`) — visibly deeper
  than the card it sits in, reading as a recess, same mechanism V4
  introduced for dark, now given a light-appropriate value.
- **Modals** (`.modal`): `--surface-2` (`#FFFFFF`, the crispest white in
  the system) + `--shadow-2`.
- **Dropdown panels** (`.fd-panel`) and the **account/theme popover**
  (`.user-menu`, shared by `UserMenu`/`ThemeToggle`): same `--surface-2` /
  `--border-soft` / `--shadow-2` treatment as modals, for the same
  floating-panel consistency V4 established.
- **Toasts** (`.toast`) / **rail tooltip** (`.rail-tooltip`): stay
  "always-dark chips" via `--chip-ink` (a warm near-black, `#241C0F`,
  matching `--ink`), unchanged from the existing cross-theme convention —
  these two elements are dark chips in *every* theme, light included,
  already, and this proposal doesn't touch that.
- **Selected states** (`.lead-row.sel`, `.mod.active`, `.chip.active`):
  `--m-soft` background / solid `--m` fill — unchanged mechanism, warmer
  green.
- **Hover states**: row/list hover via the warm `--row-hover` tint;
  `.mod:hover` via `--canvas` (already token-driven, automatically warm).

Elevation reads through **two cues working together**: a warmth gradient
(canvas is warmest, surface-2 is most neutral/crisp) and a conventional
shadow/border step — rather than V4's lightness-only approach (light mode
can't rely on "things get lighter as they rise" the way dark mode does,
since everything here is already light; warmth-as-depth is the equivalent
tool).

---

## 8. Navigation rail

None of the four framings you listed — "remain integrated with surface,"
"visually recessed," "visually elevated" — quite fits. Proposing a fourth:
**grounded / anchored**. The rail gets its own token, `--surface-rail`
(`#F1EBDB`), a shade *deeper* than canvas but *lighter* than the border
color — not a card (too flat/undifferentiated, today's actual behavior),
not visually "sunken" the way a dark theme's black rail recedes (there's no
equivalent visual language in a light palette — deeper ≠ receded when
everything is still light), and not elevated/raised either (no shadow, no
lift). It's simply a different *ply* of the same paper stock — like a
ledger's cover next to its pages: present, structural, slightly more
substantial than the canvas, but not competing with card content for
attention. A 1px `--line` border on the right edge (already exists today)
completes the separation.

This mirrors the *spirit* of V4's "rail recedes so content advances"
without copying its literal mechanism (which depended on a black canvas
V4 has and light mode doesn't).

---

## 9. KPI / Dashboard treatment

Grounded directly in the real components — `StatCard`
(`components/ui/Card.tsx`) and the `.stat`/`.spark`/`.d.up`/`.d.down`/
`.pill` rules in `globals.css`, and the Focus/Insight list
(`app/dashboard/page.tsx`'s `.li .ic`, which already picks its
background/color from each item's real `tone` field). No new component
structure assumed (the earlier V3 milestone's `.tile`/`.tile .ic` mistake —
a dead CSS rule with zero JSX consumers — was specifically checked against
here and confirmed not repeated: `.tile` still has no consumers today).

- `.stat .v` (the headline number) renders in `--ink` (`#241C0F`) — the
  deepest, warmest near-black in the system, maximizing legibility for the
  one number on each card that matters most.
- `.stat .k` (label) stays `--muted`; `.stat .d span` (delta annotation)
  stays `--faint` — unchanged mechanism, new warm values.
- `.stat .d.up` / `.d.down` continue using `--good` / `--bad` — deepened
  ochre-adjacent... no — these stay green/brick-red per §5, just warmer and
  slightly deeper than today's brighter versions, which reads calmer on a
  dashboard with four stat cards side by side.
- The Focus/Insight list's tone-based icon chips (`bad`/`warn`/`info`/`n`)
  and the Dashboard's Opportunity-stage Kanban snapshot (via
  `KanbanBoard`'s `TINT`/`STAGE_COLOR` map) both pick up Warm Ledger's
  palette automatically — zero code changes, same as V4 found for dark.
- Sparklines (`Sparkline` component, sits inside `.spark`) aren't
  token-audited in this proposal since I didn't find them using CSS custom
  properties in the pass above — flagged as a §18 implementation-time
  check rather than assumed.

---

## 10. Funnel visibility

Addressed in depth in §6 with the actual `Funnel.tsx` bug traced and a
fix recommended (out of this proposal's scope, since it's a component
logic change). Within what token values *can* control:

- Stop 1's **normal** state (`--funnel-1-bg`/`-fg`: `#E8F3EA`/`#1C7A4F`)
  is deep green on pale mint — strong, unambiguous contrast, no issue.
- Stops 2 and 3 always render white text on a solid mid/deep-green fill
  (`#3FA06B`, `#1C7A4F`) — both comfortably high-contrast, no issue,
  matches how the component already hardcodes `"#fff"` for these two.
- The "Rejected" row (`background:var(--bad-bg)`, `color:var(--bad)`) —
  `#FBE8E4`/`#B23A2E` — brick-red on pale pink, strong contrast, no issue.
- The **only** genuinely unresolved case is the flagged/weakest-conversion
  state described in §6, and it's unresolved because it's a component
  bug, not a token gap — no set of token values fixes a hardcoded `color`
  that doesn't switch with the background it's now sitting on.

---

## 11. Forms and focus states

Same input hierarchy as established by `8045a6e`/V4 (`.field
input/select/textarea`): `--surface-inset` background, `--line` border,
`--text` value color. Focus state adopts the **same refined two-layer
ring** V4 introduced for dark (a crisp 1px accent border layered under a
soft glow, replacing the single soft ring every other theme still uses):

```
box-shadow: 0 0 0 1px var(--m), 0 0 0 4px rgba(var(--m-rgb),.16);
```

Proposed as `--focus-ring`, consumed via the same
`var(--focus-ring, 0 0 0 3px var(--m-soft))` fallback pattern V4 already
established on `.field input:focus` — meaning this is additive and scoped
to Warm Ledger's own `data-theme` block; it does not change `8045a6e`'s
existing single-ring focus state, only offers the option for this new
variant, consistent with V4 also being scoped rather than applied
retroactively.

Native checkbox/radio `accent-color` resolves through `--control-accent`
(`#1C7A4F`), same mechanism as every other theme.

---

## 12. Tables and ERP density

- Warm, low-contrast dividers (`--line`/`--line-2`) keep dense tables from
  looking gridded/heavy — a common ERP failure mode where every cell
  boundary competes for attention. The warm taupe hairlines recede more
  readily against a warm canvas than a cool gray would, since there's no
  hue mismatch between "structure" and "background" to draw the eye.
- Row hover (`--row-hover`) is a *subtle* lift (barely darker than
  `--line-2`), not a strong highlight — appropriate for scanning large
  lists where every row will be hovered in sequence; a loud hover state
  becomes visual noise at that frequency.
- Status tags (`.tag.g/.w/.b/.i/.n`, `LeadStatusTag`, `SourceBadge`) all
  render as a small dot (`.tag::before{background:currentColor}`) plus a
  pale-tint pill with saturated text — never relying on background hue
  alone (see §13). This pattern is unchanged; only the specific hues are
  new.
- Selected rows (`.lead-row.sel`) use `--m-soft` — a wash, not a solid
  fill — so a selected row's text stays fully legible without needing a
  separate "selected text color" token.

---

## 13. Accessibility / readability considerations

- `--ink`/`--text` on `--canvas`/`--surface` are near-black on near-white
  in every combination — comfortably high contrast (double-digit ratios),
  no concern.
- `--muted` (`#746952`) on `--canvas`/`--surface`: the one secondary-text
  pairing worth flagging for a real contrast-ratio check during
  implementation (§18) — warm mid-tone grays sitting on a warm light
  background compress more than a cool gray on cool white does, purely
  because both ends of the pairing share more of the same hue. I picked
  `#746952` specifically darker than a "typical" muted gray for this
  reason, but it should be verified with an actual contrast tool before
  shipping, not just eyeballed.
- `--warn` (`#A6650E`) is deliberately a **dark** ochre rather than a
  bright amber — bright ambers/yellows are the semantic color most likely
  to fail AA contrast on a light background (their luminance range is
  naturally compressed), and doubly so against a *warm* light background
  where hue proximity compounds the problem. This was a deliberate
  darkening, not an incidental choice.
- Status is never conveyed by color alone anywhere in the existing
  architecture, and this proposal preserves that: tag dots + text labels,
  distinct SVG shapes/monograms per lead source
  (`components/ui/SourceBadge.tsx`'s own documented rationale), disabled
  buttons using opacity + `cursor` change, not color alone.
- The focus ring (§11) adds a crisp 1px border *in addition to* the glow,
  so focus is visible even for users with reduced color perception, not
  dependent on the soft green haze alone being noticeable.

---

## 14. Token architecture

Same isolation mechanism as V4, applied to a light candidate for the first
time — treated architecturally as "just another selectable variant," not
as a modification of the canonical light theme:

1. A wholly new, **self-contained** `:root[data-theme="light-warm-ledger"]`
   block in `app/globals.css` (naming TBD — not `"light"`, which stays the
   attribute-less default per the existing `ThemeContext.tsx` convention).
   Not nested under or merged with the base `:root` block, and not
   touching `dark-v1`/`dark-v2`/`dark-v3`/`dark-v4` at all.
2. Every token this candidate needs is defined fresh inside that block —
   mirroring exactly how `dark-v3`/`dark-v4` are fully self-contained
   rather than partially inheriting — including the tokens that are
   currently "fixed across every theme" only by virtue of never being
   redefined (`--chip-ink`, `--mark-bg`; `--mark-fg` can stay `inherit`
   here too, since that only resolves correctly in a *light*-style theme,
   which this is).
3. `lib/theme/ThemeContext.tsx`: add the new value to `ThemeName`,
   `THEMES`, and `THEME_INIT_SCRIPT` — the same three-line mechanical
   addition made for `dark-v3` and `dark-v4`.
4. `components/shell/ThemeToggle.tsx`: add the new option to `OPTIONS`.
5. **Zero edits** to the base `:root` (light) block, and **zero edits** to
   any `dark-v*` block — confirmed possible in practice, not just in
   theory, since every shared rule this candidate touches (`.modal`,
   `.fd-panel`, `.user-menu`, `.toast`, `.rail-tooltip`, `.kcard`, `.rail`,
   `.field input:focus`) already resolves through the
   `var(--token, <fallback>)` pattern V3 built and V4 reused — this
   candidate needs **no further rule-level edits at all**, only its own
   new block, exactly like V4 required none beyond `--surface-rail` and
   `--focus-ring` (both already-existing token *names* in the
   architecture; this proposal reuses them, doesn't invent new ones).
6. Post-implementation regression check (same as every prior milestone):
   diff the base `:root` block and all four `dark-v*` blocks against
   `61099e0`, confirm byte-for-byte equality, then
   `npm run typecheck && npm run lint && npm run build`.

---

## 15. Exact proposed token table

```
--canvas:#FAF7F0; --surface:#FFFEFB; --surface-2:#FFFFFF; --surface-inset:#F3EFE4; --surface-rail:#F1EBDB;
--line:#E8E1D0; --line-2:#F1ECDD; --border-soft:rgba(36,28,15,.08);
--ink:#241C0F; --text:#38301F; --muted:#746952; --faint:#B3A688;

--m:#1C7A4F; --m-soft:#E6F0E6; --m-2:#3FA06B; --m-rgb:28,122,79;
--control-accent:#1C7A4F;

--good:#2F8F5B; --good-bg:#E8F3EA; --good-strong:#1C7A4F;
--warn:#A6650E; --warn-bg:#FBF0DE;
--bad:#B23A2E; --bad-bg:#FBE8E4;
--info:#2E5FA3; --info-bg:#E7EEF7;

--stage-teal:#2F8E82; --stage-teal-bg:#E3F1EF;
--stage-indigo:#4A4A9C; --stage-indigo-bg:#E9E9F5;
--source-orange:#B4600F; --source-orange-bg:#FBEBDA;
--stage-violet:#7A4FA0; --stage-violet-bg:#F0E7F5;

--lead-new-bg:#E7EEF7; --lead-new-fg:#2E5FA3;
--lead-good-bg:#E8F3EA; --lead-good-fg:#2F8F5B;
--lead-proposal-bg:#FBF0DE; --lead-proposal-fg:#A6650E;
--lead-negotiation-bg:var(--stage-violet-bg); --lead-negotiation-fg:var(--stage-violet);
--lead-lost-bg:#FBE8E4; --lead-lost-fg:#B23A2E;

--src-website-bg:#F1ECDD; --src-website-fg:#746952;
--src-meta-bg:#E7EEF7; --src-meta-fg:#2E5FA3;
--src-google-bg:#FBF0DE; --src-google-fg:#A6650E;
--src-whatsapp-bg:#E8F3EA; --src-whatsapp-fg:#2F8F5B;
--src-indiamart-bg:#FBE8E4; --src-indiamart-fg:#B23A2E;

--funnel-1-bg:#E8F3EA; --funnel-1-fg:#1C7A4F; --funnel-2-bg:#3FA06B;

--chip-ink:#241C0F; --mark-bg:#FDF3C4; --mark-fg:inherit;

--shadow:0 1px 2px rgba(40,30,10,.04), 0 10px 28px -16px rgba(40,30,10,.12);
--shadow-2:0 4px 14px rgba(40,30,10,.08), 0 24px 56px -20px rgba(40,30,10,.16);
--scrim:rgba(36,28,15,.45); --scrim-rail:rgba(36,28,15,.45);

--row-hover:#F6F2E7; --lead-row-hover:#F5F0E3;
--mod-dot-bg:#E6F0E6;
--focus-ring:0 0 0 1px var(--m), 0 0 0 4px rgba(var(--m-rgb),.16);

color-scheme:light;
```

(66 tokens — the same complete count V4's self-contained block required,
confirming full architectural parity.)

---

## 16. Intentional departures from the current light theme

- Warm ivory/parchment neutral scale instead of cool near-white/gray.
- Elevation communicated partly through warmth (canvas warmest →
  surface-2 crispest), a mechanism the current theme doesn't use at all.
- Deeper, richer brand green (`#1C7A4F` vs. `#059669`).
- A distinct, "grounded" nav rail identity instead of sharing the card
  surface color outright.
- Deepened/warmed semantic hues (ochre, brick-red, muted slate-blue)
  instead of brighter, more generic SaaS amber/red/blue.
- A dedicated, uncontested violet for Negotiation (mirrors V4's dark-side
  fix, applied here from the start rather than as a later patch).
- The refined two-layer focus ring, introduced for this variant rather
  than left as the single soft ring every prior theme still uses.
- Ink and body text are deliberately more separated in depth
  (`#241C0F` vs. `#38301F`) than today's near-identical pair
  (`#14171D` vs. `#1A1C20`).

---

## 17. Risks / tradeoffs

- **The Funnel component bug (§6, §10) is real and pre-existing** —
  flagging it prominently here since it directly affects how this new
  theme (and every other theme) reads in the one place you specifically
  asked me to design around. It needs a one-line component fix separate
  from this proposal.
- **Warm neutrals read differently under different display calibrations
  and lighting** than cool neutrals do — a warm-white canvas can drift
  toward looking "dingy" or "yellowed" on a poorly calibrated or
  blue-light-filtered display, in a way a cool near-white doesn't. This is
  a real tradeoff of the whole direction, not fixable by tuning — worth
  confirming you're comfortable with it before implementation, ideally by
  looking at it live on a couple of different screens.
- **`--muted` contrast** (§13) is the one token whose exact value should
  be re-verified with a contrast-ratio tool at implementation time, not
  just approved from this document's description.
- **Two accepted "warm-ish" but very different candidates** (Warm Ledger
  light, Graphite & Emerald dark) means a user toggling between them
  experiences a bigger visual shift than switching between, say, current
  light and dark-v1 does today (which share more incidental similarity).
  This is arguably a feature (each theme has real identity) but is worth
  naming as a real UX change in how "switching themes" feels.
- **A warm palette is a less common enterprise-software convention** than
  cool neutral — the tradeoff is genuine distinctiveness (the whole point)
  against a small risk that it reads as "less standard SaaS" to a user
  who's used a lot of cool-neutral dashboards. Given RevenueOS already
  has a green brand identity and a paper-trail-heavy domain (quotes,
  invoices, ledgers), I think this risk is well worth taking — but it's a
  judgment call, not a fact.

---

## 18. Recommendation for implementation validation

If approved, before merging:

1. **Regression check** identical to every prior milestone: diff base
   `:root` and all four `dark-v*` blocks against `61099e0`, confirm
   byte-for-byte equality; `npm run typecheck && npm run lint && npm run build`.
2. **Live contrast check** on `--muted`/`--canvas` and `--muted`/`--surface`
   specifically (§13, §17) with an actual contrast tool, not visual
   inspection alone.
3. **Browser walk of the same surface set** checked for V4: Dashboard
   (KPI cards, Focus list, Lead Qualification Funnel — including
   confirming whether the Funnel component fix from §6 has landed
   alongside), Lead Pipeline Kanban (status column colors, Negotiation
   violet), Leads list + Status filter dropdown + checkbox accent-color,
   New Lead modal (elevation, inset inputs, focus ring), Payments/AR
   table, Quotations/Proforma/Sales Orders/Sales Invoices (status
   badges), Customers, Contacts/Notes/Tasks/Activities, Notifications/
   Reports empty states, Search (`<mark>` highlight legibility
   specifically, since `--mark-fg:inherit` depends on correct `--text`
   resolution), and a Lead/Opportunity detail page (panels, DocumentTrail,
   disabled/destructive button states).
4. **Side-by-side with `8045a6e`** on the same page, to confirm the
   warmth genuinely reads as intentional and premium rather than
   "off-white/dated," which is the real risk this direction carries.
5. **Confirm `8045a6e` and V4 remain visually identical** to their last
   verified state — same check performed after V4 shipped, repeated here.

---

## Summary

**Proposal name:** Warm Ledger

**Concise design summary:** A warm ivory/parchment light theme — the light
counterpart to Dark V4's "Graphite & Emerald" — that moves the entire
neutral scale from cool-gray to warm-taupe, deepens the brand green,
introduces a warmth-based elevation cue (canvas warmest → modal/dropdown
crispest white), gives the nav rail its own "grounded" identity distinct
from card surfaces, and deepens the semantic palette (ochre/brick-red/
slate-blue) so nothing reads as a bright generic-SaaS alert color against
the warm base. Like V4, it keeps brand green consistent with the product's
real identity and gives Negotiation a free, uncontested violet rather than
needing a collision workaround.

**Exact token/palette table:** §15 above (66 tokens, full parity with V4's
self-contained block).

**Comparison against `8045a6e`:** §2 above — warm vs. cool neutral scale,
deeper brand green, warmth-as-elevation mechanism the current theme
doesn't use, a distinct rail identity, and deepened/warmed semantic hues;
not a recolor of the same structure.

**Implementation scope estimate:** Small, matching V4's actual scope —
one new self-contained `:root[data-theme="…"]` block in
`app/globals.css` (~66 tokens, no new architecture), plus the same three
mechanical additions `ThemeContext.tsx`/`ThemeToggle.tsx` needed for V4.
No component-structure changes. The one adjacent item worth doing
alongside it — fixing the Funnel component's flagged-state text color
(§6/§10/§17) — is a genuine one-line component change, separable from the
token work, and should be called out to you explicitly as its own small
decision before implementation rather than silently bundled in.

**Files that would likely change if approved:**
- `app/globals.css` (new self-contained block + nothing else, per §14's
  finding that the existing `var(token, fallback)` plumbing needs no
  further edits)
- `lib/theme/ThemeContext.tsx`
- `components/shell/ThemeToggle.tsx`
- *(separable, not part of this proposal's token scope)*
  `components/ui/Funnel.tsx` — the one-line flagged-state color fix

No files have been modified and no commit has been made to produce this
proposal.
