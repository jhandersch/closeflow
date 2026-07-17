"use client"

import Link from "next/link"
import { useState } from "react"
import AuthGuard from "@/components/AuthGuard"
import { useAppPreferences } from "@/components/AppPreferencesProvider"
import { useNotifications, type NotificationItem } from "@/hooks/useNotifications"

type LevelFilter = "all" | "critical" | "warning" | "info"

const levelConfig: Record<string, { label: string; color: string; badge: string }> = {
  critical: { label: "Critical", color: "border-rose-500/30 bg-rose-500/10", badge: "text-rose-300" },
  warning:  { label: "Warning",  color: "border-amber-500/30 bg-amber-500/10", badge: "text-amber-300" },
  info:     { label: "Info",     color: "border-cyan-500/20 bg-cyan-500/10",   badge: "text-cyan-300" },
}

const relativeTime = (iso: string, isDe: boolean) => {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return isDe ? "gerade eben" : "just now"
  if (m < 60) return isDe ? `vor ${m}m` : `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return isDe ? `vor ${h}h` : `${h}h ago`
  return isDe ? `vor ${Math.floor(h / 24)}d` : `${Math.floor(h / 24)}d ago`
}

function NotificationCard({ item, isDe }: { item: NotificationItem; isDe: boolean }) {
  const cfg = levelConfig[item.level] || levelConfig.info
  const levelLabel = isDe
    ? (item.level === "critical" ? "Kritisch" : item.level === "warning" ? "Warnung" : "Info")
    : cfg.label
  return (
    <div className={`rounded-2xl border p-5 ${cfg.color}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <span className={`text-xs font-semibold uppercase tracking-[0.2em] ${cfg.badge}`}>{levelLabel}</span>
          <p className="mt-1 font-semibold text-foreground leading-snug">{item.title}</p>
          <p className="mt-1 text-sm text-foreground/65">{item.message}</p>
        </div>
        <div className="shrink-0 flex flex-col items-end gap-2">
          <span className="text-xs text-foreground/45">{relativeTime(item.createdAt, isDe)}</span>
          {item.leadId ? (
            <Link
              href={`/leads/${item.leadId}`}
              className="rounded-xl border border-border-subtle bg-surface-2/70 px-3 py-1.5 text-xs text-foreground/75 transition hover:bg-foreground/5 hover:text-foreground"
            >
              {isDe ? "Lead öffnen →" : "Open lead →"}
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default function NotificationsPage() {
  const { language } = useAppPreferences()
  const isDe = language === "de"

  const { notifications, loading, refresh } = useNotifications()
  const [filter, setFilter] = useState<LevelFilter>("all")

  const visible = filter === "all" ? notifications : notifications.filter((n) => n.level === filter)

  const criticalCount = notifications.filter((n) => n.level === "critical").length
  const warningCount = notifications.filter((n) => n.level === "warning").length

  return (
    <AuthGuard>
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-cyan-400">{isDe ? "Posteingang" : "Inbox"}</p>
            <h1 className="mt-2 text-3xl font-bold text-foreground">{isDe ? "Benachrichtigungen" : "Notifications"}</h1>
            <p className="mt-1 text-sm text-foreground/65">
              {notifications.length} {isDe ? "aktiv" : "active"}{criticalCount > 0 ? `, ${criticalCount} ${isDe ? "kritisch" : "critical"}` : ""}
              {warningCount > 0 ? `, ${warningCount} ${isDe ? "Warnungen" : "warnings"}` : ""}
            </p>
          </div>
          <button
            onClick={() => void refresh()}
            disabled={loading}
            className="rounded-2xl border border-border-subtle bg-surface-1 px-4 py-2 text-sm text-foreground/75 transition hover:bg-foreground/5 hover:text-foreground disabled:opacity-50"
          >
            {loading ? (isDe ? "Aktualisiere..." : "Refreshing...") : (isDe ? "Aktualisieren" : "Refresh")}
          </button>
        </div>

        <div className="flex gap-2">
          {(["all", "critical", "warning", "info"] as LevelFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition capitalize ${
                filter === f
                  ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-200"
                  : "border-border-subtle bg-surface-1 text-foreground/60 hover:text-foreground"
              }`}
            >
              {isDe ? (f === "all" ? "alle" : f === "critical" ? "kritisch" : f === "warning" ? "warnung" : "info") : f}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-foreground/60">{isDe ? "Benachrichtigungen werden geladen..." : "Loading notifications..."}</p>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border border-border-subtle bg-surface-1 p-8 text-center text-sm text-foreground/55">
            {filter === "all"
              ? (isDe ? "Keine aktiven Benachrichtigungen. Alle Leads sind aktuell." : "No active notifications. All leads are up to date.")
              : isDe
                ? `Keine ${filter === "critical" ? "kritischen" : filter === "warning" ? "Warn" : "Info"}-Benachrichtigungen.`
                : `No ${filter} notifications.`}
          </div>
        ) : (
          <div className="space-y-3">
            {visible.map((item) => (
              <NotificationCard key={item.id} item={item} isDe={isDe} />
            ))}
          </div>
        )}
      </div>
    </AuthGuard>
  )
}