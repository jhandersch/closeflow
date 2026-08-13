import { useMemo } from "react"
import { generateDashboardInsight } from "@/lib/openai"
import { analyzeLead, getHealthScore } from "@/lib/scoring"
import type { Lead } from "@/types"

const stageWeights: Record<string, number> = {
  new: 0.1,
  contacted: 0.3,
  qualified: 0.5,
  proposal: 0.7,
  won: 1,
  lost: 0,
}

const stageOrder = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "won",
  "lost",
] as const

const monthLabel = (date: Date) =>
  date.toLocaleDateString("de-DE", {
    month: "short",
    year: "2-digit",
  })

const monthKey = (date: Date) =>
  `${date.getFullYear()}-${date.getMonth()}`

export function useDashboardMetrics(leads: Lead[]) {
  return useMemo(() => {
    /*
     * BASIC METRICS
     */

    const total = leads.length

    const won = leads.filter(
      (lead) => lead.status === "won"
    ).length

    const lost = leads.filter(
      (lead) => lead.status === "lost"
    ).length

    const wonOrLost = won + lost

    /*
     * REALIZED REVENUE
     */

    const revenue = leads
      .filter((lead) => lead.status === "won")
      .reduce(
        (sum, lead) => sum + (lead.value || 0),
        0
      )

    /*
     * OPEN PIPELINE
     */

    const openLeads = leads.filter(
      (lead) =>
        lead.status !== "won" &&
        lead.status !== "lost"
    )

    const pipelineValue = openLeads.reduce(
      (sum, lead) => sum + (lead.value || 0),
      0
    )

    const openPipeline = openLeads.length

    /*
     * WEIGHTED FORECAST
     */

    const forecast = openLeads.reduce(
      (sum, lead) => {
        const weight =
          stageWeights[lead.status] ?? 0

        return (
          sum +
          (lead.value || 0) * weight
        )
      },
      0
    )

    /*
     * PIPELINE DATA
     */

    const proposalLeads = leads.filter(
      (lead) => lead.status === "proposal"
    )

    const contactedLeads = leads.filter(
      (lead) => lead.status === "contacted"
    )

    const highValueDeals = leads.filter(
      (lead) => (lead.value || 0) >= 5000
    )

    /*
     * HEALTH / RISK
     */

    const atRiskDeals = leads
      .filter(
        (lead) =>
          getHealthScore(lead) < 50
      )
      .sort(
        (a, b) =>
          (b.value || 0) -
          (a.value || 0)
      )

    const healthyLeadCount = leads.filter(
      (lead) =>
        getHealthScore(lead) >= 70
    ).length

    const watchlistCount = Math.max(
      0,
      total -
        healthyLeadCount -
        atRiskDeals.length
    )

    /*
     * PRIORITY DEALS
     */

    const priorityDeals = [...openLeads]
      .map((lead) => ({
        ...lead,
        analysis: analyzeLead(lead),
      }))
      .sort(
        (a, b) =>
          b.analysis.priority -
          a.analysis.priority
      )
      .slice(0, 4)

    /*
     * STAGE COUNTS
     */

    const stageCounts = stageOrder.map(
      (stage) => ({
        stage,

        count: leads.filter(
          (lead) =>
            lead.status === stage
        ).length,

        value: leads
          .filter(
            (lead) =>
              lead.status === stage
          )
          .reduce(
            (sum, lead) =>
              sum + (lead.value || 0),
            0
          ),
      })
    )

    /*
     * MONTH BUCKETS
     *
     * Last 6 months.
     */

    const monthBuckets = Array.from(
      { length: 6 }
    ).map((_, index) => {
      const date = new Date()

      date.setMonth(
        date.getMonth() -
          (5 - index)
      )

      date.setHours(
        0,
        0,
        0,
        0
      )

      return {
        key: monthKey(date),
        month: monthLabel(date),
        value: 0,
      }
    })

    /*
     * WON DEALS
     *
     * IMPORTANT:
     * Declare wonLeads BEFORE using it.
     */

    const wonLeads = leads.filter(
      (lead) =>
        lead.status === "won"
    )

    /*
     * HISTORICAL WON REVENUE
     */

    const wonRevenueByMonth =
      new Map<string, number>()

    wonLeads.forEach((lead) => {
      const closeDate = new Date(
        lead.stage_changed_at ||
          lead.updated_at ||
          lead.created_at
      )

      const key =
        monthKey(closeDate)

      const current =
        wonRevenueByMonth.get(key) ||
        0

      wonRevenueByMonth.set(
        key,
        current + (lead.value || 0)
      )
    })

/*
 * FORECAST MOMENTUM
 *
 * Past:
 *   Actual won revenue
 *
 * Future:
 *   Weighted open pipeline
 *
 * Deals with expected_close_at are placed
 * into their expected closing month.
 *
 * Deals without expected_close_at use a
 * stage-based fallback.
 */

const weightedPipeline =
  openLeads.reduce(
    (sum, lead) => {
      const weight =
        stageWeights[lead.status] ?? 0

      return (
        sum +
        (lead.value || 0) * weight
      )
    },
    0
  )

/*
 * Future forecast revenue by month
 */

const forecastRevenueByMonth =
  new Map<string, number>()

const now = new Date()

now.setDate(1)
now.setHours(0, 0, 0, 0)

openLeads.forEach((lead) => {
  const weight =
    stageWeights[lead.status] ?? 0

  const weightedValue =
    (lead.value || 0) * weight

  if (weightedValue <= 0) {
    return
  }

  let forecastDate: Date

  /*
   * Best case:
   * Use the actual expected close date.
   */

  if (lead.expected_close_at) {
    forecastDate =
      new Date(
        lead.expected_close_at
      )
  } else {
    /*
     * Fallback based on pipeline stage.
     *
     * New        → +3 months
     * Contacted  → +2 months
     * Qualified  → +2 months
     * Proposal   → +1 month
     */

    const monthsToClose =
      lead.status === "proposal"
        ? 1
        : lead.status === "qualified"
        ? 2
        : lead.status === "contacted"
        ? 2
        : 3

    forecastDate =
      new Date(now)

    forecastDate.setMonth(
      forecastDate.getMonth() +
        monthsToClose
    )
  }

  /*
   * If the expected close date is already
   * in the past, put the deal into the
   * current month.
   */

  if (
    forecastDate.getTime() <
    now.getTime()
  ) {
    forecastDate =
      new Date(now)
  }

  forecastDate.setDate(1)
  forecastDate.setHours(0, 0, 0, 0)

  const key =
    monthKey(forecastDate)

  forecastRevenueByMonth.set(
    key,
    (forecastRevenueByMonth.get(key) || 0) +
      weightedValue
  )
})

/*
 * Build 6-month momentum timeline.
 *
 * 2 historical months
 * +
 * current month
 * +
 * 3 forecast months
 */

const forecastTrend =
  Array.from({ length: 6 }).map(
    (_, index) => {
      const date =
        new Date(now)

      date.setMonth(
        now.getMonth() -
          2 +
          index
      )

      date.setDate(1)

      const key =
        monthKey(date)

      const historicalRevenue =
        wonRevenueByMonth.get(key) || 0

      const futureRevenue =
        forecastRevenueByMonth.get(key) || 0

      const isPast =
        date.getTime() <
        now.getTime()

      return {
        month:
          monthLabel(date),

        value:
          Math.round(
            isPast
              ? historicalRevenue
              : historicalRevenue +
                  futureRevenue
          ),
      }
    }
  )

    const statusChartData = [
      {
        name: "New",
        value: leads.filter(
          (lead) =>
            lead.status === "new"
        ).length,
      },

      {
        name: "Contacted",
        value: contactedLeads.length,
      },

      {
        name: "Qualified",
        value: leads.filter(
          (lead) =>
            lead.status === "qualified"
        ).length,
      },

      {
        name: "Proposal",
        value: proposalLeads.length,
      },

      {
        name: "Won",
        value: won,
      },

      {
        name: "Lost",
        value: lost,
      },
    ]

    /*
     * DEAL VALUE
     */

    const averageDealValue =
      won > 0
        ? Math.round(
            revenue / won
          )
        : total > 0
        ? Math.round(
            pipelineValue / total
          )
        : 0

    /*
     * SALES CYCLE
     */

    const wonCycleDays =
      wonLeads.map((lead) => {
        const created =
          new Date(
            lead.created_at
          ).getTime()

        const closed =
          new Date(
            lead.stage_changed_at ||
              lead.updated_at ||
              lead.created_at
          ).getTime()

        return Math.max(
          0,
          Math.round(
            (
              closed - created
            ) /
              (
                1000 *
                60 *
                60 *
                24
              )
          )
        )
      })

    const averageSalesCycle =
      wonCycleDays.length > 0
        ? Math.round(
            wonCycleDays.reduce(
              (a, b) => a + b,
              0
            ) /
              wonCycleDays.length
          )
        : 0

    /*
     * CONVERSION
     */

    const conversionRate =
      wonOrLost > 0
        ? Number(
            (
              (won /
                wonOrLost) *
              100
            ).toFixed(1)
          )
        : 0

    /*
     * PIPELINE COVERAGE
     */

    const pipelineCoverage =
      revenue > 0
        ? Number(
            (
              pipelineValue /
              revenue
            ).toFixed(1)
          )
        : 0

    /*
     * DASHBOARD AI INSIGHT
     */

    const insight =
      generateDashboardInsight({
        leads,
        revenue,
        forecast,
        proposalLeads:
          proposalLeads.length,
        atRiskDeals:
          atRiskDeals.length,
        highValueDeals:
          highValueDeals.length,
      })

    /*
     * RETURN
     */

    return {
      total,

      won,

      lost,

      pipelineValue,

      openPipeline,

      revenue,

      forecast,

      proposalLeads,

      contactedLeads,

      highValueDeals,

      atRiskDeals,

      healthyLeadCount,

      watchlistCount,

      priorityDeals,

      /*
       * IMPORTANT:
       * This is now the real Forecast Momentum
       * data used by RevenueForecastChart.
       */
      forecastTrend,

      statusChartData,

      winRate:
        total > 0
          ? (
              (won / total) *
              100
            ).toFixed(1)
          : "0",

      conversionRate,

      wonLostLabel:
        `${won}/${lost}`,

      averageDealValue,

      averageSalesCycle,

      pipelineCoverage,

      forecastDelta:
        Math.max(
          0,
          Math.round(
            forecast -
              revenue
          )
        ),

      stageCounts,

      insight,

      currentMonthRevenue:
        forecastTrend[
          forecastTrend.length - 1
        ]?.value || 0,
    }
  }, [leads])
}