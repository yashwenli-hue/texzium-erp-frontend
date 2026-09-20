import { getStoredToken, clearStoredToken } from "../auth/tokenStorage";

/**
 * Requests are sent to this frontend-internal path, which next.config.js
 * rewrites (server-side, no browser CORS involved) to the real backend.
 * The backend itself has no CORS headers configured and no confirmed global
 * prefix (docs/backend-ui-contract.md §2 / Stage 2A report §1) — proxying
 * through Next.js is a frontend-only way around that without touching the
 * backend. Every path below is exactly the verified backend route.
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "/api/backend";

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  /** false for the login call itself — every other request attaches the bearer token. */
  auth?: boolean;
}

function extractMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback;
  const message = (payload as { message?: unknown }).message;
  if (typeof message === "string") return message;
  if (Array.isArray(message)) return message.filter((m) => typeof m === "string").join(" ") || fallback;
  return fallback;
}

/**
 * Thin fetch wrapper: attaches the bearer token, parses JSON, and maps
 * non-2xx responses to a typed ApiError with a user-safe message (never the
 * raw backend error/stack). A 401 clears the stored token and hard-redirects
 * to /login — "do not pretend the request succeeded" applies just as much to
 * silently retrying as it does to faking success.
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true } = options;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) {
    const token = getStoredToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("Could not reach the RevenueOS backend. Check your connection and try again.", 0);
  }

  const text = await res.text();
  let payload: unknown;
  try {
    payload = text ? JSON.parse(text) : undefined;
  } catch {
    payload = undefined;
  }

  if (!res.ok) {
    if (res.status === 401) {
      clearStoredToken();
      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        window.location.href = "/login?expired=1";
      }
      throw new ApiError("Your session has expired. Please sign in again.", 401, payload);
    }
    if (res.status === 403) {
      throw new ApiError("You don't have permission to do that.", 403, payload);
    }
    if (res.status === 404) {
      throw new ApiError("That record could not be found.", 404, payload);
    }
    throw new ApiError(extractMessage(payload, `Request failed (${res.status}).`), res.status, payload);
  }

  return payload as T;
}
