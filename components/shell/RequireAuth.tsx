"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth/AuthContext";

/** Gates every real page behind a signed-in session — the backend requires
 * a JWT on every RevenueOS route we call, so there is no useful unauthenticated
 * app state to render. See docs/backend-ui-contract.md §1, Stage 2A brief §18. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, ready } = useAuth();

  useEffect(() => {
    if (ready && !isAuthenticated) router.replace("/login");
  }, [ready, isAuthenticated, router]);

  if (!ready || !isAuthenticated) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", fontSize: 13.5 }}>
        {ready ? "Redirecting to sign in…" : "Loading…"}
      </div>
    );
  }

  return <>{children}</>;
}
