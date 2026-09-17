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

export function DesignNote({ children }: { children: ReactNode }) {
  return (
    <div className="helper">
      <svg className="i16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18" />
        <path d="m19 9-5 5-4-4-4 4" />
      </svg>
      <div>{children}</div>
    </div>
  );
}
