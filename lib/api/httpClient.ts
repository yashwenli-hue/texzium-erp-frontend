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

  if (!res.ok) throw failure(res.status, payload, auth);

  return payload as T;
}

// The ApiError for a non-2xx response (a 401 also signs the user out). A 401 on a request made
// without a session (signing in) is a refused sign-in, not an expired session: it says so and
// signs nobody out.
export function failure(status: number, payload: unknown, authenticated = true): ApiError {
  if (status === 401 && !authenticated) {
    return new ApiError("The email or password is incorrect, or this account can't sign in.", 401, payload);
  }
  if (status === 401) {
    clearStoredToken();
    if (typeof window !== "undefined" && window.location.pathname !== "/login") {
      window.location.href = "/login?expired=1";
    }
    return new ApiError("Your session has expired. Please sign in again.", 401, payload);
  }
  if (status === 403) return new ApiError("You don't have permission to do that.", 403, payload);
  if (status === 404) return new ApiError("That record could not be found.", 404, payload);
  return new ApiError(extractMessage(payload, `Request failed (${status}).`), status, payload);
}

export interface DownloadedFile {
  blob: Blob;
  fileName: string;
}

/**
 * A file the backend streams (e.g. a PDF): fetched with the bearer token, since a plain
 * link cannot carry it. Only the expected content type is accepted; an error response
 * (JSON) becomes the same ApiError as apiFetch. Never deduplicated or cached.
 */
export async function apiDownload(path: string, expectedType: string, fallbackName: string): Promise<DownloadedFile> {
  const headers: Record<string, string> = {};
  const token = getStoredToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, { method: "GET", headers });
  } catch {
    throw new ApiError("Could not reach the RevenueOS backend. Check your connection and try again.", 0);
  }

  if (!res.ok) {
    const text = await res.text();
    let payload: unknown;
    try {
      payload = text ? JSON.parse(text) : undefined;
    } catch {
      payload = undefined;
    }
    throw failure(res.status, payload);
  }

  const type = (res.headers.get("content-type") ?? "").split(";")[0].trim();
  if (type !== expectedType) throw new ApiError("The file could not be downloaded. Please try again.", res.status);

  const match = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "");
  const fileName = match && /^[A-Za-z0-9._-]+$/.test(match[1]) ? match[1] : fallbackName;
  return { blob: await res.blob(), fileName };
}

/**
 * Sends one piece of a file (PUT, application/octet-stream) with upload progress, which
 * fetch() cannot report. Same bearer token and the same ApiError mapping as apiFetch (a
 * 401 signs the user out); a dropped connection is an ApiError with status 0.
 */
export function apiPutBinary<T>(path: string, body: Blob, onProgress?: (fraction: number) => void): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", `${API_BASE_URL}${path}`);
    xhr.setRequestHeader("Content-Type", "application/octet-stream");
    const token = getStoredToken();
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.upload.onprogress = (e) => {
      if (onProgress && e.lengthComputable && e.total > 0) onProgress(e.loaded / e.total);
    };
    xhr.onerror = () => reject(new ApiError("The connection to RevenueOS was interrupted.", 0));
    xhr.ontimeout = () => reject(new ApiError("The connection to RevenueOS timed out.", 0));
    xhr.onabort = () => reject(new ApiError("The upload was cancelled.", 0));
    xhr.onload = () => {
      let payload: unknown;
      try {
        payload = xhr.responseText ? JSON.parse(xhr.responseText) : undefined;
      } catch {
        payload = undefined;
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(payload as T);
      else reject(failure(xhr.status, payload));
    };
    xhr.send(body);
  });
}

/** A backend path as the browser reaches it (through the frontend proxy), e.g. for a signed file URL. */
export function backendUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

/** Hands a downloaded file to the browser as a download. */
export function saveDownloadedFile(file: DownloadedFile): void {
  const url = URL.createObjectURL(file.blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
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
 * Keyed by the full request path string — verified safe: no GET call
 * anywhere in this app uses a request body or a non-default `auth` flag (the
 * one `auth: false` call, /auth/login, is a POST and never reaches this
 * branch). IDs and any query string are embedded directly in the path (e.g.
 * `/leads/${id}`, `/leads?includeInactive=true`), so the path string already
 * is the full request identity for every current call site, and two query
 * variants of the same route never share a request.
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
