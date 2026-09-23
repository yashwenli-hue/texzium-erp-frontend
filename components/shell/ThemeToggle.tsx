"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "../ui/Icon";
import { useTheme, ThemeName } from "../../lib/theme/ThemeContext";

interface MenuPos {
  right: number;
  top: number;
}

/**
 * Theme selector for Version A. Light is the default; "Graphite &
 * Emerald" (docs/revenueos-version-a-dark-mode-v4.md) is the single
 * accepted dark theme. Reuses UserMenu's exact popover pattern/CSS
 * classes (.user-menu/.user-menu-item, position:fixed rect-based
 * placement) rather than introducing a new one.
 *
 * Only options for themes that actually exist are offered — three
 * earlier dark candidates (Navy Purple, Navy + Semantic, an elevated
 * navy iteration) were removed from this list once this one was
 * accepted; see git history.
 */
const OPTIONS: { value: ThemeName; label: string; icon: string }[] = [
  { value: "light", label: "Light", icon: "sun" },
  { value: "dark-v4", label: "Dark — Variant 4 (Graphite & Emerald)", icon: "moon" },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<MenuPos | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || btnRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle() {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ right: window.innerWidth - rect.right, top: rect.bottom + 8 });
    }
    setOpen((o) => !o);
  }

  const current = OPTIONS.find((o) => o.value === theme) ?? OPTIONS[0];

  return (
    <>
      <button
        ref={btnRef}
        className="icon-btn"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Theme"
        title={`Theme: ${current.label}`}
      >
        <Icon name={current.icon} size={17} />
      </button>
      {open && pos && (
        <div className="user-menu" ref={menuRef} role="menu" style={{ right: pos.right, top: pos.top }}>
          <div style={{ padding: "8px 14px 6px", fontSize: 11, fontWeight: 700, color: "var(--faint)", textTransform: "uppercase", letterSpacing: ".4px" }}>
            Theme (experimental)
          </div>
          {OPTIONS.map((o) => (
            <button
              key={o.value}
              className="user-menu-item"
              role="menuitemradio"
              aria-checked={theme === o.value}
              onClick={() => {
                setTheme(o.value);
                setOpen(false);
              }}
            >
              <Icon name={o.icon} size={15} />
              {o.label}
              {theme === o.value && (
                <span style={{ marginLeft: "auto", color: "var(--m)", display: "flex" }}>
                  <Icon name="check" size={14} />
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
