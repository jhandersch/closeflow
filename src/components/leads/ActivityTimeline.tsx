"use client"

import { useMemo, useState } from "react"
import { useAppPreferences } from "@/components/AppPreferencesProvider"
import type { ActivityType } from "@/types"

type Activity = {
  id: string
  action: string
  type?: ActivityType | string
  created_at: string
}

type ActivityTimelineProps = {
  activities: Activity[]
}

export default function ActivityTimeline({
  activities,
}: ActivityTimelineProps) {
  const { language } = useAppPreferences()
  const isDe = language === "de"

  const [filter, setFilter] = useState<"all" | "calls" | "emails" | "changes" | "ai">("all")

  const getActivityIcon = (type?: ActivityType | string) => {
    switch (type) {
      case "status_changed":
        return "SC"
      case "note_added":
        return "NT"
      case "email_sent":
        return "EM"
      case "call_completed":
        return "CL"
      case "task_created":
        return "TC"
      case "task_completed":
        return "TD"
      case "created":
        return "NW"
      case "ai":
        return "AI"

      default:
        return "EV"
    }
  }

  const filteredActivities = useMemo(() => {
    if (filter === "all") return activities
    if (filter === "calls") return activities.filter((activity) => activity.type === "call_completed")
    if (filter === "emails") return activities.filter((activity) => activity.type === "email_sent")
    if (filter === "ai") return activities.filter((activity) => activity.type === "ai")
    return activities.filter((activity) => (
      activity.type === "status_changed" ||
      activity.type === "note_added" ||
      activity.type === "task_created" ||
      activity.type === "task_completed" ||
      activity.type === "created"
    ))
  }, [activities, filter])

  const getTypeLabel = (type?: ActivityType | string) => {
    switch (type) {
      case "status_changed":
        return isDe ? "Statuswechsel" : "status change"
      case "note_added":
        return isDe ? "Notiz" : "note"
      case "email_sent":
        return isDe ? "E-Mail" : "email"
      case "call_completed":
        return isDe ? "Anruf" : "call"
      case "task_created":
        return isDe ? "Aufgabe" : "task"
      case "task_completed":
        return isDe ? "Aufgabe" : "task"
      case "created":
        return isDe ? "Erstellt" : "created"
      case "ai":
        return isDe ? "KI" : "ai"
      default:
        return isDe ? "Ereignis" : "event"
    }
  }

  const getLocalizedAction = (action: string) => {
    if (!isDe) return action

    const localizeStatus = (status: string) => {
      const normalized = status.trim().toLowerCase()
      if (normalized === "new") return "Neu"
      if (normalized === "contacted") return "Kontaktiert"
      if (normalized === "qualified") return "Qualifiziert"
      if (normalized === "proposal") return "Angebot"
      if (normalized === "won") return "Gewonnen"
      if (normalized === "lost") return "Verloren"
      return status
    }

    const statusMatch = action.match(/^Status changed from\s+(.+)\s+to\s+(.+)$/i)
    if (statusMatch) {
      return `Status geändert von ${localizeStatus(statusMatch[1])} zu ${localizeStatus(statusMatch[2])}`
    }

    const normalized = action.trim().toLowerCase()

    if (normalized === "lead created") return "Lead erstellt"
    if (normalized === "lead imported from csv") return "Lead aus CSV importiert"
    if (normalized === "lead notes updated") return "Lead-Notizen aktualisiert"
    if (normalized === "lead details updated") return "Lead-Details aktualisiert"
    if (normalized === "task completed") return "Aufgabe erledigt"
    if (normalized.startsWith("task created:")) {
      return `Aufgabe erstellt:${action.slice(action.indexOf(":") + 1)}`
    }

    return action
  }


  return (
    <div className="rounded-xl bg-surface-1 p-6">

      <h2 className="mb-4 text-xl font-semibold text-foreground">
        {isDe ? "Aktivitätsverlauf" : "Activity Timeline"}
      </h2>

      <div className="mb-4 flex flex-wrap gap-2">
        <button onClick={() => setFilter("all")} className={`rounded-full px-3 py-1 text-xs ${filter === "all" ? "bg-foreground text-background" : "bg-surface-2/80 text-foreground/80"}`}>{isDe ? "Alle" : "All"}</button>
        <button onClick={() => setFilter("calls")} className={`rounded-full px-3 py-1 text-xs ${filter === "calls" ? "bg-foreground text-background" : "bg-surface-2/80 text-foreground/80"}`}>{isDe ? "Anrufe" : "Calls"}</button>
        <button onClick={() => setFilter("emails")} className={`rounded-full px-3 py-1 text-xs ${filter === "emails" ? "bg-foreground text-background" : "bg-surface-2/80 text-foreground/80"}`}>{isDe ? "E-Mails" : "Emails"}</button>
        <button onClick={() => setFilter("changes")} className={`rounded-full px-3 py-1 text-xs ${filter === "changes" ? "bg-foreground text-background" : "bg-surface-2/80 text-foreground/80"}`}>{isDe ? "Änderungen" : "Changes"}</button>
        <button onClick={() => setFilter("ai")} className={`rounded-full px-3 py-1 text-xs ${filter === "ai" ? "bg-foreground text-background" : "bg-surface-2/80 text-foreground/80"}`}>AI</button>
      </div>


      {filteredActivities.length === 0 ? (

        <p className="text-foreground/55">
          {isDe ? "Noch keine Aktivitäten." : "No activities yet."}
        </p>

      ) : (

        <div className="space-y-3">

          {filteredActivities.map((a) => (

            <div
              key={a.id}
              className="border-b border-border-subtle pb-3"
            >

              <div className="flex items-center gap-3">

                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-cyan-500/20 bg-cyan-500/10 text-[10px] font-semibold tracking-wide text-cyan-300">
                  {getActivityIcon(a.type)}
                </span>


                <div>

                  <p className="font-medium text-foreground">
                    {a.type === "ai"
                    ? (isDe ? "KI-Assistent: " : "AI Assistant: ") + getLocalizedAction(a.action)
                    : getLocalizedAction(a.action)}
                  </p>


                  <p className="text-xs text-foreground/55">
                    {getTypeLabel(a.type)}
                  </p>


                  <p className="mt-1 text-xs text-foreground/55">
                    {new Date(
                      a.created_at
                    ).toLocaleString()}
                  </p>


                </div>

              </div>

            </div>

          ))}

        </div>

      )}

    </div>
  )
}
