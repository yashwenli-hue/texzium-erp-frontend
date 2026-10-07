"use client";

import Link from "next/link";
import { Icon } from "./Icon";
import { Button } from "./Button";
import { Disclosure } from "./Disclosure";
import type { AttentionAction, AttentionItem } from "../../lib/repository/shared/customerCockpit";

const TONE_ICON: Record<AttentionItem["tone"], string> = { bad: "alert", warn: "alert", action: "arrow", info: "clock", good: "check" };

function Line({ item, onAction }: { item: AttentionItem; onAction: (a: AttentionAction) => void }) {
  return (
    <li className={`nu-${item.tone}`}>
      <span className="nu-dot" aria-hidden="true" />
      <span className="nu-line">{item.title}</span>
      <Cta item={item} onAction={onAction} />
    </li>
  );
}

function Cta({ item, onAction, primary }: { item: AttentionItem; onAction: (a: AttentionAction) => void; primary?: boolean }) {
  const cta = item.cta;
  if (!cta) return null;
  const reasonId = `nu-why-${item.key}`;
  if (cta.action.type === "open") {
    return primary ? (
      <Link href={cta.action.href} className="btn primary">
        {cta.label}
        <Icon name="arrow" size={14} />
      </Link>
    ) : (
      <Link href={cta.action.href} className="nu-link">
        {cta.label}
      </Link>
    );
  }
  const run = () => onAction(cta.action);
  return primary ? (
    <>
      <Button variant="primary" onClick={run} disabled={!cta.enabled} aria-describedby={!cta.enabled && cta.reason ? reasonId : undefined}>
        {cta.label}
      </Button>
      {!cta.enabled && cta.reason && (
        <span id={reasonId} className="nu-why">
          {cta.reason}
        </span>
      )}
    </>
  ) : (
    <>
      <button type="button" className="nu-link" onClick={run} disabled={!cta.enabled} aria-describedby={!cta.enabled && cta.reason ? reasonId : undefined}>
        {cta.label}
      </button>
      {!cta.enabled && cta.reason && (
        <span id={reasonId} className="nu-why">
          {cta.reason}
        </span>
      )}
    </>
  );
}

/**
 * "Next up": the one thing this record needs first, with the button for it, and the
 * next two behind it. The first item is a headline (what is true, what to do); the
 * others are single lines. A record that needs nothing says so quietly. The items
 * come from `buildAttention`, so the same ordering is used everywhere. Priority
 * decides prominence, not visibility: nothing is dropped, what does not fit in the
 * two lines is one press away ("N more"). This only presents them and hands the chosen action back (`onAction`) to the page, which
 * owns the dialogs. A button that cannot be pressed says why in text, next to it.
 */
export function NextUp({ items, onAction, maxMore = 2 }: { items: AttentionItem[]; onAction: (a: AttentionAction) => void; maxMore?: number }) {
  const [head, ...rest] = items;
  if (!head) return null;
  const more = rest.slice(0, maxMore);
  const further = rest.slice(maxMore);
  return (
    <section className={`next-up nu-${head.tone}`} aria-labelledby="next-up-title" data-testid="next-up">
      <div className="nu-ic" aria-hidden="true">
        <Icon name={TONE_ICON[head.tone]} size={18} />
      </div>
      <div className="nu-main">
        <p className="nu-eyebrow">Next up</p>
        <h2 id="next-up-title">{head.title}</h2>
        {head.detail && <p className="nu-detail">{head.detail}</p>}
        {head.cta && (
          <div className="nu-cta">
            <Cta item={head} onAction={onAction} primary />
          </div>
        )}
      </div>
      {more.length > 0 && (
        <div className="nu-more">
          <p className="nu-eyebrow">Also</p>
          <ul>
            {more.map((i) => (
              <Line key={i.key} item={i} onAction={onAction} />
            ))}
          </ul>
          {further.length > 0 && (
            <Disclosure summary={`${further.length} more`} testId="nu-further">
              <ul>
                {further.map((i) => (
                  <Line key={i.key} item={i} onAction={onAction} />
                ))}
              </ul>
            </Disclosure>
          )}
        </div>
      )}
    </section>
  );
}
