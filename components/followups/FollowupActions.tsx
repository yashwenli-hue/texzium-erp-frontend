"use client";

import { useRef, useState } from "react";
import { Button } from "../ui/Button";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { useToast } from "../ui/Toast";
import { FollowupForm } from "../forms/FollowupForm";
import { LeadFollowup } from "../../lib/types/domain";
import { formatDateTime } from "../../lib/format";

/**
 * Complete, reschedule or cancel one pending follow-up — the three backend operations, each
 * on its own route and permission (leads.followups.create). Completing is one press; rescheduling
 * asks for the new time; cancelling asks first, because a cancelled follow-up cannot be reopened.
 * A second press while one is running is ignored. Used on the lead's page and the Follow-ups list,
 * so both behave the same.
 */
export function FollowupActions({
  followup,
  leadName,
  onComplete,
  onReschedule,
  onCancel,
  compact,
}: {
  followup: LeadFollowup;
  /** Names the follow-up in button labels, where several are listed together. */
  leadName?: string;
  onComplete: (id: string) => Promise<void>;
  onReschedule: (id: string, followupDate: string) => Promise<void>;
  onCancel: (id: string) => Promise<void>;
  compact?: boolean;
}) {
  const toast = useToast();
  const [dialog, setDialog] = useState<"reschedule" | "cancel" | null>(null);
  const [completing, setCompleting] = useState(false);
  const running = useRef(false);
  const of = leadName ? ` the follow-up with ${leadName}` : "";

  async function complete() {
    if (running.current) return;
    running.current = true;
    setCompleting(true);
    try {
      await onComplete(followup.id);
      toast.success("Follow-up completed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't complete this follow-up. Please try again.");
    } finally {
      running.current = false;
      setCompleting(false);
    }
  }

  return (
    <div className={`fu-actions${compact ? " compact" : ""}`}>
      <Button className="sm" icon="check" onClick={complete} disabled={completing} aria-label={`Complete${of}`}>
        {completing ? "Completing…" : "Complete"}
      </Button>
      <Button className="sm" icon="clock" onClick={() => setDialog("reschedule")} disabled={completing} aria-label={`Reschedule${of}`}>
        Reschedule
      </Button>
      <Button className="sm danger-ghost" icon="close" onClick={() => setDialog("cancel")} disabled={completing} aria-label={`Cancel${of}`}>
        Cancel
      </Button>

      {dialog === "reschedule" && (
        <FollowupForm
          mode="reschedule"
          initialDate={followup.followupDate}
          onClose={() => setDialog(null)}
          onSubmit={(date) => onReschedule(followup.id, date)}
        />
      )}
      {dialog === "cancel" && (
        <ConfirmDialog
          title="Cancel this follow-up?"
          body={`The follow-up${leadName ? ` with ${leadName}` : ""} due ${formatDateTime(followup.followupDate)} will be marked cancelled. A cancelled follow-up cannot be reopened; schedule a new one if it is needed later.`}
          confirmLabel="Cancel follow-up"
          dismissLabel="Keep it"
          destructive
          onClose={() => setDialog(null)}
          onConfirm={async () => {
            await onCancel(followup.id);
            toast.success("Follow-up cancelled");
          }}
        />
      )}
    </div>
  );
}
