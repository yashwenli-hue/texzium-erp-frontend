import Link from "next/link";
import { Icon } from "./Icon";

export interface DocumentTrailNode {
  key: string;
  label: string;
  sublabel?: string;
  href?: string;
  current?: boolean;
}

/**
 * Breadcrumb-style chain of linked business documents (Lead → Opportunity →
 * Quotation → …). Keeps the originating business context visible while
 * moving through a record's detail page. Today this only ever renders
 * Lead → Opportunity; it exists as shared infrastructure for the longer
 * chains (→ Proforma → Sales Order → Sales Invoice → Payment) that later
 * stages will add nodes to.
 */
export function DocumentTrail({ nodes }: { nodes: DocumentTrailNode[] }) {
  if (nodes.length === 0) return null;
  return (
    <div className="doc-trail" aria-label="Document trail">
      {nodes.map((n, i) => (
        <span className="doc-trail-item" key={n.key}>
          {i > 0 && <Icon name="arrow" size={12} className="doc-trail-sep" />}
          {n.href && !n.current ? (
            <Link href={n.href} className="doc-trail-node">
              <span className="doc-trail-label">{n.label}</span>
              {n.sublabel && <span className="doc-trail-sub">{n.sublabel}</span>}
            </Link>
          ) : (
            <span className={`doc-trail-node ${n.current ? "current" : ""}`}>
              <span className="doc-trail-label">{n.label}</span>
              {n.sublabel && <span className="doc-trail-sub">{n.sublabel}</span>}
            </span>
          )}
        </span>
      ))}
    </div>
  );
}
