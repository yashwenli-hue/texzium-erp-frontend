/**
 * A minimal stand-in for React's hooks, enough to run a data hook (useState, useEffect, useRef,
 * useCallback, useMemo) outside a browser: tests install it in place of "react" with node:test's
 * module mocking, then call the hook, let its effects and promises settle, and read its result.
 * It is not a renderer: it exists so a hook's own logic is tested as written.
 */
type Deps = readonly unknown[] | undefined;
type Slot = { value?: unknown; deps?: Deps; cleanup?: void | (() => void) };

const changed = (a: Deps, b: Deps) => !a || !b || a.length !== b.length || a.some((x, i) => !Object.is(x, b[i]));

export function createHookRunner() {
  let slots: Slot[] = [];
  let i = 0;
  let pendingEffects: Array<() => void> = [];
  let scheduled = false;
  let render: () => void = () => {};

  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      render();
    });
  };

  const slot = () => (slots[i] ??= {}, slots[i++]);

  const react = {
    useState<T>(init: T | (() => T)) {
      const s = slot();
      if (!("value" in s)) s.value = typeof init === "function" ? (init as () => T)() : init;
      const set = (v: T | ((p: T) => T)) => {
        const next = typeof v === "function" ? (v as (p: T) => T)(s.value as T) : v;
        if (!Object.is(next, s.value)) {
          s.value = next;
          schedule();
        }
      };
      return [s.value as T, set] as const;
    },
    useRef<T>(init: T) {
      const s = slot();
      if (!("value" in s)) s.value = { current: init };
      return s.value as { current: T };
    },
    useMemo<T>(fn: () => T, deps: Deps) {
      const s = slot();
      if (!("value" in s) || changed(s.deps, deps)) {
        s.value = fn();
        s.deps = deps;
      }
      return s.value as T;
    },
    useCallback<T>(fn: T, deps: Deps) {
      return react.useMemo(() => fn, deps);
    },
    useEffect(fn: () => void | (() => void), deps: Deps) {
      const s = slot();
      if (!("deps" in s) || changed(s.deps, deps)) {
        s.deps = deps;
        pendingEffects.push(() => {
          if (typeof s.cleanup === "function") s.cleanup();
          s.cleanup = fn();
        });
      }
    },
  };

  function renderHook<T>(hook: () => T) {
    const result: { current: T } = { current: undefined as T };
    render = () => {
      i = 0;
      result.current = hook();
      const effects = pendingEffects;
      pendingEffects = [];
      effects.forEach((e) => e());
    };
    render();
    return result;
  }

  /** Lets effects, state updates and resolved promises run until nothing is left to do. */
  async function settle() {
    for (let k = 0; k < 20; k++) await new Promise((r) => setTimeout(r, 0));
  }

  return { react, renderHook, settle, reset: () => (slots = []) };
}
