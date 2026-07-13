"use client"

import AuthGuard from "@/components/AuthGuard"
import ActivityFeed from "@/components/dashboard/ActivityFeed"
import AIInsightCard from "@/components/dashboard/AIInsightCard"
import DashboardHeader from "@/components/dashboard/DashboardHeader"
import EngagementCard from "@/components/dashboard/EngagementCard"
import HealthOverviewCard from "@/components/dashboard/HealthOverviewCard"
import KPIGrid from "@/components/dashboard/KPIGrid"
import PipelineChart from "@/components/dashboard/PipelineChart"
import PriorityDealsCard from "@/components/dashboard/PriorityDealsCard"
import RevenueForecastChart from "@/components/dashboard/RevenueForecastChart"
import RevenueForecastAI from "@/components/dashboard/RevenueForecastAI"
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics"
import { useDashboardTasks } from "@/hooks/useDashboardTasks"
import { useLeadsData } from "@/hooks/useLeadsData"
import { useAIInsight } from "@/hooks/useAIInsight"
import { useForecastAI } from "@/hooks/useForecastAI"
import { useRevenueForecastAI } from "@/hooks/useRevenueForecastAI"
import { calculateForecast } from "@/lib/forecast"
import RevenueForecast from "@/components/dashboard/RevenueForecast"
import AIForecastCard from "@/components/dashboard/AIForecastCard"
import TasksWidget from "@/components/dashboard/TasksWidget"
import EmptyState from "@/components/EmptyState"
import { loadDemoData } from "@/lib/demoData"
import { useAppPreferences } from "@/components/AppPreferencesProvider"
import { useState } from "react"


