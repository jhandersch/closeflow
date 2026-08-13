"use client"

import { useMemo, useState } from "react"

import AuthGuard from "@/components/AuthGuard"

import ActivityFeed from "@/components/dashboard/ActivityFeed"
import AIInsightCard from "@/components/dashboard/AIInsightCard"
import RevenueCard from "@/components/dashboard/RevenueCard"
import WinRateCard from "@/components/dashboard/WinRateCard"
import DashboardHeader from "@/components/dashboard/DashboardHeader"
import EngagementCard from "@/components/dashboard/EngagementCard"
import HealthOverviewCard from "@/components/dashboard/HealthOverviewCard"
import KPIGrid from "@/components/dashboard/KPIGrid"
import PipelineChart from "@/components/dashboard/PipelineChart"
import PriorityDealsCard from "@/components/dashboard/PriorityDealsCard"
import RevenueForecastChart from "@/components/dashboard/RevenueForecastChart"
import ActivityTrendChart from "@/components/dashboard/ActivityTrendChart"
import RevenueForecastAI from "@/components/dashboard/RevenueForecastAI"
import RevenueForecast from "@/components/dashboard/RevenueForecast"
import AIForecastCard from "@/components/dashboard/AIForecastCard"
import TasksWidget from "@/components/dashboard/TasksWidget"

import EmptyState from "@/components/EmptyState"

import { useDashboardMetrics } from "@/hooks/useDashboardMetrics"
import { useDashboardTasks } from "@/hooks/useDashboardTasks"
import { useLeadsData } from "@/hooks/useLeadsData"
import { useAIInsight } from "@/hooks/useAIInsight"
import { useForecastAI } from "@/hooks/useForecastAI"
import { useRevenueForecastAI } from "@/hooks/useRevenueForecastAI"

import { calculateForecast } from "@/lib/forecast"
import { loadDemoData } from "@/lib/demoData"

import { useAppPreferences } from "@/components/AppPreferencesProvider"


