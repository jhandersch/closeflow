"use client";
import Link from "next/link";
import { useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { useAppPreferences } from "@/components/AppPreferencesProvider";
import { useNotifications, type NotificationItem } from "@/hooks/useNotifications";
type LevelFilter = "all" | "critical" | "warning" | "info";
const levelConfig: Record<string, {
    label: string;
    color: string;
    badge: string;
}> = {
    critical: { label: "Critical", color: "border-rose-500/30 bg-rose-500/10", badge: "text-rose-300" },
    warning: { label: "Warning", color: "border-amber-500/30 bg-amber-500/10", badge: "text-amber-300" },
    info: { label: "Info", color: "border-cyan-500/20 bg-cyan-500/10", badge: "text-cyan-300" },
};
const relativeTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)
        return "just now";
    if (m < 60)
        return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24)
        return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
};
function NotificationCard({ item }: {
    item: NotificationItem;
}) {
    const cfg = levelConfig[item.level] || levelConfig.info;
    const levelLabel = cfg.label;
    return (<div className={`rounded-2xl border p-5 ${cfg.color}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <span className={`text-xs font-semibold uppercase tracking-[0.2em] ${cfg.badge}`}>{levelLabel}</span>
          <p className="mt-1 font-semibold text-foreground leading-snug">{item.title}</p>
          <p className="mt-1 text-sm text-foreground/65">{item.message}</p>
        </div>
        <div className="shrink-0 flex flex-col items-end gap-2">
          <span className="text-xs text-foreground/45">{relativeTime(item.createdAt)}</span>
          {item.leadId ? (<Link href={`/leads/${item.leadId}`} className="rounded-xl border border-border-subtle bg-surface-2/70 px-3 py-1.5 text-xs text-foreground/75 transition hover:bg-foreground/5 hover:text-foreground">
              {"Open lead →"}
            </Link>) : null}
        </div>
      </div>
    </div>);
}
export default function NotificationsPage() {
    const { language } = useAppPreferences();
    const { notifications, loading, refresh } = useNotifications();
    const [filter, setFilter] = useState<LevelFilter>("all");
    const visible = filter === "all" ? notifications : notifications.filter((n) => n.level === filter);
    const criticalCount = notifications.filter((n) => n.level === "critical").length;
    const warningCount = notifications.filter((n) => n.level === "warning").length;
    return (<AuthGuard>
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-cyan-400">{"Inbox"}</p>
            <h1 className="mt-2 text-3xl font-bold text-foreground">{"Notifications"}</h1>
            <p className="mt-1 text-sm text-foreground/65">
              {notifications.length} {"active"}{criticalCount > 0 ? `, ${criticalCount} ${"critical"}` : ""}
              {warningCount > 0 ? `, ${warningCount} ${"warnings"}` : ""}
            </p>
          </div>
          <button onClick={() => void refresh()} disabled={loading} className="rounded-2xl border border-border-subtle bg-surface-1 px-4 py-2 text-sm text-foreground/75 transition hover:bg-foreground/5 hover:text-foreground disabled:opacity-50">
            {loading ? ("Refreshing...") : ("Refresh")}
          </button>
        </div>

        <div className="flex gap-2">
          {(["all", "critical", "warning", "info"] as LevelFilter[]).map((f) => (<button key={f} onClick={() => setFilter(f)} className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition capitalize ${filter === f
                ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-200"
                : "border-border-subtle bg-surface-1 text-foreground/60 hover:text-foreground"}`}>
              {f}
            </button>))}
        </div>

        {loading ? (<p className="text-sm text-foreground/60">{"Loading notifications..."}</p>) : visible.length === 0 ? (<div className="rounded-2xl border border-border-subtle bg-surface-1 p-8 text-center text-sm text-foreground/55">
            {filter === "all"
                ? ("No active notifications. All leads are up to date.")
                :
                    `No ${filter} notifications.`}
          </div>) : (<div className="space-y-3">
            {visible.map((item) => (<NotificationCard key={item.id} item={item}/>))}
          </div>)}
      </div>
    </AuthGuard>);
}
