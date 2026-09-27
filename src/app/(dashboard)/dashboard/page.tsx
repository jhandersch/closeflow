"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BadgeCheck, BarChart3, CircleDollarSign, Percent } from "lucide-react";

import AuthGuard from "@/components/AuthGuard";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DealsNeedingAttention from "@/components/dashboard/DealsNeedingAttention";
import ActivityTrendChart from "@/components/dashboard/ActivityTrendChart";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import PipelineChart from "@/components/dashboard/PipelineChart";
import TasksWidget from "@/components/dashboard/TasksWidget";

import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";
import { useDashboardTasks } from "@/hooks/useDashboardTasks";
import { useLeadsData } from "@/hooks/useLeadsData";
import { loadDemoData } from "@/lib/demoData";
import { useAppPreferences } from "@/components/AppPreferencesProvider";
import { notify } from "@/lib/notifications";

function DashboardStat({ label, value, hint, icon: Icon, accent = "cyan" }: {
    label: string;
    value: string;
    hint: string;
    icon: typeof BarChart3;
    accent?: "cyan" | "emerald" | "violet" | "amber";
}) {
    const accentStyles = {
        cyan: "bg-cyan-500/10 text-cyan-300",
        emerald: "bg-emerald-500/10 text-emerald-300",
        violet: "bg-violet-500/10 text-violet-300",
        amber: "bg-amber-500/10 text-amber-300",
    };

    return (
        <section className="rounded-2xl border border-border-subtle bg-surface-1 p-5">
            <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-foreground/50">{label}</p>
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${accentStyles[accent]}`}><Icon className="h-4 w-4" /></span>
            </div>
            <p className="mt-4 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
            <p className="mt-1 text-xs text-foreground/50">{hint}</p>
        </section>
    );
}

export default function DashboardPage() {
    const { t } = useAppPreferences();

    const [demoLoading, setDemoLoading] =
        useState(false);

    const {
        leads,
        activities,
        loading,
        error,
        refresh,
    } = useLeadsData({
        activityLimit: null,
        activityFilter: "8weeks",
        includeCompleted: true,
    });

    const metrics = useDashboardMetrics(leads);
    const activeLeadIds = useMemo(() => leads.map((lead) => lead.id), [leads]);

    const {
        summary: taskSummary,
        loading: tasksLoading,
        error: tasksError,
        timezone,
    } = useDashboardTasks(activeLeadIds);

    const activityTrendData = useMemo(() => {
        const now = Date.now();
        const weekMs = 7 * 24 * 60 * 60 * 1000;

        return Array.from({ length: 8 }, (_, index) => {
            const start = now - (8 - index) * weekMs;
            const end = start + weekMs;
            const label = new Intl.DateTimeFormat("en-US", {
                month: "short",
                day: "numeric",
            }).format(new Date(start));

            return {
                label,
                value: activities.filter((activity) => {
                    const timestamp = new Date(activity.created_at).getTime();
                    return timestamp >= start && timestamp < end;
                }).length,
            };
        });
    }, [activities]);

    if (loading) {
        return (
            <AuthGuard>
                <div className="space-y-6">
                    <div className="h-24 animate-pulse rounded-3xl border border-border-subtle bg-surface-1" />
                    <div className="grid gap-6 xl:grid-cols-2">
                        <div className="h-64 animate-pulse rounded-3xl border border-border-subtle bg-surface-1" />
                        <div className="h-64 animate-pulse rounded-3xl border border-border-subtle bg-surface-1" />
                    </div>
                    <div className="h-64 animate-pulse rounded-3xl border border-border-subtle bg-surface-1" />
                </div>
            </AuthGuard>
        );
    }

    if (error) {
        return (
            <AuthGuard>
                <div className="
                    rounded-3xl
                    border
                    border-rose-500/20
                    bg-rose-500/10
                    p-8
                ">
                    <p className="text-lg font-semibold">
                        {t(
                            "dashboard.loadErrorTitle",
                            "We could not load your dashboard.",
                        )}
                    </p>

                    <p className="mt-2 text-sm text-rose-200/80">
                        {error}
                    </p>

                    <button
                        onClick={() => void refresh()}
                        className="
                            mt-5
                            rounded-xl
                            border
                            border-rose-400/30
                            px-4
                            py-2
                        "
                    >
                        {t(
                            "dashboard.tryAgain",
                            "Try again",
                        )}
                    </button>
                </div>
            </AuthGuard>
        );
    }

    return (
        <AuthGuard>
            <div className="space-y-6">
                <DashboardHeader
                    totalLeads={metrics.total}
                    pipelineValue={metrics.pipelineValue}
                    attentionCount={metrics.atRiskDeals.length}
                />

                {!leads.length && (
                    <section className="flex flex-col gap-4 rounded-2xl border border-dashed border-cyan-500/30 bg-cyan-500/[0.04] p-5 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="font-semibold">Your workspace is ready for its first lead</h2>
                            <p className="mt-1 text-sm text-foreground/60">Add a real opportunity or load sample leads, activities and tasks to explore CloseFlow.</p>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                            <Link href="/leads" className="rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background">Create first lead</Link>
                            <button
                                disabled={demoLoading}
                                onClick={async () => {
                                    setDemoLoading(true);
                                    try {
                                        const result = await loadDemoData({ reload: true });
                                        notify.info(`${result.message} Leads: ${result.inserted_leads}, Activities: ${result.inserted_activities}, Tasks: ${result.inserted_tasks}.`, { id: "dashboard-demo-data-loaded" });
                                        if (result.warnings?.length) notify.warning(`Warnings: ${result.warnings.join(" ")}`, { id: "dashboard-demo-load-warning" });
                                        await refresh();
                                    } catch (loadError) {
                                        notify.error(loadError instanceof Error ? loadError.message : "Could not load demo data", { id: "dashboard-demo-load-error" });
                                    } finally {
                                        setDemoLoading(false);
                                    }
                                }}
                                className="rounded-xl border border-border-subtle px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-surface-2 disabled:opacity-50"
                            >
                                {demoLoading ? "Loading…" : "Load demo data"}
                            </button>
                        </div>
                    </section>
                )}

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <DashboardStat label="Won revenue" value={`€${metrics.revenue.toLocaleString("de-DE")}`} hint={`${metrics.won} closed won ${metrics.won === 1 ? "deal" : "deals"}`} icon={CircleDollarSign} accent="emerald" />
                    <DashboardStat label="Win rate" value={`${metrics.winRate}%`} hint={`${metrics.wonLostLabel} won / lost deals`} icon={Percent} accent="cyan" />
                    <DashboardStat label="Average deal value" value={`€${metrics.averageDealValue.toLocaleString("de-DE")}`} hint={metrics.won ? "Across won deals" : "Across open opportunities"} icon={BarChart3} accent="violet" />
                    <DashboardStat label="Open tasks" value={tasksLoading ? "—" : String(taskSummary.open)} hint={taskSummary.overdue ? `${taskSummary.overdue} overdue — needs a look` : "No overdue tasks"} icon={BadgeCheck} accent={taskSummary.overdue ? "amber" : "emerald"} />
                </div>

                <div className="grid gap-6 xl:grid-cols-2">
                    <TasksWidget
                        open={taskSummary.open}
                        overdue={taskSummary.overdue}
                        nextDue={taskSummary.nextDue}
                        loading={tasksLoading}
                        error={tasksError}
                    />
                    <DealsNeedingAttention leads={metrics.atRiskDeals} />
                </div>

                <div className="grid gap-6 xl:grid-cols-2">
                    <PipelineChart data={metrics.statusChartData} />
                    <ActivityTrendChart data={activityTrendData} />
                </div>

                <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
                    <ActivityFeed activities={activities.slice(0, 4)} timeZone={timezone} />
                    <section className="rounded-2xl border border-border-subtle bg-surface-1 p-6">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-sm text-foreground/55">Sales health</p>
                                <h2 className="mt-1 text-lg font-semibold">Pipeline at a glance</h2>
                            </div>
                            <Link href="/forecast" className="text-sm font-medium text-cyan-300 hover:text-cyan-200">Open forecast →</Link>
                        </div>
                        <div className="mt-5 grid gap-3 sm:grid-cols-3">
                            <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.05] p-4"><p className="text-xs text-foreground/55">Healthy deals</p><p className="mt-2 text-2xl font-semibold text-emerald-300">{metrics.healthyLeadCount}</p><p className="mt-1 text-xs text-foreground/45">Good current momentum</p></div>
                            <div className="rounded-xl border border-amber-500/15 bg-amber-500/[0.05] p-4"><p className="text-xs text-foreground/55">Watchlist</p><p className="mt-2 text-2xl font-semibold text-amber-300">{metrics.watchlistCount}</p><p className="mt-1 text-xs text-foreground/45">Could use a follow-up</p></div>
                            <div className="rounded-xl border border-rose-500/15 bg-rose-500/[0.05] p-4"><p className="text-xs text-foreground/55">At risk</p><p className="mt-2 text-2xl font-semibold text-rose-300">{metrics.atRiskDeals.length}</p><p className="mt-1 text-xs text-foreground/45">Review these opportunities</p></div>
                        </div>
                        <div className="mt-4 rounded-xl border border-border-subtle bg-surface-2/50 p-4">
                            <div className="flex items-center justify-between gap-3"><p className="text-sm font-medium">Open pipeline value</p><p className="text-lg font-semibold">€{metrics.pipelineValue.toLocaleString("de-DE")}</p></div>
                            <div className="mt-3 h-2 overflow-hidden rounded-full bg-foreground/10" role="progressbar" aria-label="At-risk share of open opportunities" aria-valuemin={0} aria-valuemax={100} aria-valuenow={metrics.openPipeline ? Math.round((metrics.atRiskDeals.length / metrics.openPipeline) * 100) : 0}><div className="h-full rounded-full bg-rose-400 transition-all" style={{ width: `${metrics.openPipeline ? Math.max(5, (metrics.atRiskDeals.length / metrics.openPipeline) * 100) : 0}%` }} /></div>
                            <p className="mt-2 text-xs text-foreground/45">{metrics.openPipeline ? `${metrics.openPipeline} active opportunities · ${metrics.atRiskDeals.length} currently at risk` : "Add leads to build your pipeline health overview."}</p>
                        </div>
                    </section>
                </div>

                <nav aria-label="Detailed sales views" className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-border-subtle bg-surface-1 px-5 py-4">
                    <span className="text-sm text-foreground/55">Need more detail?</span>
                    <Link href="/forecast" className="text-sm font-medium text-cyan-300 transition hover:text-cyan-200">Open forecast →</Link>
                    <Link href="/analytics" className="text-sm font-medium text-cyan-300 transition hover:text-cyan-200">View analytics →</Link>
                    <Link href="/activities" className="text-sm font-medium text-cyan-300 transition hover:text-cyan-200">Recent activity →</Link>
                </nav>
            </div>
        </AuthGuard>
    );
}
