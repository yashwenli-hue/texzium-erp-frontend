/**
 * Representative source markers. `sourceName` must exactly match a value
 * from the verified LeadSource list (docs/backend-ui-contract.md §4) —
 * this is presentation only, not a claim about backend source-type data.
 *
 * For well-known platforms (Website, Google Ads, Meta Ads, WhatsApp) each
 * mark uses a distinct SHAPE plus the platform's associated color, so a
 * source is identifiable without relying on color alone (and stays
 * legible for color-blind users). These are simplified, representative
 * glyphs sized/drawn for this UI — not a pixel reproduction of any
 * platform's official logo artwork/wordmark. For the regional B2B
 * marketplaces (IndiaMART, TradeIndia, ExporterIndia) there is no single
 * universally-recognized simple mark to represent, so those stay as
 * colored monogram badges. No new dependency — everything here is inline
 * SVG.
 */
// Colors per design review Stage 1.3 §1 (Website=grey, WhatsApp=WhatsApp
// green, IndiaMART=red, TradeIndia=orange, Google=yellow). Meta Ads and
// ExporterIndia weren't specified, so they keep their existing colors.
//
// Theme-aware token references, not literal hex (these are presentation
// tints, not literal third-party brand colors — the genuine brand hex for
// Google/Meta live only in their SVG glyphs below, left untouched).
// TradeIndia/ExporterIndia reuse the shared --source-orange/--stage-indigo
// hue tokens (their light values were already an exact match for this
// map's original hex). The rest use dedicated --src-* tokens instead of
// the shared --line-2/--muted/--info/--warn/--good/--bad tokens, since
// those shared tokens' light-mode values don't equal this map's original
// per-source hex (see app/globals.css's "Version A light-theme
// restoration" block) — each --src-* token carries its own exact original
// light hex while keeping today's already-shipped dark-v1/dark-v2
// appearance unchanged.
const SOURCE_STYLES: Record<string, { bg: string; fg: string; mark: string }> = {
  Website: { bg: "var(--src-website-bg)", fg: "var(--src-website-fg)", mark: "W" },
  "Meta Ads": { bg: "var(--src-meta-bg)", fg: "var(--src-meta-fg)", mark: "M" },
  "Google Ads": { bg: "var(--src-google-bg)", fg: "var(--src-google-fg)", mark: "G" },
  WhatsApp: { bg: "var(--src-whatsapp-bg)", fg: "var(--src-whatsapp-fg)", mark: "wa" },
  IndiaMART: { bg: "var(--src-indiamart-bg)", fg: "var(--src-indiamart-fg)", mark: "iM" },
  TradeIndia: { bg: "var(--source-orange-bg)", fg: "var(--source-orange)", mark: "T" },
  ExporterIndia: { bg: "var(--stage-indigo-bg)", fg: "var(--stage-indigo)", mark: "E" },
};

const FALLBACK = { bg: "var(--line-2)", fg: "var(--muted)", mark: "•" };

/** Same color language as the badge itself, for charts/legends that need to correlate with it. */
export function sourceColor(source: string): string {
  return (SOURCE_STYLES[source] ?? FALLBACK).fg;
}

function GlobeGlyph({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.6 3.8 5.7 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.7-3.8-9S9.5 5.6 12 3z" />
    </svg>
  );
}

function WhatsAppGlyph({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.5a9.3 9.3 0 0 0-8 14L3 21.5l5.2-1a9.3 9.3 0 1 0 3.8-18zm0 2a7.3 7.3 0 0 1 0 14.6 7.2 7.2 0 0 1-3.7-1l-.3-.2-2.8.6.6-2.7-.2-.3a7.3 7.3 0 0 1 6.4-11z" />
      <path d="M9.2 7.6c-.2-.5-.4-.5-.7-.5h-.5c-.2 0-.5.1-.7.4-.3.2-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3 4.8 4.3 2.4 1 2.9.8 3.4.8.5 0 1.6-.7 1.9-1.3.2-.6.2-1.1.2-1.3-.1-.1-.3-.2-.6-.4l-2-1c-.3-.1-.5-.2-.7.2l-.5.7c-.2.2-.4.3-.7.1a6 6 0 0 1-1.8-1.1 7 7 0 0 1-1.3-1.6c-.1-.3 0-.4.2-.6l.4-.5c.1-.2.2-.3.2-.5.1-.2 0-.4 0-.5l-.9-2.1z" />
    </svg>
  );
}

function GoogleGlyph({ size }: { size: number }) {
  // Representative four-arc ring — evokes Google's multicolor mark without
  // reproducing the wordmark/letterform.
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" strokeWidth={3.4} strokeLinecap="round">
      <circle cx="12" cy="12" r="8.3" stroke="#4285F4" strokeDasharray="13 40" strokeDashoffset="0" transform="rotate(-90 12 12)" />
      <circle cx="12" cy="12" r="8.3" stroke="#EA4335" strokeDasharray="13 40" strokeDashoffset="-13" transform="rotate(-90 12 12)" />
      <circle cx="12" cy="12" r="8.3" stroke="#FBBC05" strokeDasharray="13 40" strokeDashoffset="-26" transform="rotate(-90 12 12)" />
      <circle cx="12" cy="12" r="8.3" stroke="#34A853" strokeDasharray="13 40" strokeDashoffset="-39" transform="rotate(-90 12 12)" />
    </svg>
  );
}

function MetaGlyph({ size }: { size: number }) {
  // Representative overlapping-ring mark — evokes Meta's brand without
  // reproducing the official infinity wordmark artwork.
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#3457D5" strokeWidth={2.4}>
      <path d="M6.5 16.5c2.5 0 3.5-9 6-9s3 6.5 4.5 6.5 2-2 2-2" strokeLinecap="round" />
      <path d="M6.5 16.5c-2 0-2.5-9 1-9" strokeLinecap="round" />
    </svg>
  );
}

function BrandGlyph({ source, size }: { source: string; size: number }) {
  switch (source) {
    case "Website":
      return <GlobeGlyph size={size} />;
    case "WhatsApp":
      return <WhatsAppGlyph size={size} />;
    case "Google Ads":
      return <GoogleGlyph size={size} />;
    case "Meta Ads":
      return <MetaGlyph size={size} />;
    default:
      return null;
  }
}

const BRANDED_SOURCES = new Set(["Website", "WhatsApp", "Google Ads", "Meta Ads"]);

export function SourceBadge({ source, size = 22 }: { source: string; size?: number }) {
  const style = SOURCE_STYLES[source] ?? FALLBACK;
  const glyphSize = Math.round(size * 0.6);
  const isBranded = BRANDED_SOURCES.has(source);
  return (
    <span
      title={source}
      aria-label={source}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: size * 0.32,
        background: style.bg,
        color: style.fg,
        fontFamily: "var(--display)",
        fontWeight: 700,
        fontSize: size * 0.4,
        flex: "none",
        lineHeight: 1,
      }}
    >
      {isBranded ? <BrandGlyph source={source} size={glyphSize} /> : style.mark}
    </span>
  );
}

export function SourceTag({ source }: { source: string }) {
  const style = SOURCE_STYLES[source] ?? FALLBACK;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 12,
        fontWeight: 600,
        color: "var(--text)",
      }}
    >
      <SourceBadge source={source} size={18} />
      {source}
    </span>
  );
}
