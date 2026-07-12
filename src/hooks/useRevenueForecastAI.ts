"use client"

import { useEffect, useState } from "react"

type ForecastSummary = {
  pipelineValue: number
  weightedRevenue: number
  revenueAtRisk: number
}

type RevenueForecastInsight = {
  explanation: string
  positiveDrivers: string[]
  risks: string[]
  recommendation: string
  confidence: number
}

type Lead = {
  id: string
  name: string
  company: string
  status: string
  value: number
  created_at: string
  stage_changed_at?: string | null
  notes?: string | null
  next_action?: string | null
}

export function useRevenueForecastAI(leads: Lead[], forecast: ForecastSummary) {
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
            leads,
            forecast,
          }),
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
            explanation: "AI revenue intelligence is temporarily unavailable.",
            positiveDrivers: [],
            risks: ["Forecast data could not be analyzed automatically."],
            recommendation: "Review the pipeline manually and focus on the largest open deals.",
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
  }, [leads, forecast])

  return {
    insight,
    loading,
  }
}
