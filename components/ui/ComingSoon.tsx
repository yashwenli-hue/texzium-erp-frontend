import { PageHeader, DesignNote } from "./PageHeader";
import { Icon } from "./Icon";

/**
 * Nav placeholder for a verified backend module this frontend hasn't built
 * a screen for yet (Quote-to-Cash beyond Quotations, Reports). Keeps the
 * nav item honest and navigable rather than a dead/disabled entry, without
 * implying the screen exists.
 */
export function ComingSoon({
  icon,
  eyebrow,
  title,
  subtitle,
  backendNote,
}: {
  icon: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  backendNote: string;
}) {
  return (
    <div className="page">
      <PageHeader eyebrow={eyebrow} title={title} subtitle={subtitle} />
      <div className="card panel" style={{ marginTop: 4 }}>
        <div className="empty-state" style={{ padding: "56px 24px" }}>
          <div className="ic" style={{ width: 52, height: 52, margin: "0 auto 16px" }}>
            <Icon name={icon} size={24} />
          </div>
          <b style={{ fontSize: 15 }}>Coming in a later stage</b>
          <p style={{ maxWidth: 440, margin: "6px auto 0" }}>
            This screen is not built yet — it&apos;s next in line for the Quote-to-Cash build-out.
          </p>
        </div>
      </div>
      <DesignNote>
        <b>Backend note.</b> {backendNote}
      </DesignNote>
    </div>
  );
}
