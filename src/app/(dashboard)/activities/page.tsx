"use client"

import { useEffect, useState } from "react"
import AuthGuard from "@/components/AuthGuard"

type ActivityItem = {
  id: string
  action?: string | null
  type?: string | null
  title?: string | null
  description?: string | null
  created_at: string
}

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const response = await fetch("/api/activity?filter=month")
      if (response.ok) {
        setActivities((await response.json()) as ActivityItem[])
      }
      setLoading(false)
    }

    void load()
  }, [])

  return (
    <AuthGuard>
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-400">Activity</p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">Activity Timeline</h1>
          <p className="mt-2 text-sm text-foreground/65">All interactions, stage changes, tasks and AI actions in one place.</p>
        </div>

        <div className="rounded-2xl border border-border-subtle bg-surface-1 p-6">
          {loading ? (
            <p className="text-sm text-foreground/65">Loading activities...</p>
          ) : activities.length === 0 ? (
            <p className="text-sm text-foreground/55">No activities yet.</p>
          ) : (
            <div className="space-y-3">
              {activities.map((activity) => (
                <article key={activity.id} className="rounded-xl border border-border-subtle bg-surface-2/70 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">{activity.type || "activity"}</p>
                  <p className="mt-2 font-medium text-foreground">{activity.title || activity.action || "Update"}</p>
                  {activity.description ? <p className="mt-1 text-sm text-foreground/70">{activity.description}</p> : null}
                  <p className="mt-2 text-xs text-foreground/50">{new Date(activity.created_at).toLocaleString("de-DE")}</p>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  )
}
