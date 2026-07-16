"use client"

import { useMemo } from "react"
import { calculateSalesScore } from "@/lib/salesScore"
import { getStaleDays } from "@/lib/scoring"

type Lead = {
  value: number
  status: string
}

export function useDashboardAnalytics(leads: any[]) {
  return useMemo(() => {
    const pipelineValue = leads.reduce(
      (sum: number, lead: Lead) => sum + (lead.value || 0),
      0
    )

    const wonDeals = leads.filter(
      (lead: Lead) => lead.status === "won"
    )

    const wonRevenue = wonDeals.reduce(
      (sum: number, lead: Lead) => sum + (lead.value || 0),
      0
    )

    const hotLeads = leads.filter((lead) => {
      const score = calculateSalesScore(
        lead,
        getStaleDays(lead)
      )

      return score.priority >= 80
    })

    const attentionLeads = leads.filter((lead) => {
      const stale = getStaleDays(lead)
      return stale >= 7
    })

    const averageAI =
      leads.length === 0
        ? 0
        : Math.round(
            leads.reduce((sum: number, lead: any) => {
              return (
                sum +
                calculateSalesScore(
                  lead,
                  getStaleDays(lead)
                ).priority
              )
            }, 0) / leads.length
          )

    return {
      pipelineValue,
      wonRevenue,
      hotLeads: hotLeads.length,
      attentionLeads: attentionLeads.length,
      averageAI,
    }
  }, [leads])
}