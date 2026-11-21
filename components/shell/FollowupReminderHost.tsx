"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../lib/auth/AuthContext";
import { useRepository } from "../../lib/repository/RepositoryProvider";
import { useToast } from "../ui/Toast";
import { Icon } from "../ui/Icon";
import { FollowupCalendarEntry } from "../../lib/types/domain";
import {
  MINUTE, POLL_MS, SnoozeMap, dueLabel, dueReminders, leadTitle, pruneSnoozes, reminderWindow, snoozeKeyOf,
} from "../../lib/followupReminders";

/** Fired after a follow-up is changed from the popup, so open lists (the calendar) refresh. */
export const FOLLOWUPS_CHANGED_EVENT = "revenueos:followups-changed";

const MAX_CARDS = 3;
const ALERTS_PROMPT_KEY = "revenueos.followupAlertsPrompt";

function readJson<T>(storage: Storage | undefined, key: string, fallback: T): T {
  try {
    const raw = storage?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeJson(storage: Storage | undefined, key: string, value: unknown) {
  try {
    storage?.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable: snoozes just won't outlive this page
  }
}

function tomorrowMorning(now: number): number {
  const d = new Date(now);
  d.setDate(d.getDate() + 1);
  d.setHours(9, 30, 0, 0);
  return d.getTime();
}

const canNotify = () => typeof window !== "undefined" && "Notification" in window;

/**
 * The follow-up reminder: a card at the top right of every page when one of the
 * signed-in person's follow-ups is due in 10 minutes or overdue, and a desktop
 * notification when the browser tab is in the background (once the person allows it).
 * Snoozes are kept in this browser, per person; "Done" completes the follow-up.
 */
export function FollowupReminderHost() {
  const { user, hasPermission } = useAuth();
  const repo = useRepository();
  const router = useRouter();
  const toast = useToast();
  const enabled = !!user && hasPermission("leads.followups.view");
  const canComplete = hasPermission("leads.followups.create");

  const snoozeKey = user ? `revenueos.followupSnooze.${user.id}` : "";
  const notifiedKey = user ? `revenueos.followupNotified.${user.id}` : "";

  const [entries, setEntries] = useState<FollowupCalendarEntry[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [snoozed, setSnoozed] = useState<SnoozeMap>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  const [promptHidden, setPromptHidden] = useState(true);
  const notified = useRef<Set<string>>(new Set());

  // Load this person's snoozes and what was already notified (this browser session).
  useEffect(() => {
    if (!enabled) return;
    setSnoozed(pruneSnoozes(readJson<SnoozeMap>(window.localStorage, snoozeKey, {}), Date.now()));
    notified.current = new Set(readJson<string[]>(window.sessionStorage, notifiedKey, []));
    setPermission(canNotify() ? Notification.permission : "unsupported");
    setPromptHidden(readJson<boolean>(window.localStorage, ALERTS_PROMPT_KEY, false));
    // A snooze in another tab applies here too.
    const onStorage = (e: StorageEvent) => {
      if (e.key === snoozeKey) setSnoozed(readJson<SnoozeMap>(window.localStorage, snoozeKey, {}));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [enabled, snoozeKey, notifiedKey]);

  const load = useCallback(async () => {
    if (!enabled || !user) return;
    const t = Date.now();
    const w = reminderWindow(t);
    try {
      setEntries(await repo.leadFollowups.listMine(user.id, w.from, w.to));
    } catch {
      // A failed poll keeps the last list; the next one tries again.
    }
    setNow(t);
  }, [enabled, user, repo]);

  useEffect(() => {
    if (!enabled) return;
    void load();
    const poll = window.setInterval(load, POLL_MS);
    const tick = window.setInterval(() => setNow(Date.now()), 30_000);
    const onVisible = () => document.visibilityState === "visible" && void load();
    const onChanged = () => void load();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener(FOLLOWUPS_CHANGED_EVENT, onChanged);
    return () => {
      window.clearInterval(poll);
      window.clearInterval(tick);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener(FOLLOWUPS_CHANGED_EVENT, onChanged);
    };
  }, [enabled, load]);

  const due = useMemo(() => dueReminders(entries, now, snoozed), [entries, now, snoozed]);

  // A desktop notification for each newly due follow-up, once per browser session.
  useEffect(() => {
    if (!enabled || permission !== "granted") return;
    let changed = false;
    for (const e of due) {
      const key = snoozeKeyOf(e);
      if (notified.current.has(key)) continue;
      notified.current.add(key);
      changed = true;
      if (document.visibilityState === "visible") continue; // the card is on screen already
      try {
        const n = new Notification(`Follow-up ${dueLabel(e.followupDate, now)}`, {
          body: `${leadTitle(e.lead)}${e.remarks ? `\n${e.remarks}` : ""}`,
          tag: key,
        });
        n.onclick = () => {
          window.focus();
          router.push(`/leads/${e.lead.id}`);
          n.close();
        };
      } catch {
        // some browsers only allow notifications from a service worker; the card still shows
      }
    }
    if (changed) writeJson(window.sessionStorage, notifiedKey, [...notified.current]);
  }, [due, enabled, permission, now, notifiedKey, router]);

  function snooze(e: FollowupCalendarEntry, until: number) {
    const next = { ...pruneSnoozes(snoozed, Date.now()), [snoozeKeyOf(e)]: until };
    setSnoozed(next);
    writeJson(window.localStorage, snoozeKey, next);
    setMenuFor(null);
  }

  async function complete(e: FollowupCalendarEntry) {
    setBusy(e.id);
    try {
      await repo.leadFollowups.complete(e.id);
      setEntries((list) => list.filter((x) => x.id !== e.id));
      toast.success(`Follow-up with ${e.lead.customerName} marked done`);
      window.dispatchEvent(new Event(FOLLOWUPS_CHANGED_EVENT));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not complete the follow-up. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  async function turnOnAlerts() {
    if (!canNotify()) return;
    const result = await Notification.requestPermission();
    setPermission(result);
  }

  function hidePrompt() {
    setPromptHidden(true);
    writeJson(window.localStorage, ALERTS_PROMPT_KEY, true);
  }

  if (!enabled || due.length === 0) return null;
  const shown = due.slice(0, MAX_CARDS);
  const more = due.length - shown.length;

  return (
    <aside className="fu-remind" aria-label="Follow-up reminders" aria-live="polite">
      {shown.map((e) => {
        const overdue = new Date(e.followupDate).getTime() < now;
        return (
          <div key={e.id} className="fu-card" data-overdue={overdue || undefined}>
            <div className="fu-head">
              <span className="fu-ic"><Icon name="clock" size={15} /></span>
              <span className="fu-when">
                Follow-up {dueLabel(e.followupDate, now)}
                <span className="fu-time">
                  {" · "}
                  {new Date(e.followupDate).toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" })}
                </span>
              </span>
              <button className="fu-x" aria-label="Remind me in 1 hour" title="Remind me in 1 hour" onClick={() => snooze(e, Date.now() + 60 * MINUTE)}>
                <Icon name="close" size={14} />
              </button>
            </div>
            <div className="fu-who">{leadTitle(e.lead)}</div>
            {e.remarks && <div className="fu-note">{e.remarks}</div>}
            <div className="fu-phone">
              <a href={`tel:${e.lead.phone.replace(/\s+/g, "")}`}><Icon name="phone" size={13} /> {e.lead.phone}</a>
            </div>
            <div className="fu-actions">
              <button
                className="btn primary fu-btn"
                onClick={() => {
                  snooze(e, Date.now() + 10 * MINUTE);
                  router.push(`/leads/${e.lead.id}`);
                }}
              >
                Open lead
              </button>
              {canComplete && (
                <button className="btn ghost fu-btn" disabled={busy === e.id} onClick={() => complete(e)}>
                  <Icon name="check" size={14} /> {busy === e.id ? "Saving…" : "Done"}
                </button>
              )}
              <div className="fu-snooze">
                <button className="btn ghost fu-btn" aria-expanded={menuFor === e.id} onClick={() => setMenuFor(menuFor === e.id ? null : e.id)}>
                  Snooze <Icon name="down" size={12} />
                </button>
                {menuFor === e.id && (
                  <div className="fu-menu" role="menu">
                    <button role="menuitem" onClick={() => snooze(e, Date.now() + 10 * MINUTE)}>10 minutes</button>
                    <button role="menuitem" onClick={() => snooze(e, Date.now() + 60 * MINUTE)}>1 hour</button>
                    <button role="menuitem" onClick={() => snooze(e, tomorrowMorning(Date.now()))}>Tomorrow 9:30 am</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
      {more > 0 && (
        <Link className="fu-more" href="/followups">
          +{more} more due · open the follow-up calendar
        </Link>
      )}
      {permission === "default" && !promptHidden && (
        <div className="fu-alerts">
          <span>Get these reminders on your desktop even when RevenueOS is in the background.</span>
          <span className="fu-alerts-act">
            <button className="btn primary fu-btn" onClick={turnOnAlerts}>Turn on</button>
            <button className="btn ghost fu-btn" onClick={hidePrompt}>Not now</button>
          </span>
        </div>
      )}
    </aside>
  );
}
