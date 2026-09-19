"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "../ui/Icon";
import { useToast } from "../ui/Toast";

interface MenuPos {
  right: number;
  top: number;
}

/**
 * Topbar account/profile menu — the one global account affordance in the
 * app (design review Stage 1.3 §1 removed the duplicate sidebar block).
 * No real auth exists in this frontend, so every action is an explicit
 * mock placeholder (a toast) rather than a fake navigation or an invented
 * API call — same pattern already used for the unconnected "Meet" quick
 * action. The popover uses position:fixed with a rect computed on open so
 * it never gets clipped by an ancestor's overflow.
 */
export function UserMenu() {
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
      setPos({ right: window.innerWidth - rect.right, top: rect.bottom + 8 });
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
        className="avatar"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
      >
        RK
      </button>
      {open && pos && (
        <div className="user-menu" ref={menuRef} role="menu" style={{ right: pos.right, top: pos.top }}>
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
