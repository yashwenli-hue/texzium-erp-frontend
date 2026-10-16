"use client";

import { ReactNode } from "react";
import { Icon } from "./Icon";
import { SortDirection, SortState } from "../../lib/types/common";
import { EmptyState } from "./Button";

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render: (row: T) => ReactNode;
}

export function SortHeader({
  label,
  field,
  sort,
  onSort,
}: {
  label: string;
  field: string;
  sort?: SortState<string>;
  onSort?: (field: string) => void;
}) {
  const active = sort?.field === field;
  return (
    <button
      type="button"
      className={`th-sort ${active ? "active" : ""}`}
      onClick={() => onSort?.(field)}
    >
      {label}
      <span className="arrow" aria-hidden="true">
        <Icon name={active && sort?.direction === "asc" ? "sortAsc" : "sortDesc"} size={12} />
      </span>
    </button>
  );
}

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  sort,
  onSort,
  onRowClick,
  emptyIcon = "file",
  emptyTitle = "No records",
  emptyBody,
}: {
  columns: Column<T>[];
  rows: T[];
  sort?: SortState<string>;
  onSort?: (field: string) => void;
  onRowClick?: (row: T) => void;
  emptyIcon?: string;
  emptyTitle?: string;
  emptyBody?: string;
}) {
  if (rows.length === 0) {
    return <EmptyState icon={emptyIcon} title={emptyTitle} body={emptyBody} />;
  }

  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                aria-sort={c.sortable && sort?.field === c.key ? (sort.direction === "asc" ? "ascending" : "descending") : undefined}
              >
                {c.sortable ? (
                  <SortHeader label={c.header} field={c.key} sort={sort} onSort={onSort} />
                ) : (
                  c.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className={onRowClick ? "clickable" : undefined}
              onClick={() => onRowClick?.(row)}
              // A clickable row can be reached with Tab and opened with Enter, like a link.
              // Keys pressed on a control inside the row are left to that control.
              tabIndex={onRowClick ? 0 : undefined}
              onKeyDown={
                onRowClick
                  ? (e) => {
                      if (e.target === e.currentTarget && e.key === "Enter") {
                        e.preventDefault();
                        onRowClick(row);
                      }
                    }
                  : undefined
              }
            >
              {columns.map((c) => (
                <td key={c.key}>{c.render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function toggleSortDirection(
  current: SortState<string> | undefined,
  field: string
): SortState<string> {
  if (current?.field === field) {
    const next: SortDirection = current.direction === "asc" ? "desc" : "asc";
    return { field, direction: next };
  }
  return { field, direction: "asc" };
}
