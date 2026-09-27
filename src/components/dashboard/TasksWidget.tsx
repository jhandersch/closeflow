"use client";

import Link from "next/link";

type TasksWidgetProps = {
    open: number;
    overdue: number;
    nextDue?: {
        title: string;
        due_date: string | null;
    } | null;
    loading?: boolean;
    error?: string | null;
};

const formatDate = (value: string) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    if (!match) return value;
    const [, year, month, day] = match;
    return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" })
        .format(new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))));
};

export default function TasksWidget({ open, overdue, nextDue, loading, error }: TasksWidgetProps) {
    return (
        <section className="rounded-2xl border border-border-subtle bg-surface-1 p-6" aria-labelledby="tasks-widget-heading">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-sm text-foreground/55">Tasks</p>
                    <h2 id="tasks-widget-heading" className="mt-1 text-lg font-semibold text-foreground">Next actions</h2>
                </div>
                <Link href="/tasks" className="text-sm font-medium text-cyan-300 transition hover:text-cyan-200">View tasks →</Link>
            </div>

            {loading ? (
                <div className="mt-5 space-y-3">
                    <div className="h-12 animate-pulse rounded-xl bg-surface-2/70" />
                    <div className="h-16 animate-pulse rounded-xl bg-surface-2/70" />
                </div>
            ) : (
                <>
                    {error && (
                        <p role="alert" className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-200">
                            Tasks could not be refreshed: {error}
                        </p>
                    )}
                    <div className="mt-5 grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-border-subtle bg-surface-2/50 p-3">
                            <p className="text-xs text-foreground/55">Open</p>
                            <p className="mt-1 text-2xl font-semibold text-foreground">{open}</p>
                        </div>
                        <div className={`rounded-xl border p-3 ${overdue ? "border-rose-500/25 bg-rose-500/10" : "border-border-subtle bg-surface-2/50"}`}>
                            <p className="text-xs text-foreground/55">Overdue</p>
                            <p className={`mt-1 text-2xl font-semibold ${overdue ? "text-rose-300" : "text-foreground"}`}>{overdue}</p>
                        </div>
                    </div>

                    <div className="mt-3 min-h-[76px] rounded-xl border border-border-subtle bg-surface-2/50 p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-foreground/45">Up next</p>
                        {nextDue ? (
                            <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2">
                                <p className="text-sm font-medium text-foreground">{nextDue.title}</p>
                                {nextDue.due_date && <p className="text-xs text-foreground/55">{formatDate(nextDue.due_date)}</p>}
                            </div>
                        ) : (
                            <p className="mt-1 text-sm text-foreground/55">No upcoming task with a due date.</p>
                        )}
                    </div>
                </>
            )}
        </section>
    );
}
