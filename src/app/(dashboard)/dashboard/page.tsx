"use client";

import { useEffect, useMemo, useState } from "react";

import AuthGuard from "@/components/AuthGuard";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import AIInsightCard from "@/components/dashboard/AIInsightCard";
import RevenueCard from "@/components/dashboard/RevenueCard";
import WinRateCard from "@/components/dashboard/WinRateCard";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import EngagementCard from "@/components/dashboard/EngagementCard";
import HealthOverviewCard from "@/components/dashboard/HealthOverviewCard";
import KPIGrid from "@/components/dashboard/KPIGrid";
import PipelineChart from "@/components/dashboard/PipelineChart";
import PriorityDealsCard from "@/components/dashboard/PriorityDealsCard";
import RevenueForecastChart from "@/components/dashboard/RevenueForecastChart";
import ActivityTrendChart from "@/components/dashboard/ActivityTrendChart";
import RevenueForecastAI from "@/components/dashboard/RevenueForecastAI";
import RevenueForecast from "@/components/dashboard/RevenueForecast";
import AIForecastCard from "@/components/dashboard/AIForecastCard";
import TasksWidget from "@/components/dashboard/TasksWidget";
import EmptyState from "@/components/EmptyState";

import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";
import { useDashboardTasks } from "@/hooks/useDashboardTasks";
import { useLeadsData } from "@/hooks/useLeadsData";
import { useAIInsight } from "@/hooks/useAIInsight";
import { useForecastAI } from "@/hooks/useForecastAI";
import { useRevenueForecastAI } from "@/hooks/useRevenueForecastAI";

import { loadDemoData } from "@/lib/demoData";
import { useAppPreferences } from "@/components/AppPreferencesProvider";
import { notify } from "@/lib/notifications";
import { supabase } from "@/lib/supabase/client";

const DEFAULT_TIMEZONE = "Europe/Berlin";

const getDateKey = (
    value: Date,
    timeZone: string,
) => {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(value);

    const values = Object.fromEntries(
        parts
            .filter((part) => part.type !== "literal")
            .map((part) => [part.type, part.value]),
    );

    return `${values.year}-${values.month}-${values.day}`;
};

const addCalendarDays = (
    dateKey: string,
    days: number,
) => {
    const [year, month, day] = dateKey
        .split("-")
        .map(Number);

    const date = new Date(
        Date.UTC(
            year,
            month - 1,
            day,
        ),
    );

    date.setUTCDate(
        date.getUTCDate() + days,
    );

    return date.toISOString().slice(0, 10);
};

