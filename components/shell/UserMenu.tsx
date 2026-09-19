"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "../ui/Icon";
import { useToast } from "../ui/Toast";

interface MenuPos {
  left: number;
  bottom: number;
}

/**
 * Account/profile menu anchored to the bottom of the sidebar. No real auth
 * exists in this frontend, so every action is an explicit mock placeholder
 * (a toast) rather than a fake navigation or an invented API call — same
 * pattern already used for the unconnected "Meet" quick action.
 *
 * The popover uses position:fixed with a rect computed on open (like the
 * collapsed-rail tooltip) because it lives inside the rail's own scroll
 * container, which clips absolutely-positioned overflow.
 */
export function UserMenu({
  collapsed,
  onShowTooltip,
  onHideTooltip,
}: {
  collapsed: boolean;
  onShowTooltip?: (e: React.MouseEvent<HTMLElement>) => void;
  onHideTooltip?: () => void;
}) {
  const toast = useToast();
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
      setPos({
        left: collapsed ? rect.right + 10 : rect.left,
        bottom: window.innerHeight - rect.bottom,
      });
    }
    setOpen((o) => !o);
  }

  function action(label: string, icon: string) {
    setOpen(false);
    toast.show(`${label} isn't connected yet — this is a placeholder for now.`, icon);
  }

  return (
    <>
      <button
        ref={btnRef}
        className={`rail-user ${open ? "open" : ""}`}
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        onMouseEnter={onShowTooltip}
        onMouseLeave={onHideTooltip}
      >
        <span className="av">RK</span>
        <span className="ru-text">
          <b>Account</b>
          <small>RevenueOS User</small>
        </span>
        <Icon name="chevronRight" size={14} className="ru-chev" />
      </button>
      {open && pos && (
        <div className="user-menu" ref={menuRef} role="menu" style={{ left: pos.left, bottom: pos.bottom }}>
          <button className="user-menu-item" role="menuitem" onClick={() => action("View Profile", "user")}>
            <Icon name="user" size={15} /> View Profile
          </button>
          <button className="user-menu-item" role="menuitem" onClick={() => action("Account & Settings", "edit")}>
            <Icon name="edit" size={15} /> Account &amp; Settings
          </button>
          <div className="user-menu-divider" />
          <button className="user-menu-item danger" role="menuitem" onClick={() => action("Sign out", "close")}>
            <Icon name="close" size={15} /> Sign Out
          </button>
        </div>
      )}
    </>
  );
}
