"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import AuthGuard from "@/components/AuthGuard";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DealsNeedingAttention from "@/components/dashboard/DealsNeedingAttention";
import ActivityTrendChart from "@/components/dashboard/ActivityTrendChart";
import TasksWidget from "@/components/dashboard/TasksWidget";
import EmptyState from "@/components/EmptyState";

import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";
import { useDashboardTasks } from "@/hooks/useDashboardTasks";
import { useLeadsData } from "@/hooks/useLeadsData";
import { loadDemoData } from "@/lib/demoData";
import { useAppPreferences } from "@/components/AppPreferencesProvider";
import { notify } from "@/lib/notifications";

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

    const {
        summary: taskSummary,
        loading: tasksLoading,
    } = useDashboardTasks();

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

    if (!leads.length) {
        return (
            <AuthGuard>
                <div className="space-y-6">
                    <EmptyState
                        icon={
                            <span className="
                                rounded-full
                                border
                                border-cyan-500/30
                                bg-cyan-500/10
                                px-3
                                py-1
                                text-cyan-300
                            ">
                                CF
                            </span>
                        }
                        title={t(
                            "dashboard.workspaceReadyTitle",
                            "Your workspace is ready",
                        )}
                        description={t(
                            "dashboard.workspaceReadyDescription",
                            "Add your first lead to see upcoming tasks and deals that need attention here.",
                        )}
                        actions={
                            <button
                                disabled={demoLoading}
                                onClick={async () => {
                                    setDemoLoading(true);

                                    try {
                                        const result =
                                            await loadDemoData({
                                                reload: true,
                                            });

                                        notify.info(
                                            `${result.message} Leads: ${result.inserted_leads}, Activities: ${result.inserted_activities}, Tasks: ${result.inserted_tasks}.`,
                                            {
                                                id: "dashboard-demo-data-loaded",
                                            },
                                        );

                                        if (
                                            result.warnings
                                                ?.length
                                        ) {
                                            notify.warning(
                                                `Warnings: ${result.warnings.join(" ")}`,
                                                {
                                                    id: "dashboard-demo-load-warning",
                                                },
                                            );
                                        }

                                        await refresh();
                                    } catch (loadError) {
                                        notify.error(
                                            loadError instanceof
                                                Error
                                                ? loadError.message
                                                : "Could not load demo data",
                                            {
                                                id: "dashboard-demo-load-error",
                                            },
                                        );
                                    } finally {
                                        setDemoLoading(
                                            false,
                                        );
                                    }
                                }}
                                className="
                                    rounded-xl
                                    bg-foreground
                                    px-4
                                    py-2
                                    font-semibold
                                    text-background
                                "
                            >
                                {demoLoading
                                    ? t(
                                          "common.loading",
                                          "Loading...",
                                      )
                                    : t(
                                          "dashboard.loadDemoData",
                                          "Load demo data",
                                      )}
                            </button>
                        }
                    />
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

                <div className="grid gap-6 xl:grid-cols-2">
                    <TasksWidget
                        open={taskSummary.open}
                        overdue={taskSummary.overdue}
                        nextDue={taskSummary.nextDue}
                        loading={tasksLoading}
                    />
                    <DealsNeedingAttention leads={metrics.atRiskDeals} />
                </div>

                <ActivityTrendChart data={activityTrendData} />

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