export default function DashboardPage() {

  const { language, t } = useAppPreferences()

  const {
    leads,
    activities,
    loading,
    error,
    refresh,
  } = useLeadsData({
    activityLimit: 240,
  })

  const metrics = useDashboardMetrics(leads)

  const {
    summary: taskSummary,
    loading: tasksLoading,
  } = useDashboardTasks()



  const forecast = useMemo(
  () => calculateForecast(leads),
  [leads]
)



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



  const {
    insight: revenueInsight,
    loading: revenueInsightLoading,
    error: revenueInsightError,
  } = useRevenueForecastAI(
    leads,
    forecast,
    language
  )



  const {
    insight,
  } = useAIInsight(
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



  const [demoLoading,setDemoLoading] = useState(false)
  const [demoMessage,setDemoMessage] = useState<string | null>(null)

  const activitiesThisWeek = useMemo(() => {
    const fromMs = Date.now() - 7 * 24 * 60 * 60 * 1000
    return activities.filter((item) => new Date(item.created_at).getTime() >= fromMs).length
  }, [activities])

  const activityTrendData = useMemo(() => {
    const now = new Date()
    const weekStarts = Array.from({ length: 8 }).map((_, index) => {
      const date = new Date(now)
      date.setDate(date.getDate() - (7 - index) * 7)
      date.setHours(0, 0, 0, 0)
      return date
    })

    const labels = weekStarts.map((date) =>
      date.toLocaleDateString(language === "de" ? "de-DE" : "en-US", {
        day: "2-digit",
        month: "2-digit",
      })
    )

    const buckets = weekStarts.map((start, index) => {
      const end = new Date(start)
      end.setDate(end.getDate() + 7)

      const value = activities.filter((item) => {
        const ts = new Date(item.created_at).getTime()
        return ts >= start.getTime() && ts < end.getTime()
      }).length

      return {
        label: labels[index],
        value,
      }
    })

    return buckets
  }, [activities, language])



  if(loading){

    return (

      <AuthGuard>

        <div className="space-y-6">

          <div className="h-24 animate-pulse rounded-3xl border border-border-subtle bg-surface-1"/>

          <div className="h-32 animate-pulse rounded-3xl border border-border-subtle bg-surface-1"/>


          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

            {
              Array.from({
                length:4
              }).map((_,i)=>(

                <div
                  key={i}
                  className="h-28 animate-pulse rounded-3xl border border-border-subtle bg-surface-1"
                />

              ))
            }

          </div>

        </div>

      </AuthGuard>

    )
  }




  if(error){

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
            {t("dashboard.loadErrorTitle", "We could not load your dashboard.")}
          </p>


          <p className="mt-2 text-sm text-rose-200/80">
            {error}
          </p>


          <button
            onClick={()=>void refresh()}
            className="
              mt-5
              rounded-xl
              border
              border-rose-400/30
              px-4
              py-2
            "
          >
            {t("dashboard.tryAgain", "Try again")}
          </button>


        </div>

      </AuthGuard>

    )

  }





  if(!leads.length){

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


            title={t("dashboard.workspaceReadyTitle", "Your workspace is ready")}


            description={t("dashboard.workspaceReadyDescription", "Add your first lead or load demo data to unlock forecasting, AI insights and pipeline analytics.")}


            actions={

              <button

                disabled={demoLoading}

                onClick={async()=>{

                  setDemoLoading(true)

                  try{

                    const result = await loadDemoData()

                    const warning = result.warnings?.length ? ` ${t("dashboard.warnings", "Warnings")}: ${result.warnings.join(" ")}` : ""
                    setDemoMessage(
                      `${result.message} ${t("dashboard.leads", "Leads")}: ${result.inserted_leads}, ${t("dashboard.activities", "Activities")}: ${result.inserted_activities}, ${t("dashboard.tasks", "Tasks")}: ${result.inserted_tasks}.${warning}`
                    )

                    await refresh()

                  }

                  catch(error){

                    setDemoMessage(
                      error instanceof Error
                      ? error.message
                      : t("dashboard.failed", "Failed")
                    )

                  }

                  finally{

                    setDemoLoading(false)

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

                {
                  demoLoading
                  ? t("common.loading", "Lädt...")
                  : t("dashboard.loadDemoData", "Load demo data")
                }


              </button>

            }

          />


          {
            demoMessage &&
            <div className="
              rounded-xl
              border
              border-emerald-500/20
              bg-emerald-500/10
              p-3
              text-sm
              text-emerald-300
            ">
              {demoMessage}
            </div>
          }


        </div>


      </AuthGuard>

    )

  }





  return (

    <AuthGuard>


      <div className="space-y-8">



        <DashboardHeader

          forecast={metrics.forecast}

          totalLeads={metrics.total}

          pipelineValue={metrics.pipelineValue}

          attentionCount={metrics.atRiskDeals.length}

        />




        <AIInsightCard
          insight={insight}
        />


        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
          <RevenueCard pipelineValue={metrics.pipelineValue} />
          <WinRateCard winRate={Number(metrics.winRate)} />
        </div>




        <KPIGrid
          totalLeads={metrics.total}
          pipelineValue={metrics.pipelineValue}
          wonDeals={metrics.won}
          revenue={metrics.revenue}
          conversionRate={metrics.conversionRate}
          activitiesThisWeek={activitiesThisWeek}
          openTasks={taskSummary.open}
        />




        <RevenueForecast

          pipelineValue={forecast.pipelineValue}

          weightedRevenue={forecast.weightedRevenue}

          revenueAtRisk={forecast.revenueAtRisk}

          commitRevenue={forecast.commitRevenue}

          bestCaseRevenue={forecast.bestCaseRevenue}

          confidence={forecast.confidence}

          averageHealth={forecast.averageHealth}

          averageProbability={forecast.averageProbability}

          activeDeals={forecast.activeDeals}

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

              healthyCount={metrics.healthyLeadCount}

              watchlistCount={metrics.watchlistCount}

              atRiskCount={metrics.atRiskDeals.length}

            />


          </div>


        </div>





        <div className="
          grid
          gap-6
          xl:grid-cols-[1fr_0.9fr]
        ">



          <ActivityFeed

            activities={activities.slice(0, 12)}

          />




          <div className="space-y-6">


            <EngagementCard

              contactedCount={metrics.contactedLeads.length}

              proposalCount={metrics.proposalLeads.length}

              forecastDelta={metrics.forecastDelta}

            />



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