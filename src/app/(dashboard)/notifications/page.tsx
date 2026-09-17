"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabase/client";
import {
  useNotifications,
  type NotificationItem,
} from "@/hooks/useNotifications";

type LevelFilter = "all" | "critical" | "warning" | "info";

const DEFAULT_TIMEZONE = "Europe/Berlin";

const levelConfig: Record<
  string,
  {
    label: string;
    color: string;
    badge: string;
  }
> = {
  critical: {
    label: "Critical",
    color: "border-rose-500/30 bg-rose-500/10",
    badge: "text-rose-300",
  },
  warning: {
    label: "Warning",
    color: "border-amber-500/30 bg-amber-500/10",
    badge: "text-amber-300",
  },
  info: {
    label: "Info",
    color: "border-cyan-500/20 bg-cyan-500/10",
    badge: "text-cyan-300",
  },
};

function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format();
    return true;
  } catch {
    return false;
  }
}

const relativeTime = (iso: string, timeZone: string) => {
  const now = new Date();
  const created = new Date(iso);

  const diff = now.getTime() - created.getTime();

  if (diff < 60000) {
    return "just now";
  }

  const minutes = Math.floor(diff / 60000);

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const formatDateKey = (date: Date) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date).reduce<Record<string, string>>((acc, part) => {
    if (
      part.type === "year" ||
      part.type === "month" ||
      part.type === "day"
    ) {
      acc[part.type] = part.value;
    }
    return acc;
  }, {});

  const nowParts = formatDateKey(now);
  const createdParts = formatDateKey(created);

  const nowKey = `${nowParts.year}-${nowParts.month}-${nowParts.day}`;
  const createdKey = `${createdParts.year}-${createdParts.month}-${createdParts.day}`;

  if (createdKey === nowKey) {
    return `${hours}h ago`;
  }

  const yesterdayKey = (() => {
  const [year, month, day] = nowKey
    .split("-")
    .map(Number);

  const yesterday = new Date(
    Date.UTC(year, month - 1, day),
  );

  yesterday.setUTCDate(
    yesterday.getUTCDate() - 1,
  );

  return yesterday.toISOString().slice(0, 10);
})();

if (createdKey === yesterdayKey) {
  return "yesterday";
}

  const days = Math.max(2, Math.floor(hours / 24));
  return `${days}d ago`;
};

function NotificationCard({
  item,
  timeZone,
}: {
  item: NotificationItem;
  timeZone: string;
}) {
  const cfg = levelConfig[item.level] || levelConfig.info;
  const levelLabel = cfg.label;

  return (
    <div className={`rounded-2xl border p-5 ${cfg.color}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <span
            className={`text-xs font-semibold uppercase tracking-[0.2em] ${cfg.badge}`}
          >
            {levelLabel}
          </span>
          <p className="mt-1 font-semibold text-foreground leading-snug">
            {item.title}
          </p>
          <p className="mt-1 text-sm text-foreground/65">{item.message}</p>
        </div>

        <div className="shrink-0 flex flex-col items-end gap-2">
          <span className="text-xs text-foreground/45">
            {relativeTime(item.createdAt, timeZone)}
          </span>

          {item.leadId ? (
            <Link
              href={`/leads/${item.leadId}`}
              className="rounded-xl border border-border-subtle bg-surface-2/70 px-3 py-1.5 text-xs text-foreground/75 transition hover:bg-foreground/5 hover:text-foreground"
            >
              Open lead →
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const [timeZone, setTimeZone] = useState(DEFAULT_TIMEZONE);

  const { notifications, loading, refresh } = useNotifications();
  const [filter, setFilter] = useState<LevelFilter>("all");

  useEffect(() => {
    let cancelled = false;

    const loadTimezone = async () => {
      const { data } = await supabase.auth.getUser();

      const storedTimezone =
        typeof data.user?.user_metadata?.timezone === "string"
          ? data.user.user_metadata.timezone
          : "";

      const nextTimezone = isValidTimeZone(storedTimezone)
        ? storedTimezone
        : DEFAULT_TIMEZONE;

      if (!cancelled) {
        setTimeZone(nextTimezone);
      }
    };

    void loadTimezone();

    return () => {
      cancelled = true;
    };
  }, []);

  const visible =
    filter === "all"
      ? notifications
      : notifications.filter((n) => n.level === filter);

  const criticalCount = notifications.filter(
    (n) => n.level === "critical"
  ).length;

  const warningCount = notifications.filter(
    (n) => n.level === "warning"
  ).length;

  return (
    <AuthGuard>
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-cyan-400">
              Inbox
            </p>
            <h1 className="mt-2 text-3xl font-bold text-foreground">
              Notifications
            </h1>
            <p className="mt-1 text-sm text-foreground/65">
              {notifications.length} active
              {criticalCount > 0 ? `, ${criticalCount} critical` : ""}
              {warningCount > 0 ? `, ${warningCount} warnings` : ""}
            </p>
          </div>

          <button
            onClick={() => void refresh()}
            disabled={loading}
            className="rounded-2xl border border-border-subtle bg-surface-1 px-4 py-2 text-sm text-foreground/75 transition hover:bg-foreground/5 hover:text-foreground disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="flex gap-2">
          {(["all", "critical", "warning", "info"] as LevelFilter[]).map(
            (f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition capitalize ${
                  filter === f
                    ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-200"
                    : "border-border-subtle bg-surface-1 text-foreground/60 hover:text-foreground"
                }`}
              >
                {f}
              </button>
            )
          )}
        </div>

        {loading ? (
          <p className="text-sm text-foreground/60">
            Loading notifications...
          </p>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border border-border-subtle bg-surface-1 p-8 text-center text-sm text-foreground/55">
            {filter === "all"
              ? "No active notifications. All leads are up to date."
              : `No ${filter} notifications.`}
          </div>
        ) : (
          <div className="space-y-3">
            {visible.map((item) => (
              <NotificationCard
                key={item.id}
                item={item}
                timeZone={timeZone}
              />
            ))}
          </div>
        )}
      </div>
    </AuthGuard>
  );
}