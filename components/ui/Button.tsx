import { ReactNode } from "react";
import { Icon } from "./Icon";

export function Button({
  variant = "ghost",
  icon,
  children,
  className,
  ...rest
}: {
  variant?: "primary" | "ghost";
  icon?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`btn ${variant} ${className ?? ""}`} {...rest}>
      {icon && <Icon name={icon} size={16} />}
      {children}
    </button>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: string;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="ic">
        <Icon name={icon} size={20} />
      </div>
      <b>{title}</b>
      {body && <p>{body}</p>}
      {action && <div style={{ marginTop: 14 }}>{action}</div>}
    </div>
  );
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  // Show a compact window of page numbers around the current page.
  const pages: number[] = [];
  const windowSize = 1;
  for (let p = Math.max(1, page - windowSize); p <= Math.min(totalPages, page + windowSize); p++) {
    pages.push(p);
  }

  return (
    <div className="pagination">
      <div className="info">
        Showing <b>{start}</b>–<b>{end}</b> of <b>{total}</b>
      </div>
      <div className="controls">
        <button className="page-btn" disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Previous page">
          <Icon name="chevronLeft" size={15} />
        </button>
        {pages[0] > 1 && (
          <>
            <button className="page-btn" onClick={() => onPageChange(1)}>1</button>
            {pages[0] > 2 && <span style={{ color: "var(--faint-text)", fontSize: 12 }}>…</span>}
          </>
        )}
        {pages.map((p) => (
          <button key={p} className={`page-btn ${p === page ? "active" : ""}`} onClick={() => onPageChange(p)}>
            {p}
          </button>
        ))}
        {pages[pages.length - 1] < totalPages && (
          <>
            {pages[pages.length - 1] < totalPages - 1 && (
              <span style={{ color: "var(--faint-text)", fontSize: 12 }}>…</span>
            )}
            <button className="page-btn" onClick={() => onPageChange(totalPages)}>{totalPages}</button>
          </>
        )}
        <button
          className="page-btn"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <Icon name="chevronRight" size={15} />
        </button>
      </div>
    </div>
  );
}

/**
 * Client-side pagination helper. Designed so swapping to real API pagination
 * later only means feeding `page`/`pageSize` into the repository query
 * instead of slicing here — the component usage stays identical.
 */
export function paginate<T>(rows: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize;
  return rows.slice(start, start + pageSize);
}
