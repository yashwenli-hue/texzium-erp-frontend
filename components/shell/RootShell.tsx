"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AppShell } from "./AppShell";
import { RequireAuth } from "./RequireAuth";

/** The login route renders standalone (no sidebar/topbar chrome); every other route is gated behind RequireAuth + the app shell. */
export function RootShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/login") return <>{children}</>;

  return (
    <RequireAuth>
      <AppShell>{children}</AppShell>
    </RequireAuth>
  );
}
