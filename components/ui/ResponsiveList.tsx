import Link from "next/link";
import { ReactNode } from "react";
import { EmptyState } from "./Button";
import { Icon } from "./Icon";

export interface ResponsiveColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /** The column that carries the row's link on a wide screen (the first by default). */
  primary?: boolean;
  /** Present when the list can be ordered by this column: its header becomes a sort button. */
  sortKey?: string;
}

/** The order the list is in, and the choices. The caller sorts; the list only shows the controls. */
export interface ListSort {
  key: string;
  direction: "asc" | "desc";
  /** What can be sorted by: the header buttons of the table and the "Sort by" choices of the cards. */
  options: Array<{ key: string; label: string }>;
  /** Called with a new key, or with the same key and the opposite direction. The caller applies its own default direction to a new key. */
  onChange: (key: string, direction?: "asc" | "desc") => void;
}

/**
 * A list of records that is a table on a wide screen and a stack of cards on a
 * phone, not a shrunken table. Every row is a real link, so it can be reached
 * and opened from the keyboard and read out by assistive technology, and the
 * whole row is clickable. Both layouts are rendered and CSS shows one of them
 * (the other is display:none, so it is not read twice); there is no width
 * measurement, so it renders the same on the server and the client. The switch
 * follows the width of the list itself (a container query), not the width of the
 * screen, so a tablet with the navigation open gets cards instead of a table that
 * scrolls sideways and hides its last columns.
 *
 * Presentational only: filtering, sorting and paging stay with the caller.
 */
export function ResponsiveList<T extends { id: string }>({
  rows,
  columns,
  getHref,
  getLabel,
  card,
  emptyIcon = "file",
  emptyTitle = "Nothing to show",
  emptyBody,
  emptyAction,
  caption,
  testId,
  sort,
}: {
  rows: T[];
  columns: ResponsiveColumn<T>[];
  getHref: (row: T) => string;
  /** The accessible name of a row's link, e.g. the customer's name. */
  getLabel: (row: T) => string;
  /** The content of a card. */
  card: (row: T) => ReactNode;
  emptyIcon?: string;
  emptyTitle?: string;
  emptyBody?: string;
  emptyAction?: ReactNode;
  caption?: string;
  testId?: string;
  sort?: ListSort;
}) {
  if (rows.length === 0) {
    return <EmptyState icon={emptyIcon} title={emptyTitle} body={emptyBody} action={emptyAction} />;
  }

  const primaryKey = (columns.find((c) => c.primary) ?? columns[0]).key;

  return (
    <div data-testid={testId} className="rl">
      {sort && (
        <div className="rl-sort">
          <label>
            <span>Sort by</span>
            <select value={sort.key} onChange={(e) => sort.onChange(e.target.value)} aria-label="Sort by">
              {sort.options.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="btn ghost sm" onClick={() => sort.onChange(sort.key, sort.direction === "asc" ? "desc" : "asc")} aria-label={`Order: ${sort.direction === "asc" ? "ascending" : "descending"}. Press to reverse.`}>
            <Icon name={sort.direction === "asc" ? "up" : "down"} size={14} />
            {sort.direction === "asc" ? "Ascending" : "Descending"}
          </button>
        </div>
      )}
      <div className="table-scroll rl-table">
        <table>
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} scope="col" aria-sort={sort && c.sortKey === sort.key ? (sort.direction === "asc" ? "ascending" : "descending") : undefined}>
                  {sort && c.sortKey ? (
                    <button type="button" className="th-sort" onClick={() => sort.onChange(c.sortKey!)}>
                      {c.header}
                      {c.sortKey === sort.key && <Icon name={sort.direction === "asc" ? "up" : "down"} size={12} />}
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="rl-row">
                {columns.map((c) => (
                  <td key={c.key}>
                    {c.key === primaryKey ? (
                      <Link href={getHref(row)} className="row-link" aria-label={getLabel(row)}>
                        {c.render(row)}
                      </Link>
                    ) : (
                      c.render(row)
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="rl-cards" aria-label={caption}>
        {rows.map((row) => (
          <li key={row.id}>
            <Link href={getHref(row)} className="rl-card" aria-label={getLabel(row)}>
              {card(row)}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
