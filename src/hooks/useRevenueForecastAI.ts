"use client"

import { useEffect, useState } from "react"
import type { ForecastSummary } from "@/types/forecast"

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

export function useRevenueForecastAI(
  leads: Lead[],
  forecast: ForecastSummary,
  language: "de" | "en" = "de"
) {
  const [insight, setInsight] =
    useState<RevenueForecastInsight | null>(null)

  const [loading, setLoading] =
    useState(false)

  const [error, setError] =
    useState<string | null>(null)

  useEffect(() => {
    if (!leads.length) {
      setInsight(null)
      setError(null)
      setLoading(false)
      return
    }

    const controller = new AbortController()

    async function generate() {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(
          "/api/revenue-forecast-ai",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            signal: controller.signal,
            body: JSON.stringify({
              leads: leads.slice(0, 20),
              forecast,
              language,
            }),
          }
        )

        const data =
          await response.json()

        if (!response.ok) {
          throw new Error(
            data?.error ||
              "Revenue forecast AI request failed"
          )
        }

        setInsight({
          confidence:
            typeof data.confidence === "number"
              ? data.confidence
              : 0,

          health:
            data.health ?? "Warning",

          headline:
            data.headline ?? "",

          summary:
            data.summary ?? "",

          topDrivers:
            Array.isArray(data.topDrivers)
              ? data.topDrivers
              : [],

          risks:
            Array.isArray(data.risks)
              ? data.risks
              : [],

          recommendations:
            Array.isArray(data.recommendations)
              ? data.recommendations
              : [],

          pipelineComment:
            data.pipelineComment ?? "",

          singleDealRisk:
            typeof data.singleDealRisk === "number"
              ? data.singleDealRisk
              : 0,
        })

        setError(null)
      } catch (error) {
        if (
          error instanceof Error &&
          error.name === "AbortError"
        ) {
          return
        }

        console.error(
          "Revenue Forecast AI:",
          error
        )

        setInsight(null)

        setError(
          error instanceof Error
            ? error.message
            : language === "de"
              ? "Die Revenue-Analyse konnte nicht erstellt werden."
              : "Revenue analysis could not be generated."
        )
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    void generate()

    return () => {
      controller.abort()
    }
  }, [
    leads,
    forecast.pipelineValue,
    forecast.weightedRevenue,
    forecast.revenueAtRisk,
    forecast.commitRevenue,
    forecast.bestCaseRevenue,
    forecast.confidence,
    forecast.averageHealth,
    forecast.averageProbability,
    forecast.activeDeals,
    language,
  ])

  return {
    insight,
    loading,
    error,
  }
}