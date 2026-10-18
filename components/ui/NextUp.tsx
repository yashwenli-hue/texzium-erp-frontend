"use client";

import Link from "next/link";
import { Icon } from "./Icon";
import { Button } from "./Button";
import { Disclosure } from "./Disclosure";

import type { NextUpItem, OpenAction } from "../../lib/ui/attention";
export type { NextUpItem, OpenAction };

const TONE_ICON: Record<NextUpItem["tone"], string> = { bad: "alert", warn: "alert", action: "arrow", info: "clock", good: "check" };

function isOpen(a: { type: string }): a is OpenAction {
  return a.type === "open";
}

function Line<A extends { type: string }>({ item, onAction }: { item: NextUpItem<A>; onAction: (a: A) => void }) {
  return (
    <li className={`nu-${item.tone}`}>
      <span className="nu-dot" aria-hidden="true" />
      <span className="nu-line">{item.title}</span>
      <Cta item={item} onAction={onAction} />
    </li>
  );
}

function Cta<A extends { type: string }>({ item, onAction, primary }: { item: NextUpItem<A>; onAction: (a: A) => void; primary?: boolean }) {
  const cta = item.cta;
  if (!cta) return null;
  const reasonId = `nu-why-${item.key}`;
  if (isOpen(cta.action)) {
    const href = cta.action.href;
    return primary ? (
      <Link href={href} className="btn primary">
        {cta.label}
        <Icon name="arrow" size={14} />
      </Link>
    ) : (
      <Link href={href} className="nu-link">
        {cta.label}
      </Link>
    );
  }
  const action = cta.action as A;
  const run = () => onAction(action);
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
export function NextUp<A extends { type: string }>({ items, onAction, maxMore = 2, eyebrow = "Next up" }: { items: NextUpItem<A>[]; onAction: (a: A) => void; maxMore?: number; eyebrow?: string }) {
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
        <p className="nu-eyebrow">{eyebrow}</p>
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
