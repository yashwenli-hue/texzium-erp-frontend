"use client";

import { useEffect, useState } from "react";

export interface Section {
  id: string;
  label: string;
}

/**
 * A strip of links to the sections of a long page, for narrow screens where the
 * sections stack (it is hidden when the page has two columns). It stays under the
 * top bar while you scroll and marks the section you are in (aria-current), found
 * from the scroll position; without script it is still a list of working
 * in-page links. Each section element needs the matching `id` and a
 * `scroll-margin-top` so it does not slide under the bar.
 */
export function SectionNav({ sections, label = "On this page" }: { sections: Section[]; label?: string }) {
  const [current, setCurrent] = useState(sections[0]?.id);

  useEffect(() => {
    const targets = () => sections.map((s) => document.getElementById(s.id)).filter((e): e is HTMLElement => !!e);
    let frame = 0;
    const update = () => {
      frame = 0;
      const list = targets();
      if (!list.length) return;
      // The section you are in is the last one whose top has passed the line under the sticky bars (the last one, at the very bottom of the page).
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      let now = list[0].id;
      for (const el of list) if (el.getBoundingClientRect().top <= 150) now = el.id;
      setCurrent(atBottom ? list[list.length - 1].id : now);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [sections]);

  return (
    <nav className="section-nav" aria-label={label} data-testid="section-nav">
      <ul>
        {sections.map((s) => (
          <li key={s.id}>
            <a href={`#${s.id}`} aria-current={current === s.id ? "location" : undefined} onClick={() => setCurrent(s.id)}>
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