export default function DashboardPage() {
  const { t, language } = useAppPreferences()
  const { leads, activities, loading, error, refresh } = useLeadsData({ activityLimit: 5 })
  const metrics = useDashboardMetrics(leads)
  const { summary: taskSummary, loading: tasksLoading } = useDashboardTasks()
  const forecast = calculateForecast(leads)
  const {
    analysis: forecastAnalysis,
    loading: forecastLoading,
  } = useForecastAI(
    forecast.pipelineValue,
    forecast.weightedRevenue,
    forecast.revenueAtRisk,
    leads,
    language
  )
  const { insight: revenueInsight, loading: revenueInsightLoading } = useRevenueForecastAI(leads, forecast, language)
  const [demoLoading, setDemoLoading] = useState(false)
  const [demoMessage, setDemoMessage] = useState<string | null>(null)
  const { insight, loading: aiLoading } = useAIInsight(
    
    {
      leads,
      revenue: metrics.revenue,
      forecast: metrics.forecast,
      proposalLeads: metrics.proposalLeads.length,
      atRiskDeals: metrics.atRiskDeals.length,
      highValueDeals: metrics.highValueDeals.length,
    },
    metrics.insight,
    language
  )

  if (loading) {
    return (
      <AuthGuard>
        <div className="space-y-6" aria-busy="true" aria-live="polite">
          <div className="h-24 animate-pulse rounded-3xl border border-border-subtle bg-surface-1" />
          <div className="h-32 animate-pulse rounded-3xl border border-border-subtle bg-surface-1" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-28 animate-pulse rounded-3xl border border-border-subtle bg-surface-1" />
            ))}
          </div>
        </div>
      </AuthGuard>
    )
  }

  if (error) {
    return (
      <AuthGuard>
        <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-8 text-rose-200" role="alert">
          <p className="text-lg font-semibold">We couldn’t load your dashboard data.</p>
          <p className="mt-2 text-sm text-rose-200/80">{error}</p>
          <button onClick={() => void refresh()} className="mt-5 rounded-xl border border-rose-400/30 px-4 py-2 text-sm transition hover:bg-rose-500/20">
            Try again
          </button>
        </div>
      </AuthGuard>
    )
  }

  if (!leads.length) {
    return (
      <AuthGuard>
        <div className="space-y-6">
          <EmptyState
            icon={<span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-base font-semibold text-cyan-300">CF</span>}
            title="Your workspace is ready"
            description="Add your first lead or load demo data to see forecasting, AI insights, and pipeline momentum instantly."
            actions={
              <>
                <button
                  onClick={async () => {
                    setDemoLoading(true)
                    setDemoMessage(null)
                    try {
                      const result = await loadDemoData()
                      setDemoMessage(result.message)
                      await refresh()
                    } catch (error) {
                      setDemoMessage(error instanceof Error ? error.message : "Could not load demo data")
                    } finally {
                      setDemoLoading(false)
                    }
                  }}
                  disabled={demoLoading}
                  className="rounded-xl bg-foreground px-4 py-2 font-semibold text-background transition hover:opacity-90 disabled:opacity-60"
                >
                  {demoLoading ? "Loading demo data..." : "Load demo data"}
                </button>
              </>
            }
          />
          {demoMessage ? <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{demoMessage}</div> : null}
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <div className="space-y-8">
        <DashboardHeader forecast={metrics.forecast} />
        <AIInsightCard insight={insight} />
        <KPIGrid 
          total={metrics.total} 
          openPipeline={metrics.openPipeline} 
          revenue={metrics.revenue} 
          winRate={metrics.winRate} 
          conversionRate={metrics.conversionRate}
          wonLostLabel={metrics.wonLostLabel}
        />

        <RevenueForecast
          pipelineValue={forecast.pipelineValue}
          weightedRevenue={forecast.weightedRevenue}
          revenueAtRisk={forecast.revenueAtRisk}
        />

        <AIForecastCard
          analysis={forecastAnalysis}
          loading={forecastLoading}
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="cf-card cf-enter p-5">
            <p className="cf-label">{t("dashboard.conversionRate", "Conversion rate")}</p>
            <p className="cf-kpi mt-2 text-3xl font-semibold text-foreground">{metrics.conversionRate}%</p>
          </div>
          <div className="cf-card cf-enter p-5">
            <p className="cf-label">{t("dashboard.wonLost", "Won / Lost")}</p>
            <p className="cf-kpi mt-2 text-3xl font-semibold text-foreground">{metrics.wonLostLabel}</p>
          </div>
          <div className="cf-card cf-enter p-5">
            <p className="cf-label">{t("dashboard.avgDealSize", "Average deal size")}</p>
            <p className="cf-kpi mt-2 text-3xl font-semibold text-foreground">€{metrics.averageDealValue.toLocaleString("de-DE")}</p>
          </div>
          <div className="cf-card cf-enter p-5">
            <p className="cf-label">{t("dashboard.avgSalesCycle", "Average sales cycle")}</p>
            <p className="cf-kpi mt-2 text-3xl font-semibold text-foreground">{metrics.averageSalesCycle} days</p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <RevenueForecastChart data={metrics.forecastTrend} />
          <PipelineChart data={metrics.statusChartData} />
        </div>

        <RevenueForecastAI insight={revenueInsight} loading={revenueInsightLoading} />

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <PriorityDealsCard leads={metrics.priorityDeals} />
          <div className="space-y-6">
            <section className="cf-card cf-enter p-6">
              <p className="cf-label">{t("dashboard.actionableInsights", "Actionable insights")}</p>
              <h2 className="cf-title text-lg font-semibold text-foreground">{t("dashboard.nextSteps", "What to do next")}</h2>
              <div className="mt-4 space-y-3">
                <div className="cf-card-soft p-3">
                  <p className="text-sm text-foreground/80">{metrics.proposalLeads.length} proposals are ready for close-plan follow-up.</p>
                </div>
                <div className="cf-card-soft p-3">
                  <p className="text-sm text-foreground/80">{metrics.atRiskDeals.length} deals need attention to lift their health score.</p>
                </div>
                <div className="cf-card-soft p-3">
                  <p className="text-sm text-foreground/80">Average deal value sits at €{metrics.averageDealValue} with {metrics.highValueDeals.length} opportunities above €5k.</p>
                </div>
                <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-3">
                  <p className="text-sm text-cyan-300">{metrics.insight.headline}</p>
                  <p className="mt-1 text-xs text-cyan-200">{metrics.insight.detail}</p>
                </div>
              </div>
            </section>

            <HealthOverviewCard healthyCount={metrics.healthyLeadCount} watchlistCount={metrics.watchlistCount} atRiskCount={metrics.atRiskDeals.length} />
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
          <ActivityFeed activities={activities} />
          <div className="space-y-6">
            <EngagementCard contactedCount={metrics.contactedLeads.length} proposalCount={metrics.proposalLeads.length} forecastDelta={metrics.forecastDelta} />
            <TasksWidget
              open={taskSummary.open}
              completed={taskSummary.completed}
              overdue={taskSummary.overdue}
              highPriorityOpen={taskSummary.highPriorityOpen}
              nextDue={taskSummary.nextDue}
              loading={tasksLoading}
            />
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}