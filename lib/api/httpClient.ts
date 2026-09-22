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

async function performRequest<T>(path: string, options: RequestOptions): Promise<T> {
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

/**
 * In-flight GET deduplication only — NOT a cache. The repository layer
 * resolves denormalized fields by calling its own dependencies' list()
 * (e.g. salesInvoices → salesOrders → quotations → opportunities), so a
 * single operation (a page load, useLiveCounts' badge refresh, a Search
 * call) can fire the same GET several times over within one tick. This map
 * shares ONE in-flight promise across those genuinely-concurrent callers;
 * the entry is removed the instant the request settles (success OR
 * failure), so the very next call — even a millisecond later — always
 * fetches fresh. No TTL, no persistence, nothing time-based.
 *
 * GET only: every mutation (POST/PATCH/PUT/DELETE) always fires immediately
 * and is never deduplicated or shared.
 *
 * Keyed by path alone — verified safe: no GET call anywhere in this app
 * uses a query string, a request body, or a non-default `auth` flag (the
 * one `auth: false` call, /auth/login, is a POST and never reaches this
 * branch). IDs are embedded directly in the path (e.g. `/leads/${id}`), so
 * the path already is the full request identity for every current call
 * site. If a future GET ever needs query parameters, include them in the
 * dedup key too — path-alone would then be wrong.
 */
const inFlightGets = new Map<string, Promise<unknown>>();

/**
 * Thin fetch wrapper: attaches the bearer token, parses JSON, and maps
 * non-2xx responses to a typed ApiError with a user-safe message (never the
 * raw backend error/stack). A 401 clears the stored token and hard-redirects
 * to /login — "do not pretend the request succeeded" applies just as much to
 * silently retrying as it does to faking success.
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET" } = options;

  if (method === "GET") {
    const existing = inFlightGets.get(path);
    if (existing) return existing as Promise<T>;

    const request = performRequest<T>(path, options);
    inFlightGets.set(path, request);
    // .finally() returns its own promise, which rejects too if `request`
    // does — swallow that derived promise's rejection so this cleanup
    // never produces a spurious unhandled-rejection warning. `request`
    // itself is untouched and still rejects normally for whoever awaits it.
    request.finally(() => inFlightGets.delete(path)).catch(() => {});
    return request;
  }

  return performRequest<T>(path, options);
}
