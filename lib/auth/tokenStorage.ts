/**
 * Sole owner of where the RevenueOS JWT lives (localStorage). Split out from
 * AuthContext so the plain (non-React) API client can read the current token
 * without importing React context code, and AuthContext can import the API
 * client without a circular dependency.
 */
const TOKEN_KEY = "revenueos.auth.token";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string): void {
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // localStorage unavailable (private mode etc.) — session just won't persist a reload.
  }
}

export function clearStoredToken(): void {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

/**
 * Decodes just the JWT's `sub` claim from the stored token, for the rare
 * non-React call site (a repository, not a component) that needs to scope a
 * request to the current user without importing AuthContext. Mirrors
 * AuthContext's own decode logic but stays deliberately minimal — no expiry
 * check, no full AuthUser shape; apiFetch()'s existing 401 handling is what
 * actually enforces session validity.
 */
export function getCurrentUserId(): string | null {
  const token = getStoredToken();
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}
