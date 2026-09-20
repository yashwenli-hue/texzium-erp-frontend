"use client";

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { apiFetch, ApiError } from "../api/httpClient";
import { getStoredToken, setStoredToken, clearStoredToken } from "./tokenStorage";

/**
 * VERIFIED: JWT payload is { sub, email, role, permissions[] } (auth.service.ts).
 * There is no /auth/me endpoint — this is the only source of current-user
 * identity/permissions, decoded client-side from the token itself.
 */
export interface AuthUser {
  id: string;
  email: string;
  role: string;
  permissions: string[];
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  /** True once the initial localStorage/token check on mount has completed. */
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function userFromToken(token: string): AuthUser | null {
  const payload = decodeJwtPayload(token);
  if (!payload) return null;
  const exp = payload.exp;
  if (typeof exp === "number" && Date.now() >= exp * 1000) return null; // expired
  if (typeof payload.sub !== "string" || typeof payload.email !== "string") return null;
  return {
    id: payload.sub,
    email: payload.email,
    role: typeof payload.role === "string" ? payload.role : "",
    permissions: Array.isArray(payload.permissions) ? payload.permissions.filter((p): p is string => typeof p === "string") : [],
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getStoredToken();
    if (token) {
      const decoded = userFromToken(token);
      if (decoded) {
        setUser(decoded);
      } else {
        clearStoredToken();
      }
    }
    setReady(true);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiFetch<{ access_token: string }>("/auth/login", {
      method: "POST",
      body: { email, password },
      auth: false,
    });
    const decoded = userFromToken(res.access_token);
    if (!decoded) throw new ApiError("Signed in, but the session token could not be read.", 500);
    setStoredToken(res.access_token);
    setUser(decoded);
  }, []);

  const logout = useCallback(() => {
    clearStoredToken();
    setUser(null);
  }, []);

  const hasPermission = useCallback((permission: string) => !!user?.permissions.includes(permission), [user]);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, ready, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth() must be used within an AuthProvider");
  return ctx;
}
