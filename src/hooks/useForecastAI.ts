"use client"

import { useEffect, useState } from "react"

type ForecastAI = {
  summary: string
  positiveFactors: string[]
  risks: string[]
  recommendation: string
}

export function useForecastAI(
  pipelineValue: number,
  weightedRevenue: number,
  revenueAtRisk: number,
  leads: any[]
) {
  const [analysis, setAnalysis] = useState<ForecastAI | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!leads.length) return

    async function generate() {
      setLoading(true)

      try {
        const res = await fetch("/api/forecast-ai", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            pipelineValue,
            weightedRevenue,
            revenueAtRisk,
            leads,
          }),
        })

        const data = await res.json()

        setAnalysis(data)
      } catch (err) {
        console.error(err)

        setAnalysis({
          summary: "Forecast analysis unavailable.",
          positiveFactors: [],
          risks: [],
          recommendation: "Review pipeline manually.",
        })
      }

      setLoading(false)
    }

    generate()
  }, [pipelineValue, weightedRevenue, revenueAtRisk, leads])

  return {
    analysis,
    loading,
  }
}