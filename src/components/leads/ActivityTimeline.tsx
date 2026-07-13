import { useMemo, useState } from "react"
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
        return "status change"
      case "note_added":
        return "note"
      case "email_sent":
        return "email"
      case "call_completed":
        return "call"
      case "task_created":
        return "task"
      case "task_completed":
        return "task"
      case "created":
        return "created"
      case "ai":
        return "ai"
      default:
        return "event"
    }
  }


  return (
    <div className="rounded-xl bg-surface-1 p-6">

      <h2 className="mb-4 text-xl font-semibold text-foreground">
        Activity Timeline
      </h2>

      <div className="mb-4 flex flex-wrap gap-2">
        <button onClick={() => setFilter("all")} className={`rounded-full px-3 py-1 text-xs ${filter === "all" ? "bg-foreground text-background" : "bg-surface-2/80 text-foreground/80"}`}>All</button>
        <button onClick={() => setFilter("calls")} className={`rounded-full px-3 py-1 text-xs ${filter === "calls" ? "bg-foreground text-background" : "bg-surface-2/80 text-foreground/80"}`}>Calls</button>
        <button onClick={() => setFilter("emails")} className={`rounded-full px-3 py-1 text-xs ${filter === "emails" ? "bg-foreground text-background" : "bg-surface-2/80 text-foreground/80"}`}>Emails</button>
        <button onClick={() => setFilter("changes")} className={`rounded-full px-3 py-1 text-xs ${filter === "changes" ? "bg-foreground text-background" : "bg-surface-2/80 text-foreground/80"}`}>Changes</button>
        <button onClick={() => setFilter("ai")} className={`rounded-full px-3 py-1 text-xs ${filter === "ai" ? "bg-foreground text-background" : "bg-surface-2/80 text-foreground/80"}`}>AI</button>
      </div>


      {filteredActivities.length === 0 ? (

        <p className="text-foreground/55">
          No activities yet.
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
                    ? "AI Assistant: " + a.action
                    : a.action}
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
