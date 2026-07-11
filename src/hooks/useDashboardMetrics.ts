import { useMemo } from "react"
import { generateDashboardInsight } from "@/lib/openai"
import { analyzeLead, getHealthScore } from "@/lib/scoring"
import type { Lead } from "@/hooks/useLeadsData"

const stageWeights: Record<string, number> = {
  new: 0.1,
  contacted: 0.3,
  proposal: 0.7,
  won: 1,
}

const stageOrder = ["new", "contacted", "proposal", "won"] as const

export function useDashboardMetrics(leads: Lead[]) {
  return useMemo(() => {
    const total = leads.length
    const won = leads.filter((lead) => lead.status === "won").length
    const lost = leads.filter((lead) => lead.status === "lost").length
    const pipelineValue = leads.reduce((sum, lead) => sum + (lead.value || 0), 0)
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

    const forecastTrend = [
      { month: "Now", value: revenue },
      { month: "+1 mo", value: Math.round(revenue + forecast * 0.15) },
      { month: "+2 mo", value: Math.round(revenue + forecast * 0.3) },
      { month: "+3 mo", value: Math.round(revenue + forecast * 0.45) },
    ]

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
        name: "Proposal",
        value: proposalLeads.length,
      },
      {
        name: "Won",
        value: won,
      },
    ]

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
      averageDealValue: total > 0 ? Math.round(pipelineValue / total) : 0,
      forecastTrend,
      statusChartData,
      priorityDeals,
      insight,
      openPipeline: total - won - lost,
      watchlistCount: total - healthyLeadCount - atRiskDeals.length,
      forecastDelta: Math.max(0, Math.round(forecast - revenue)),
      stageCounts,
      pipelineDistribution,
      averageSalesCycle: total > 0 ? Math.round(pipelineValue / Math.max(won, 1)) : 0,
    }
  }, [leads])
}
