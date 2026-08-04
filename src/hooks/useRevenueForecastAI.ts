"use client"

import { useEffect, useState } from "react"

type ForecastSummary = {
  pipelineValue: number
  weightedRevenue: number
  revenueAtRisk: number

  commitRevenue: number
  bestCaseRevenue: number

  confidence: number

  averageHealth: number
  averageProbability: number

  activeDeals: number

  topRiskDeals?: {
    name: string
    company: string
    value: number
  }[]

  topOpportunities?: {
    name: string
    company: string
    value: number
  }[]
}

type RevenueForecastInsight = {
  confidence: number

  health:
    | "Excellent"
    | "Healthy"
    | "Warning"
    | "Critical"

  headline: string

  summary: string

  topDrivers: string[]

  risks: string[]

  recommendations: string[]

  pipelineComment: string

  singleDealRisk: number
}

type Lead = {
  id: string
  name: string
  company: string
  status: string
  value: number
  probability?: number | null
  created_at: string
  stage_changed_at?: string | null
  notes?: string | null
  next_action?: string | null
}

export function useRevenueForecastAI(leads: Lead[], forecast: ForecastSummary, language: "de" | "en" = "de") {
  const [insight, setInsight] = useState<RevenueForecastInsight | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!leads.length) {
      setInsight(null)
      setLoading(false)
      return
    }

    let active = true

    async function generate() {
      setLoading(true)

      try {
        const response = await fetch("/api/revenue-forecast-ai", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            leads: leads.slice(0, 20),
            forecast,
            language,
          })
        })

        if (!response.ok) {
          throw new Error("Revenue forecast AI request failed")
        }

        const data = (await response.json()) as RevenueForecastInsight

        if (active) {
          setInsight(data)
        }
      } catch (error) {
        console.error(error)

        if (active) {
          setInsight({
            confidence: 0.2,
            health: "Critical",
            headline: language === "de" ? "KI-Umsatzanalyse nicht verfügbar" : "AI revenue intelligence unavailable",
            summary: language === "de" ? "KI-Umsatzanalyse ist vorübergehend nicht verfügbar." : "AI revenue intelligence is temporarily unavailable.",
            topDrivers: [],
            risks: [language === "de" ? "Forecast-Daten konnten nicht automatisch analysiert werden." : "Forecast data could not be analyzed automatically."],
            recommendations: [language === "de" ? "Prüfe die Pipeline manuell und fokussiere die größten offenen Deals." : "Review the pipeline manually and focus on the largest open deals."],
            pipelineComment: "",
            singleDealRisk: 0,
          })
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void generate()

    return () => {
      active = false
    }
  }, [forecast, language, leads])

  return {
    insight,
    loading,
  }
}