export default function DashboardPage() {
    const { t } = useAppPreferences();

    const locale = "en-US";
    const [timezone, setTimezone] =
        useState(DEFAULT_TIMEZONE);
    const [demoLoading, setDemoLoading] =
        useState(false);

    const {
        leads,
        activities,
        loading,
        error,
        refresh,
    } = useLeadsData({
        activityLimit: 240,
        includeCompleted: true,
    });

    const metrics = useDashboardMetrics(leads);
    const forecast = metrics.forecastData;

    const {
        summary: taskSummary,
        loading: tasksLoading,
    } = useDashboardTasks();

    const {
        analysis: forecastAnalysis,
        loading: forecastLoading,
    } = useForecastAI(
        forecast,
        leads,
        "en",
    );

    const {
        insight: revenueInsight,
        loading: revenueInsightLoading,
        error: revenueInsightError,
    } = useRevenueForecastAI(
        leads,
        forecast,
        "en",
    );

    const {
        insight,
    } = useAIInsight(
        {
            leads,
            revenue: metrics.revenue,
            forecast: metrics.forecast,
            proposalLeads:
                metrics.proposalLeads.length,
            atRiskDeals:
                metrics.atRiskDeals.length,
            highValueDeals:
                metrics.highValueDeals.length,
        },
        metrics.insight,
        "en",
    );

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

    const activitiesThisWeek = useMemo(() => {
        const fromMs =
            Date.now() -
            7 * 24 * 60 * 60 * 1000;

        return activities.filter(
            (item) =>
                new Date(
                    item.created_at,
                ).getTime() >= fromMs,
        ).length;
    }, [activities]);

    const activityTrendData = useMemo(() => {
        const todayKey = getDateKey(
            new Date(),
            timezone,
        );

        const weekStarts = Array.from({
            length: 8,
        }).map((_, index) =>
            addCalendarDays(
                todayKey,
                -(7 - index) * 7,
            ),
        );

        return weekStarts.map(
            (startKey) => {
                const endKey =
                    addCalendarDays(
                        startKey,
                        7,
                    );

                const value =
                    activities.filter(
                        (item) => {
                            const activityKey =
                                getDateKey(
                                    new Date(
                                        item.created_at,
                                    ),
                                    timezone,
                                );

                            return (
                                activityKey >=
                                    startKey &&
                                activityKey <
                                    endKey
                            );
                        },
                    ).length;

                const [
                    year,
                    month,
                    day,
                ] = startKey
                    .split("-")
                    .map(Number);

                const label =
                    new Intl.DateTimeFormat(
                        locale,
                        {
                            day: "2-digit",
                            month: "2-digit",
                            timeZone: "UTC",
                        },
                    ).format(
                        new Date(
                            Date.UTC(
                                year,
                                month - 1,
                                day,
                            ),
                        ),
                    );

                return {
                    label,
                    value,
                };
            },
        );
    }, [
        activities,
        locale,
        timezone,
    ]);

    if (loading) {
        return (
            <AuthGuard>
                <div className="space-y-6">
                    <div className="h-24 animate-pulse rounded-3xl border border-border-subtle bg-surface-1" />

                    <div className="h-32 animate-pulse rounded-3xl border border-border-subtle bg-surface-1" />

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        {Array.from({
                            length: 4,
                        }).map((_, index) => (
                            <div
                                key={index}
                                className="h-28 animate-pulse rounded-3xl border border-border-subtle bg-surface-1"
                            />
                        ))}
                    </div>
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
                            "Add your first lead or load demo data to unlock forecasting, AI insights and pipeline analytics.",
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
            <div className="space-y-8">
                <DashboardHeader
                    forecast={metrics.forecast}
                    totalLeads={metrics.total}
                    pipelineValue={
                        metrics.pipelineValue
                    }
                    attentionCount={
                        metrics.atRiskDeals.length
                    }
                />

                <AIInsightCard
                    insight={insight}
                />

                <div className="
                    grid
                    gap-4
                    md:grid-cols-2
                    xl:grid-cols-2
                ">
                    <RevenueCard
                        pipelineValue={
                            metrics.pipelineValue
                        }
                    />

                    <WinRateCard
                        winRate={Number(
                            metrics.winRate,
                        )}
                    />
                </div>

                <KPIGrid
                    totalLeads={metrics.total}
                    pipelineValue={
                        metrics.pipelineValue
                    }
                    wonDeals={metrics.won}
                    revenue={metrics.revenue}
                    conversionRate={
                        metrics.conversionRate
                    }
                    activitiesThisWeek={
                        activitiesThisWeek
                    }
                    openTasks={
                        taskSummary.open
                    }
                />

                <RevenueForecast
                    pipelineValue={
                        forecast.pipelineValue
                    }
                    weightedRevenue={
                        forecast.weightedRevenue
                    }
                    revenueAtRisk={
                        forecast.revenueAtRisk
                    }
                    commitRevenue={
                        forecast.commitRevenue
                    }
                    bestCaseRevenue={
                        forecast.bestCaseRevenue
                    }
                    confidence={
                        forecast.confidence
                    }
                    averageHealth={
                        forecast.averageHealth
                    }
                    averageProbability={
                        forecast.averageProbability
                    }
                    activeDeals={
                        forecast.activeDeals
                    }
                    singleDealRisk={
                        forecast.singleDealRisk
                    }
                    dealsWithNextAction={
                        forecast.dealsWithNextAction
                    }
                    dealsWithoutNextAction={
                        forecast.dealsWithoutNextAction
                    }
                    nextActionCoverage={
                        forecast.nextActionCoverage
                    }
                />

                <AIForecastCard
                    analysis={forecastAnalysis}
                    loading={forecastLoading}
                />

                <div className="
                    grid
                    gap-6
                    xl:grid-cols-3
                ">
                    <RevenueForecastChart
                        data={metrics.forecastTrend}
                    />

                    <ActivityTrendChart
                        data={activityTrendData}
                    />

                    <PipelineChart
                        data={metrics.statusChartData}
                    />
                </div>

                <RevenueForecastAI
                    insight={revenueInsight}
                    loading={revenueInsightLoading}
                    error={revenueInsightError}
                />

                <div className="
                    grid
                    gap-6
                    xl:grid-cols-[1.1fr_0.9fr]
                ">
                    <PriorityDealsCard
                        leads={metrics.priorityDeals}
                    />

                    <div className="space-y-6">
                        <HealthOverviewCard
                            healthyCount={
                                metrics.healthyLeadCount
                            }
                            watchlistCount={
                                metrics.watchlistCount
                            }
                            atRiskCount={
                                metrics.atRiskDeals.length
                            }
                        />
                    </div>
                </div>

                <div className="
                    grid
                    gap-6
                    xl:grid-cols-[1fr_0.9fr]
                ">
                    <ActivityFeed
                        activities={activities.slice(
                            0,
                            12,
                        )}
                        timeZone={timezone}
                    />

                    <div className="space-y-6">
                        <EngagementCard
                            contactedCount={
                                metrics.contactedLeads
                                    .length
                            }
                            proposalCount={
                                metrics.proposalLeads
                                    .length
                            }
                            forecastDelta={
                                metrics.forecastDelta
                            }
                        />

                        <TasksWidget
                            open={
                                taskSummary.open
                            }
                            completed={
                                taskSummary.completed
                            }
                            overdue={
                                taskSummary.overdue
                            }
                            highPriorityOpen={
                                taskSummary.highPriorityOpen
                            }
                            nextDue={
                                taskSummary.nextDue
                            }
                            loading={
                                tasksLoading
                            }

                            timeZone={
                                timezone}
                        />
                    </div>
                </div>
            </div>
        </AuthGuard>
    );
}