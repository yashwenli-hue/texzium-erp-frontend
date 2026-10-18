import { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  cta,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  cta?: ReactNode;
}) {
  return (
    <div className="page-head">
      <div className="titles">
        <span className="eyebrow">
          <span className="g" />
          {eyebrow}
        </span>
        <h1 className="title">{title}</h1>
        <p className="subtitle">{subtitle}</p>
      </div>
      {cta && <div className="head-cta">{cta}</div>}
    </div>
  );
}

/**
 * Plain-language help about how a page works, for the people using it: how records get here,
 * what a step needs. Never implementation detail (endpoints, files, data sources).
 */
export function PageHelp({ title, children }: { title: string; children: ReactNode }) {
  return (
    <aside className="helper" aria-label={title}>
      <svg className="i16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5M12 8h.01" />
      </svg>
      <div>
        <b>{title}.</b> {children}
      </div>
    </aside>
  );
}

/**
 * Says plainly that a screen is a preview on sample data: it is not connected to RevenueOS
 * records, and nothing entered on it is kept. Shown wherever a screen has no backend of its own.
 */
export function PreviewNotice({ entered }: { entered: string }) {
  return (
    <div className="preview-notice" role="note">
      <svg className="i16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
        <path d="M12 9v4M12 17h.01" />
      </svg>
      <div>
        <b>Preview with sample data.</b> This screen is not connected to your RevenueOS records yet. {entered} here
        is not saved and disappears when the page is reloaded.
      </div>
    </div>
  );
}
