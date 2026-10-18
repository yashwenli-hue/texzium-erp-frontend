"use client";

import { Panel } from "./Card";
import { Button, EmptyState } from "./Button";

/** True when the backend refused the request for lack of permission (403), as opposed to a failure worth retrying. */
export function isForbidden(error: unknown): boolean {
  return (error as { status?: number } | null)?.status === 403;
}

/**
 * The page-level state when a record could not be loaded. One state, never both:
 * - refused (403): "No access", the permission it needs, and no Retry (retrying cannot help);
 * - anything else (network, server): "Couldn't load this …", the message, and Retry.
 * Presentation only: the backend decides access on every request.
 */
export function LoadFailure({ error, noun, permission, onRetry }: { error: Error; noun: string; permission: string; onRetry: () => void }) {
  const forbidden = isForbidden(error);
  return (
    <Panel title={forbidden ? "No access" : `Couldn't load this ${noun}`}>
      <EmptyState
        icon={forbidden ? "lock" : "alert"}
        title={forbidden ? `You don't have access to this ${noun}` : "Something went wrong"}
        body={forbidden ? `Viewing it needs the ${permission} permission. Ask an administrator, then sign in again.` : error.message || "Something went wrong reaching the RevenueOS backend. Please try again."}
        action={
          forbidden ? undefined : (
            <Button variant="ghost" onClick={onRetry}>
              Retry
            </Button>
          )
        }
      />
    </Panel>
  );
}
