import { Icon } from "./Icon";

export interface ReadinessItem {
  key: string;
  ok: boolean;
  title: string;
  /** Why it matters, or what to do about it. */
  why?: string;
}

/**
 * A short "is this ready?" checklist: each line says what is true, and when it is
 * not, what to do. The state is also written out (not only coloured), so it
 * reads the same to a screen reader. Presentational only.
 */
export function ReadinessPanel({ items, testId }: { items: ReadinessItem[]; testId?: string }) {
  return (
    <ul className="readiness" data-testid={testId}>
      {items.map((i) => (
        <li key={i.key} className={i.ok ? "ok" : "no"} data-item={i.key}>
          <span className="mark" aria-hidden="true">
            <Icon name={i.ok ? "check" : "alert"} size={13} />
          </span>
          <div>
            <b>
              <span className="sr-only">{i.ok ? "Done: " : "To do: "}</span>
              {i.title}
            </b>
            {i.why && <span className="why">{i.why}</span>}
          </div>
        </li>
      ))}
    </ul>
  );
}
