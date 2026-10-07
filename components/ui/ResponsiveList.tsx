import Link from "next/link";
import { ReactNode } from "react";
import { EmptyState } from "./Button";

export interface ResponsiveColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /** The column that carries the row's link on a wide screen (the first by default). */
  primary?: boolean;
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
}) {
  if (rows.length === 0) {
    return <EmptyState icon={emptyIcon} title={emptyTitle} body={emptyBody} action={emptyAction} />;
  }

  const primaryKey = (columns.find((c) => c.primary) ?? columns[0]).key;

  return (
    <div data-testid={testId} className="rl">
      <div className="table-scroll rl-table">
        <table>
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} scope="col">
                  {c.header}
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
