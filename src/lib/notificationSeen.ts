const EVENT = "closeflow:notifications-seen";

type Keyed = { id: string; level: string };

const storageKey = (userId: string) => `closeflow_notifications_seen_${userId}`;
// Level is part of the key, so an escalation (warning to critical) counts as new again.
const itemKey = (item: Keyed) => `${item.id}:${item.level}`;

function readSeen(userId: string): Set<string> {
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : []);
  } catch {
    return new Set();
  }
}

export function countUnseenNotifications(userId: string, items: Keyed[]) {
  const seen = readSeen(userId);
  return items.filter((item) => !seen.has(itemKey(item))).length;
}

/* Stores exactly the current items, so resolved items can notify again later. */
export function markNotificationsSeen(userId: string, items: Keyed[]) {
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(items.map(itemKey)));
  } catch {
    return;
  }
  window.dispatchEvent(new Event(EVENT));
}

export function onNotificationsSeen(handler: () => void) {
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
