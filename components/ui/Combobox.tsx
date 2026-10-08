"use client";

import { ChangeEvent, KeyboardEvent, ReactNode, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";

// useLayoutEffect on the server only warns; the list is never open there.
const useBrowserLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;
import { createPortal } from "react-dom";
import { Icon } from "./Icon";
import { FieldWrap, controlProps } from "./FormField";
import { ComboOption, ListMove, exactLabelMatch, moveHighlight, resultsStatus, searchOptions } from "../../lib/ui/comboboxSearch";

/**
 * A searchable single choice: a text box that filters a list as you type, for lists too
 * long to scan (249 countries, 36 states). It is a real choice, not free text: only an
 * option can be picked, and text that matches no option is put back to the chosen one
 * when focus leaves.
 *
 * The WAI-ARIA editable combobox with a list popup: focus stays in the text box and the
 * highlighted row is announced through aria-activedescendant, so a screen reader
 * reads each option as the arrows pass over it, and says how many matches there are.
 *
 *   Down / Up       open the list, then move the highlight (the ends wrap)
 *   Enter           choose the highlighted option
 *   Escape          close the list and put the chosen label back (a dialog behind
 *                   keeps its own Escape: it closes only on the next press)
 *   Home / End      first / last option, while the list is open and nothing is being typed
 *   PageUp / Down   a page at a time
 *   Tab             leaves; text that exactly spells one option chooses it, other text is dropped
 *   typing          filters (see lib/ui/comboboxSearch.ts for what a word finds)
 *
 * The list is drawn at the end of the page, not inside the form: a dialog's body clips
 * what overflows it. It opens below the box, or above it when there is no room, and
 * follows it when the page scrolls or the keyboard of a phone takes space.
 */
export interface ComboboxProps {
  id: string;
  options: readonly ComboOption[];
  /** The chosen option's value, or "" for none. */
  value: string;
  onChange: (value: string) => void;
  /** Names the list for a screen reader ("Country"). */
  listLabel: string;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  required?: boolean;
  describedBy?: string;
  /** Said when the typed text matches nothing. */
  noMatchText?: string;
}

interface Placement {
  left: number;
  width: number;
  top?: number;
  bottom?: number;
  maxHeight: number;
}

const GAP = 4;
const EDGE = 8;
const MAX_LIST_HEIGHT = 300;
const MIN_LIST_HEIGHT = 120;

function placementFor(input: HTMLElement): Placement {
  const r = input.getBoundingClientRect();
  const vv = window.visualViewport;
  const viewTop = vv?.offsetTop ?? 0;
  const viewHeight = vv?.height ?? window.innerHeight;
  const below = viewTop + viewHeight - r.bottom - GAP - EDGE;
  const above = r.top - viewTop - GAP - EDGE;
  const up = below < 180 && above > below;
  const room = up ? above : below;
  return {
    left: r.left,
    width: r.width,
    maxHeight: Math.max(MIN_LIST_HEIGHT, Math.min(MAX_LIST_HEIGHT, room)),
    ...(up ? { bottom: window.innerHeight - r.top + GAP } : { top: r.bottom + GAP }),
  };
}

export function Combobox({ id, options, value, onChange, listLabel, placeholder, disabled, invalid, required, describedBy, noMatchText = "No matches" }: ComboboxProps) {
  const listId = `${id}-list`;
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  // Typing is what makes the box a search; otherwise it shows the chosen label.
  const [typing, setTyping] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [placement, setPlacement] = useState<Placement | null>(null);

  const selected = useMemo(() => options.find((o) => o.value === value), [options, value]);
  // A stored value that is not in the list is shown as it is, so it is never hidden.
  const shownLabel = selected?.label ?? value;
  const results = useMemo(() => (typing ? searchOptions(options, query) : [...options]), [options, typing, query]);
  const act = results.length === 0 ? -1 : Math.min(Math.max(active, 0), results.length - 1);
  const optionId = (i: number) => `${listId}-o${i}`;

  const close = useCallback((revert: boolean) => {
    setOpen(false);
    setPlacement(null);
    if (revert) {
      setTyping(false);
      setQuery("");
    }
  }, []);

  const openList = useCallback(() => {
    if (disabled) return;
    setOpen(true);
    if (!typing) {
      const at = options.findIndex((o) => o.value === value);
      setActive(at >= 0 ? at : 0);
    }
  }, [disabled, typing, options, value]);

  const choose = useCallback(
    (option: ComboOption) => {
      onChange(option.value);
      setOpen(false);
      setPlacement(null);
      setTyping(false);
      setQuery("");
    },
    [onChange]
  );

  // Where the list is drawn, kept current while it is open.
  useBrowserLayoutEffect(() => {
    if (!open || !inputRef.current) return;
    const input = inputRef.current;
    const update = () => setPlacement(placementFor(input));
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
    };
  }, [open]);

  // The highlighted row stays in view as the arrows move it.
  useEffect(() => {
    if (!open || act < 0) return;
    listRef.current?.querySelector<HTMLElement>(`#${CSS.escape(optionId(act))}`)?.scrollIntoView({ block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, act, placement]);

  function move(m: ListMove) {
    setActive(moveHighlight(act, results.length, m));
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.nativeEvent.isComposing) return;
    switch (e.key) {
      case "ArrowDown":
      case "ArrowUp": {
        e.preventDefault();
        if (!open) openList();
        else move(e.key === "ArrowDown" ? "down" : "up");
        return;
      }
      case "PageDown":
      case "PageUp": {
        if (!open) return;
        e.preventDefault();
        move(e.key === "PageDown" ? "pageDown" : "pageUp");
        return;
      }
      case "Home":
      case "End": {
        // While typing, these move the caret as in any text box.
        if (!open || typing) return;
        e.preventDefault();
        move(e.key === "Home" ? "first" : "last");
        return;
      }
      case "Enter": {
        if (open && act >= 0) {
          e.preventDefault();
          choose(results[act]);
        }
        return;
      }
      case "Escape": {
        if (!open) return;
        // Only the list closes; the dialog around it closes on the next Escape.
        e.preventDefault();
        e.stopPropagation();
        close(true);
        return;
      }
    }
  }

  function onInput(e: ChangeEvent<HTMLInputElement>) {
    setTyping(true);
    setQuery(e.target.value);
    setActive(0);
    if (!open) setOpen(true);
  }

  function onBlur() {
    if (typing) {
      // Text that spells exactly one option is a choice; anything else is dropped.
      const exact = exactLabelMatch(options, query);
      if (exact && exact.value !== value) onChange(exact.value);
    }
    close(true);
  }

  return (
    <div className="cbx">
      <input
        ref={inputRef}
        id={id}
        className="cbx-input"
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-haspopup="listbox"
        aria-autocomplete="list"
        aria-activedescendant={open && act >= 0 ? optionId(act) : undefined}
        aria-invalid={invalid ? true : undefined}
        aria-required={required ? true : undefined}
        aria-describedby={describedBy}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        enterKeyHint="done"
        placeholder={placeholder}
        disabled={disabled}
        value={typing ? query : shownLabel}
        onChange={onInput}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
        onClick={() => {
          if (!open) openList();
        }}
      />
      <span
        className="cbx-chev"
        aria-hidden="true"
        onMouseDown={(e) => {
          // Keep focus in the box; this only opens or closes the list.
          e.preventDefault();
          if (disabled) return;
          inputRef.current?.focus();
          if (open) close(true);
          else openList();
        }}
      >
        <Icon name="down" size={14} />
      </span>
      <span className="sr-only" role="status" aria-live="polite">
        {open ? resultsStatus(results.length, typing ? query : "") : ""}
      </span>
      {open && placement && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={listRef}
              id={listId}
              role="listbox"
              aria-label={listLabel}
              className="cbx-list"
              style={{ left: placement.left, width: placement.width, top: placement.top, bottom: placement.bottom, maxHeight: placement.maxHeight }}
              // Pressing in the list must not take focus from the box (that would close the list before the click lands).
              onMouseDown={(e) => e.preventDefault()}
            >
              {results.length === 0 ? (
                <div className="cbx-none" role="presentation">
                  {noMatchText}
                </div>
              ) : (
                results.map((o, i) => (
                  <div
                    key={o.value}
                    id={optionId(i)}
                    role="option"
                    aria-selected={o.value === value}
                    className={`cbx-opt${i === act ? " active" : ""}${o.value === value ? " chosen" : ""}`}
                    onMouseMove={() => {
                      if (i !== act) setActive(i);
                    }}
                    onClick={() => choose(o)}
                  >
                    <span className="cbx-label">{o.label}</span>
                    {o.hint && <span className="cbx-hint">{o.hint}</span>}
                    {o.value === value && (
                      <span className="cbx-tick" aria-hidden="true">
                        <Icon name="check" size={14} />
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

/** The Combobox with the same label, required mark, hint and error as TextField and SelectField. */
export function ComboboxField({
  label,
  required,
  error,
  hint,
  id: given,
  children,
  ...rest
}: Omit<ComboboxProps, "id" | "invalid" | "describedBy" | "listLabel"> & {
  label: string;
  error?: string;
  hint?: string;
  id?: string;
  listLabel?: string;
  children?: ReactNode;
}) {
  const generated = useId();
  const props = controlProps(generated, given, undefined, error, hint, required);
  return (
    <FieldWrap label={label} required={required} error={error} hint={hint} id={props.id}>
      <Combobox {...rest} id={props.id} listLabel={rest.listLabel ?? label} required={required} invalid={!!error} describedBy={props["aria-describedby"]} />
    </FieldWrap>
  );
}
