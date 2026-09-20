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
