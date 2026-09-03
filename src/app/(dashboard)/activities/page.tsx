"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { useAppPreferences } from "@/components/AppPreferencesProvider";
import { supabase } from "@/lib/supabase/client";
type ActivityItem = {
    id: string;
    lead_id: string | null;
    action?: string | null;
    type?: string | null;
    title?: string | null;
    description?: string | null;
    metadata?: Record<string, unknown> | null;
    created_at: string;
};
export default function ActivitiesPage() {
    const { language } = useAppPreferences();
    const locale = "en-US";
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [filter, setFilter] = useState<"today" | "week" | "month">("month");
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const { data: { session }, } = await supabase.auth.getSession();
            const response = await fetch(`/api/activity?filter=${filter}`, {
                headers: session?.access_token
                    ? {
                        Authorization: `Bearer ${session.access_token}`,
                    }
                    : undefined,
                credentials: "include",
            });
            if (response.ok) {
                setActivities((await response.json()) as ActivityItem[]);
            }
            setLoading(false);
        };
        void load();
    }, [filter]);
    const getTypeLabel = (type?: string | null) => {
        if (!type)
            return "Activity";
        const labels: Record<string, string> = {
            created: "Lead created",
            status_changed: "Status changed",
            note_added: "Note",
            email_sent: "Email",
            call_completed: "Call",
            task_created: "Task created",
            task_completed: "Task completed",
            meeting_created: "Meeting created",
            meeting_updated: "Meeting updated",
            meeting_completed: "Meeting completed",
            meeting_deleted: "Meeting deleted",
            ai: "AI",
            other: "Update",
        };
        return labels[type] || type;
    };
    const getCalendarTitle = (type?: string | null) => {
        switch (type) {
            case "meeting_created":
                return "Meeting created";
            case "meeting_updated":
                return "Meeting updated";
            case "meeting_completed":
                return "Meeting completed";
            case "meeting_deleted":
                return "Meeting deleted";
            default:
                return null;
        }
    };
    const getLocalizedTitle = (activity: ActivityItem) => {
        const raw = (activity.title || activity.action || "").trim();
        const normalized = raw.toLowerCase();
        const event = typeof activity.metadata?.event === "string"
            ? activity.metadata.event.toLowerCase()
            : "";
        if (event === "task_updated") {
            return "Task updated";
        }
        if (event === "task_deleted") {
            return "Task deleted";
        }
        if (event === "task_reopened") {
            return "Task reopened";
        }
        const calendarTitle = getCalendarTitle(activity.type) ||
            getCalendarTitle(event);
        if (calendarTitle) {
            return calendarTitle;
        }
        if (normalized === "lead_created" || normalized === "lead created") {
            return "Lead created";
        }
        const taskCreatedMatch = raw.match(/^task created:\s*(.+)$/i);
        if (taskCreatedMatch) {
            return `Task created: ${taskCreatedMatch[1]}`;
        }
        const taskUpdatedMatch = raw.match(/^task updated:\s*(.+)$/i);
        if (taskUpdatedMatch) {
            return `Task updated: ${taskUpdatedMatch[1]}`;
        }
        const taskDeletedMatch = raw.match(/^task deleted:\s*(.+)$/i);
        if (taskDeletedMatch) {
            return `Task deleted: ${taskDeletedMatch[1]}`;
        }
        const translations: Record<string, string> = {
            "task completed": "Task completed",
            "task reopened": "Task reopened",
            "email sent": "Email sent",
            "activity updated": "Activity updated",
            "meeting created": "Meeting created",
            "meeting updated": "Meeting updated",
            "meeting completed": "Meeting completed",
            "meeting deleted": "Meeting deleted",
        };
        return translations[normalized] || raw || ("Activity");
    };
    return (<AuthGuard>
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-400">{"Activity"}</p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">{"Activity Timeline"}</h1>
          <p className="mt-2 text-sm text-foreground/65">{"All interactions, stage changes, tasks and AI actions in one place."}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFilter("today")} className={`rounded-full px-3 py-1 text-xs ${filter === "today" ? "bg-foreground text-background" : "bg-surface-2/80 text-foreground/80"}`}>
            {"Today"}
          </button>
          <button onClick={() => setFilter("week")} className={`rounded-full px-3 py-1 text-xs ${filter === "week" ? "bg-foreground text-background" : "bg-surface-2/80 text-foreground/80"}`}>
            {"7 days"}
          </button>
          <button onClick={() => setFilter("month")} className={`rounded-full px-3 py-1 text-xs ${filter === "month" ? "bg-foreground text-background" : "bg-surface-2/80 text-foreground/80"}`}>
            {"30 days"}
          </button>
        </div>

        <div className="rounded-2xl border border-border-subtle bg-surface-1 p-6">
          {loading ? (<p className="text-sm text-foreground/65">{"Loading activities..."}</p>) : activities.length === 0 ? (<p className="text-sm text-foreground/55">{"No activities yet."}</p>) : (<div className="space-y-3">
              {activities.map((activity) => (<article key={activity.id} className="rounded-xl border border-border-subtle bg-surface-2/70 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">{getTypeLabel(activity.type)}</p>
                  <p className="mt-2 font-medium text-foreground">{getLocalizedTitle(activity)}</p>
                  {activity.description ? <p className="mt-1 text-sm text-foreground/70">{activity.description}</p> : null}
                  {activity.lead_id ? (<div className="mt-2">
                      <Link href={`/leads/${activity.lead_id}`} className="text-xs text-cyan-300 hover:underline">
                        {"Open lead"}
                      </Link>
                    </div>) : null}
                  <p className="mt-2 text-xs text-foreground/50">{new Date(activity.created_at).toLocaleString(locale)}</p>
                </article>))}
            </div>)}
        </div>
      </div>
    </AuthGuard>);
}
