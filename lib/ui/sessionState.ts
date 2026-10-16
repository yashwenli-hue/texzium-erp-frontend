"use client";

import { Dispatch, SetStateAction, useEffect, useState } from "react";

/**
 * State that survives leaving a page and coming back in the same browser tab (open a
 * lead, press Back, and the list is as it was), kept in sessionStorage. It is a
 * convenience only: storage can be missing, full or blocked, and then the state simply
 * starts from `initial`.
 *
 * The stored value is read after the first render, so the server's markup and the
 * first client render are identical, and it is never trusted: `sanitize` turns what
 * was stored into a valid value or rejects it (null).
 */
export function useSessionState<T>(key: string, initial: T, sanitize: (raw: unknown) => T | null): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(initial);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    const stored = readSessionValue(key, sanitize);
    if (stored !== null) setValue(stored);
    setRestored(true);
    // Read once per key; `sanitize` is a module-level function.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    // Writing before the stored value was read would replace it with `initial`.
    if (restored) writeSessionValue(key, value);
  }, [key, value, restored]);

  return [value, setValue];
}

export function readSessionValue<T>(key: string, sanitize: (raw: unknown) => T | null): T | null {
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw === null ? null : sanitize(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeSessionValue(key: string, value: unknown): void {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable: the page just won't remember this view.
  }
}
