"use client"

import { useAppPreferences } from "@/components/AppPreferencesProvider"

type TasksWidgetProps = {
  open: number
  completed: number
  overdue: number
  highPriorityOpen: number
  nextDue?: {
    title: string
    due_date: string | null
  } | null
  loading?: boolean
}

export default function TasksWidget({
  open,
  completed,
  overdue,
  highPriorityOpen,
  nextDue,
  loading,
}: TasksWidgetProps) {
  const { language } = useAppPreferences()
  const isDe = language === "de"

  return (
    <section className="rounded-2xl border border-border-subtle bg-surface-1 p-6" aria-labelledby="tasks-widget-heading">
      <p className="text-sm text-foreground/65">{isDe ? "Aufgabenübersicht" : "Tasks overview"}</p>
      <h2 id="tasks-widget-heading" className="text-lg font-semibold text-foreground">{isDe ? "Follow-up-Auslastung" : "Follow-up workload"}</h2>

      {loading ? (
        <div className="mt-4 space-y-3">
          <div className="h-10 animate-pulse rounded-xl bg-surface-2/70" />
          <div className="h-10 animate-pulse rounded-xl bg-surface-2/70" />
          <div className="h-10 animate-pulse rounded-xl bg-surface-2/70" />
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-sm text-blue-300">{isDe ? "Offene Aufgaben" : "Open tasks"}: {open}</div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300">{isDe ? "Erledigte Aufgaben" : "Completed tasks"}: {completed}</div>
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">{isDe ? "Überfällige Aufgaben" : "Overdue tasks"}: {overdue}</div>
          <div className="rounded-xl border border-orange-500/20 bg-orange-500/10 p-3 text-sm text-orange-300">{isDe ? "Hohe Priorität offen" : "High-priority open"}: {highPriorityOpen}</div>

          {nextDue ? (
            <div className="rounded-xl border border-border-subtle bg-surface-2/70 p-3 text-sm text-foreground/80">
              {isDe ? "Nächste Fälligkeit" : "Next due"}: {nextDue.title}
              <div className="mt-1 text-xs text-foreground/55">
                {nextDue.due_date ? new Date(nextDue.due_date).toLocaleDateString(isDe ? "de-DE" : "en-US") : (isDe ? "Kein Fälligkeitsdatum" : "No due date")}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </section>
  )
}

