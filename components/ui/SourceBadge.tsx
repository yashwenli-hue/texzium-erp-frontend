/**
 * Generic colored-monogram source marker — deliberately NOT a reproduction
 * of any brand's real logo/wordmark (Meta, Google, etc.). Colors are a
 * distinct, made-up palette used purely for scanability, not brand
 * identity. `sourceName` must exactly match a value from the verified
 * LeadSource list (docs/backend-ui-contract.md §4) — this is presentation
 * only, not a claim about backend source-type data.
 */
const SOURCE_STYLES: Record<string, { bg: string; fg: string; mark: string }> = {
  Website: { bg: "#E7F6EF", fg: "#0D7A4E", mark: "W" },
  "Meta Ads": { bg: "#E7EEFE", fg: "#3457D5", mark: "M" },
  "Google Ads": { bg: "#FEF3E2", fg: "#B7791F", mark: "G" },
  WhatsApp: { bg: "#E7F8ED", fg: "#1C9A4B", mark: "wa" },
  IndiaMART: { bg: "#FDEEEA", fg: "#C6491F", mark: "iM" },
  TradeIndia: { bg: "#FFF1E0", fg: "#B45B00", mark: "T" },
  ExporterIndia: { bg: "#EFEAFE", fg: "#5B3FD1", mark: "E" },
};

const FALLBACK = { bg: "var(--line-2)", fg: "var(--muted)", mark: "•" };

export function SourceBadge({ source, size = 22 }: { source: string; size?: number }) {
  const style = SOURCE_STYLES[source] ?? FALLBACK;
  return (
    <span
      title={source}
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
      {style.mark}
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
