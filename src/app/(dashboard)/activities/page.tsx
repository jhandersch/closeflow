"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import PaginationControls from "@/components/PaginationControls";
import { supabase } from "@/lib/supabase/client";

type ActivityItem = {
    id: string;
    lead_id: string | null;
    user_id: string | null;
    actor_name?: string | null;
    action?: string | null;
    type?: string | null;
    title?: string | null;
    description?: string | null;
    metadata?: Record<string, unknown> | null;
    created_at: string;
};

const DEFAULT_TIMEZONE = "Europe/Berlin";
const PAGE_SIZE = 50;

function formatActivityDate(
    value: string,
    timeZone: string,
) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone,
    }).format(date);
}

export default function ActivitiesPage() {
    const locale = "en-US";
    const [timezone, setTimezone] =
        useState(DEFAULT_TIMEZONE);
    const [activities, setActivities] =
        useState<ActivityItem[]>([]);

    const [filter, setFilter] =
        useState<"today" | "week" | "month" | "all">(
            "all",
        );

    const [loading, setLoading] =
        useState(true);
    const [loadError, setLoadError] = useState("");
    const [page, setPage] = useState(1);

    useEffect(() => {
        const loadTimezone = async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                return;
            }

            const savedTimezone =
                typeof user.user_metadata?.timezone ===
                    "string" &&
                user.user_metadata.timezone.trim()
                    ? user.user_metadata.timezone
                    : DEFAULT_TIMEZONE;

            setTimezone(savedTimezone);
        };

        void loadTimezone();
    }, []);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setLoadError("");
            setPage(1);

            try {
                const {
                    data: { session },
                } = await supabase.auth.getSession();

                const response = await fetch(
                    `/api/activity?filter=${filter}`,
                    {
                        headers: session?.access_token
                            ? {
                                  Authorization: `Bearer ${session.access_token}`,
                              }
                            : undefined,
                        credentials: "include",
                    },
                );

                if (response.ok) {
                    setActivities(
                        (await response.json()) as ActivityItem[],
                    );
                } else {
                    const result = await response.json().catch(() => null);
                    setLoadError(result?.error || "Could not load activities.");
                }
            } catch (error) {
                setLoadError(error instanceof Error ? error.message : "Could not load activities.");
            } finally {
                setLoading(false);
            }
        };

        void load();
    }, [filter]);

    const getTypeLabel = (
        type?: string | null,
    ) => {
        if (!type) {
            return "Activity";
        }

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
            updated: "Lead updated",
            lead_updated: "Lead updated",
            customer_updated: "Customer updated",
            lead_deleted: "Lead deleted",
            lead_restored: "Lead restored",
            calendar_event: "Calendar event",
            ai: "AI",
            other: "Update",
        };

        return labels[type] || type;
    };

    const getCalendarTitle = (
        type?: string | null,
    ) => {
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

    const getActivityTitle = (
        activity: ActivityItem,
    ) => {
        const raw = (
            activity.title ||
            activity.action ||
            ""
        ).trim();

        const normalized =
            raw.toLowerCase();

        const event =
            typeof activity.metadata?.event ===
                "string"
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

        const calendarTitle =
            getCalendarTitle(activity.type) ||
            getCalendarTitle(event);

        if (calendarTitle) {
            return calendarTitle;
        }

        if (
            normalized === "lead_created" ||
            normalized === "lead created"
        ) {
            return "Lead created";
        }

        const taskCreatedMatch =
            raw.match(/^task created:\s*(.+)$/i);

        if (taskCreatedMatch) {
            return `Task created: ${taskCreatedMatch[1]}`;
        }

        const taskUpdatedMatch =
            raw.match(/^task updated:\s*(.+)$/i);

        if (taskUpdatedMatch) {
            return `Task updated: ${taskUpdatedMatch[1]}`;
        }

        const taskDeletedMatch =
            raw.match(/^task deleted:\s*(.+)$/i);

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

        return (
            translations[normalized] ||
            raw ||
            "Activity"
        );
    };

    const totalPages = Math.max(1, Math.ceil(activities.length / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const visibleActivities = activities.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE,
    );

    return (
        <AuthGuard>
            <div className="mx-auto max-w-4xl space-y-6">
                <div>
                    <p className="text-sm uppercase tracking-[0.24em] text-cyan-400">
                        Activities
                    </p>

                    <h1 className="mt-2 text-3xl font-bold text-foreground">
                        Review recent workspace activity
                    </h1>

                    <p className="mt-2 text-sm text-foreground/65">
                        All interactions, stage changes, tasks and AI actions in one place.
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setFilter("all")}
                        className={`rounded-full px-3 py-1 text-xs ${filter === "all" ? "bg-foreground text-background" : "bg-surface-2/80 text-foreground/80"}`}
                    >
                        All time
                    </button>
                    <button
                        onClick={() => setFilter("today")}
                        className={`rounded-full px-3 py-1 text-xs ${
                            filter === "today"
                                ? "bg-foreground text-background"
                                : "bg-surface-2/80 text-foreground/80"
                        }`}
                    >
                        Today
                    </button>

                    <button
                        onClick={() => setFilter("week")}
                        className={`rounded-full px-3 py-1 text-xs ${
                            filter === "week"
                                ? "bg-foreground text-background"
                                : "bg-surface-2/80 text-foreground/80"
                        }`}
                    >
                        7 days
                    </button>

                    <button
                        onClick={() => setFilter("month")}
                        className={`rounded-full px-3 py-1 text-xs ${
                            filter === "month"
                                ? "bg-foreground text-background"
                                : "bg-surface-2/80 text-foreground/80"
                        }`}
                    >
                        30 days
                    </button>
                </div>

                {loadError ? <p role="alert" className="rounded-xl border border-rose-500/25 bg-rose-500/10 p-4 text-sm text-rose-200">{loadError}</p> : null}

                <div className="flex items-center justify-between text-sm text-foreground/55">
                    <span>{activities.length.toLocaleString(locale)} activities loaded</span>
                    <span>{filter === "all" ? "All recorded activity" : filter === "month" ? "Last 30 days" : filter === "week" ? "Last 7 days" : "Today"}</span>
                </div>

                <PaginationControls
                    page={currentPage}
                    pageSize={PAGE_SIZE}
                    totalItems={activities.length}
                    label="activities"
                    onPageChange={setPage}
                />

                <div className="rounded-2xl border border-border-subtle bg-surface-1 p-6">
                    {loading ? (
                        <p className="text-sm text-foreground/65">
                            Loading activities...
                        </p>
                    ) : activities.length === 0 ? (
                        <p className="text-sm text-foreground/55">
                            No activities yet.
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {visibleActivities.map(
                                (activity) => (
                                    <article
                                        key={activity.id}
                                        className="rounded-xl border border-border-subtle bg-surface-2/70 p-4"
                                    >
                                        <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">
                                            {getTypeLabel(
                                                activity.type,
                                            )}
                                        </p>

                                        <p className="mt-2 font-medium text-foreground">
                                            {getActivityTitle(
                                                activity,
                                            )}
                                        </p>

                                        {activity.user_id ? (
                                            <p className="mt-1 break-all text-xs text-foreground/55">
                                                Actor: {activity.actor_name || activity.user_id}
                                            </p>
                                        ) : null}

                                        {activity.description ? (
                                            <p className="mt-1 text-sm text-foreground/70">
                                                {
                                                    activity.description
                                                }
                                            </p>
                                        ) : null}

                                        {activity.lead_id ? (
                                            <div className="mt-2">
                                                <Link
                                                    href={`/leads/${activity.lead_id}`}
                                                    className="text-xs text-cyan-300 hover:underline"
                                                >
                                                    Open lead
                                                </Link>
                                            </div>
                                        ) : null}

                                        <p className="mt-2 text-xs text-foreground/50">
                                            {formatActivityDate(
                                                activity.created_at,
                                                timezone,
                                            )}
                                        </p>
                                    </article>
                                ),
                            )}
                        </div>
                    )}
                </div>

                <PaginationControls
                    page={currentPage}
                    pageSize={PAGE_SIZE}
                    totalItems={activities.length}
                    label="activities"
                    onPageChange={setPage}
                />
            </div>
        </AuthGuard>
    );
}
