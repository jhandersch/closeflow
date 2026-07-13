import { useMemo } from "react"
import { generateDashboardInsight } from "@/lib/openai"
import { analyzeLead, getHealthScore } from "@/lib/scoring"
import type { Lead } from "@/types"

const stageWeights: Record<string, number> = {
  new: 0.1,
  contacted: 0.3,
  proposal: 0.7,
  won: 1,
}

const stageOrder = ["new", "contacted", "proposal", "won"] as const

const monthLabel = (date: Date) =>
  date.toLocaleDateString("de-DE", {
    month: "short",
    year: "2-digit",
  })

const monthKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}`

export function useDashboardMetrics(leads: Lead[]) {
  return useMemo(() => {
    const total = leads.length
    const won = leads.filter((lead) => lead.status === "won").length
    const lost = leads.filter((lead) => lead.status === "lost").length
    const pipelineValue = leads.reduce((sum, lead) => sum + (lead.value || 0), 0)
    const openPipeline = total - won - lost
    const wonOrLost = won + lost
    const revenue = leads
      .filter((lead) => lead.status === "won")
      .reduce((sum, lead) => sum + (lead.value || 0), 0)
    const forecast = leads.reduce((sum, lead) => {
      const weight = stageWeights[lead.status] || 0
      return sum + (lead.value || 0) * weight
    }, 0)

    const proposalLeads = leads.filter((lead) => lead.status === "proposal")
    const highValueDeals = leads.filter((lead) => (lead.value || 0) >= 5000)
    const contactedLeads = leads.filter((lead) => lead.status === "contacted")
    const atRiskDeals = leads.filter((lead) => getHealthScore(lead) < 50)
    const healthyLeadCount = leads.filter((lead) => getHealthScore(lead) >= 70).length

    const priorityDeals = [...leads]
      .filter((lead) => lead.status !== "won")
      .map((lead) => ({
        ...lead,
        analysis: analyzeLead(lead),
      }))
      .sort((a, b) => b.analysis.priority - a.analysis.priority)
      .slice(0, 4)

    const stageCounts = stageOrder.map((stage) => ({
      stage,
      count: leads.filter((lead) => lead.status === stage).length,
      value: leads
        .filter((lead) => lead.status === stage)
        .reduce((sum, lead) => sum + (lead.value || 0), 0),
    }))

    const monthBuckets = Array.from({ length: 6 }).map((_, index) => {
      const date = new Date()
      date.setMonth(date.getMonth() - (5 - index))
      return {
        key: monthKey(date),
        month: monthLabel(date),
        value: 0,
      }
    })

    const bucketMap = new Map(monthBuckets.map((bucket) => [bucket.key, bucket]))
    const wonLeads = leads.filter((lead) => lead.status === "won")

    wonLeads.forEach((lead) => {
      const closeDate = new Date(lead.stage_changed_at || lead.updated_at || lead.created_at)
      const key = monthKey(closeDate)
      const bucket = bucketMap.get(key)
      if (bucket) {
        bucket.value += lead.value || 0
      }
    })

    const forecastTrend = monthBuckets.map((bucket) => ({
      month: bucket.month,
      value: Math.round(bucket.value),
    }))

    const pipelineDistribution = stageCounts.map((item) => ({
      name: item.stage,
      value: item.value,
    }))

    const statusChartData = [
      {
        name: "New",
        value: leads.filter((lead) => lead.status === "new").length,
      },
      {
        name: "Contacted",
        value: contactedLeads.length,
      },
      {
        name: "Qualified",
        value: leads.filter((lead) => lead.status === "qualified").length,
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

    const averageDealValue = won > 0
      ? Math.round(revenue / won)
      : total > 0
      ? Math.round(pipelineValue / total)
      : 0

    const wonCycleDays = wonLeads
      .map((lead) => {
        const created = new Date(lead.created_at).getTime()
        const closed = new Date(lead.stage_changed_at || lead.updated_at || lead.created_at).getTime()
        const diff = Math.round((closed - created) / (1000 * 60 * 60 * 24))
        return diff >= 0 ? diff : 0
      })
      .filter((value) => Number.isFinite(value))

    const averageSalesCycle = wonCycleDays.length > 0
      ? Math.round(wonCycleDays.reduce((sum, days) => sum + days, 0) / wonCycleDays.length)
      : 0

    const conversionRate = wonOrLost > 0 ? Number(((won / wonOrLost) * 100).toFixed(1)) : 0

    const currentMonthRevenue = forecastTrend[forecastTrend.length - 1]?.value || 0

    const insight = generateDashboardInsight({
      leads,
      revenue,
      forecast,
      proposalLeads: proposalLeads.length,
      atRiskDeals: atRiskDeals.length,
      highValueDeals: highValueDeals.length,
    })

    return {
      total,
      won,
      lost,
      pipelineValue,
      revenue,
      forecast,
      proposalLeads,
      highValueDeals,
      contactedLeads,
      atRiskDeals,
      healthyLeadCount,
      winRate: total > 0 ? ((won / total) * 100).toFixed(1) : "0",
      conversionRate,
      wonLostLabel: `${won}/${lost}`,
      averageDealValue,
      forecastTrend,
      statusChartData,
      priorityDeals,
      insight,
      openPipeline,
      watchlistCount: total - healthyLeadCount - atRiskDeals.length,
      forecastDelta: Math.max(0, Math.round(forecast - revenue)),
      stageCounts,
      pipelineDistribution,
      averageSalesCycle,
      currentMonthRevenue,
    }
  }, [leads])
}
