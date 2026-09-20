"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TextField } from "../../components/ui/FormField";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../lib/auth/AuthContext";
import { ApiError } from "../../lib/api/httpClient";

/**
 * Minimal auth boundary for RevenueOS — the prototype had no real login
 * screen at all (docs/backend-ui-contract.md §21 item 8, Stage 2A brief §18).
 * Backend is JWT-based with no separate "me" endpoint, so this is the
 * smallest surface needed: POST /auth/login, store the token, decode
 * identity/permissions from it. See lib/auth/AuthContext.tsx.
 */
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const expired = searchParams?.get("expired") === "1";
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not sign in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--canvas)",
        padding: 16,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 380,
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius)",
          boxShadow: "var(--shadow)",
          padding: "32px 28px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 26 }}>
          <div className="logo">R</div>
          <div>
            <b style={{ fontFamily: "var(--display)", fontSize: 17, color: "var(--ink)", letterSpacing: "-.2px" }}>
              RevenueOS
            </b>
            <div style={{ fontSize: 11.5, color: "var(--muted)" }}>Texzium ERP</div>
          </div>
        </div>

        <h1 style={{ fontSize: 18, fontFamily: "var(--display)", marginBottom: 4 }}>Sign in</h1>
        <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 20 }}>
          Use your RevenueOS account to continue.
        </p>

        {expired && !error && (
          <p style={{ fontSize: 12.5, color: "var(--warn)", background: "var(--warn-bg)", padding: "8px 11px", borderRadius: 10, marginBottom: 14 }}>
            Your session expired. Please sign in again.
          </p>
        )}

        <form onSubmit={handleSubmit}>
          <TextField
            label="Email"
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@texzium.com"
          />
          <TextField
            label="Password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
          {error && (
            <p style={{ color: "var(--bad)", fontSize: 12.5, marginBottom: 10 }}>{error}</p>
          )}
          <Button variant="primary" type="submit" disabled={submitting} style={{ width: "100%", justifyContent: "center", marginTop: 4 }}>
            {submitting ? "Signing in…" : "Sign In"}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
