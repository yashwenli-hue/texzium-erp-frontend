"use client";

import { MouseEvent, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "./Icon";

/**
 * "Back to Leads": goes back in the browser's history when there is somewhere to go
 * back to (so the list keeps its place), and otherwise to `fallback`. It is a real link
 * to `fallback`, so it can be reached and opened from the keyboard, read out as a link,
 * and opened in a new tab; only a plain click is turned into "back".
 */
export function BackLink({ fallback, children }: { fallback: string; children: ReactNode }) {
  const router = useRouter();

  function onClick(e: MouseEvent<HTMLAnchorElement>) {
    // A modified click (new tab, new window) keeps the link's own behaviour.
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    if (window.history.length > 1) router.back();
    else router.push(fallback);
  }

  return (
    <a className="back-link" href={fallback} onClick={onClick}>
      <Icon name="back" size={14} /> {children}
    </a>
  );
}
