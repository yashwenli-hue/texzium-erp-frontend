export const NOTIFICATION_GROUPS = ["Today", "Yesterday", "Earlier this week", "Earlier"] as const;

/** Calendar days, not 24-hour windows: something from 11 pm yesterday is "Yesterday" at 9 am. */
export function notificationGroup(iso: string, now: Date = new Date()): (typeof NOTIFICATION_GROUPS)[number] {
  const startOfToday = new Date(now).setHours(0, 0, 0, 0);
  const DAY = 86_400_000;
  const at = new Date(iso).getTime();
  if (at >= startOfToday) return "Today";
  if (at >= startOfToday - DAY) return "Yesterday";
  if (at >= startOfToday - 6 * DAY) return "Earlier this week";
  return "Earlier";
}
