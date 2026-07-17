"use client"

import AuthGuard from "@/components/AuthGuard"
import RevenueForecast from "@/components/dashboard/RevenueForecast"
import RevenueForecastAI from "@/components/dashboard/RevenueForecastAI"
import RevenueForecastChart from "@/components/dashboard/RevenueForecastChart"
import { useLeadsData } from "@/hooks/useLeadsData"
import { useRevenueForecastAI } from "@/hooks/useRevenueForecastAI"
import { calculateForecast } from "@/lib/forecast"
import { useAppPreferences } from "@/components/AppPreferencesProvider"

export default function ForecastPage() {
  const { language } = useAppPreferences()
  const isDe = language === "de"
  const locale = isDe ? "de-DE" : "en-US"
  const { leads } = useLeadsData({ activityLimit: 10 })
  const forecast = calculateForecast(leads)
  const { insight, loading: insightLoading } = useRevenueForecastAI(leads, forecast, language)

  const chartData = leads
    .reduce((acc, lead) => {
      const month = new Date(lead.created_at).toLocaleDateString(locale, { month: "short", year: "2-digit" })
      const weighted = Number(lead.value || 0) * ((Number(lead.probability || 0) || 0) / 100)
      acc.set(month, (acc.get(month) || 0) + weighted)
      return acc
    }, new Map<string, number>())

  const forecastSeries = Array.from(chartData.entries()).map(([month, value]) => ({ month, value }))

  return (
    <AuthGuard>
      <div className="space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-400">{isDe ? "Prognose" : "Forecast"}</p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">{isDe ? "Umsatzprognose" : "Revenue Forecast"}</h1>
          <p className="mt-2 text-sm text-foreground/65">{isDe ? "KI-basierter Ausblick auf erwarteten Umsatz, Risiko und Sicherheit." : "AI-based outlook for expected revenue, risk and confidence."}</p>
        </div>

        <RevenueForecast
          pipelineValue={forecast.pipelineValue}
          weightedRevenue={forecast.weightedRevenue}
          revenueAtRisk={forecast.revenueAtRisk}
        />
        <RevenueForecastChart data={forecastSeries} />
        <RevenueForecastAI insight={insight} loading={insightLoading} />
      </div>
    </AuthGuard>
  )
}
