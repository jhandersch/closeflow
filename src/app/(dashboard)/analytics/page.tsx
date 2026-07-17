"use client"

import AuthGuard from "@/components/AuthGuard"
import AIInsightCard from "@/components/dashboard/AIInsightCard"
import RevenueCard from "@/components/dashboard/RevenueCard"
import WinRateCard from "@/components/dashboard/WinRateCard"
import RevenueChart from "@/components/dashboard/RevenueChart"
import PipelineChart from "@/components/dashboard/PipelineChart"
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics"
import { useLeadsData } from "@/hooks/useLeadsData"
import { useAppPreferences } from "@/components/AppPreferencesProvider"

function MetricCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-1 p-5">
      <p className="text-xs uppercase tracking-[0.25em] text-foreground/55">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-foreground">{value}</p>
      <p className="mt-2 text-sm text-foreground/60">{hint}</p>
    </div>
  )
}

export default function AnalyticsPage() {
  const { language } = useAppPreferences()
  const isDe = language === "de"
  const locale = isDe ? "de-DE" : "en-US"

  const { leads, loading } = useLeadsData({ activityLimit: 5 })
  const metrics = useDashboardMetrics(leads)

  if (loading) {
    return <AuthGuard><div className="text-foreground">{isDe ? "Lade..." : "Loading..."}</div></AuthGuard>
  }

  return (
    <AuthGuard>
      <div className="space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-cyan-400">{isDe ? "Analysen" : "Analytics"}</p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">{isDe ? "Sales-Metriken" : "Sales Metrics"}</h1>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label={isDe ? "Leads gesamt" : "Total Leads"} value={metrics.total.toString()} hint={isDe ? "Alle Leads im Workspace" : "All leads in the workspace"} />
          <MetricCard label={isDe ? "Gewonnene Deals" : "Won Deals"} value={metrics.won.toString()} hint={isDe ? "Abgeschlossene Opportunities" : "Closed opportunities"} />
          <MetricCard label={isDe ? "Umsatz" : "Revenue"} value={`€${metrics.revenue.toLocaleString(locale)}`} hint={isDe ? "Gewonnener Umsatz" : "Won revenue"} />
          <MetricCard label={isDe ? "Conversion Rate" : "Conversion Rate"} value={`${metrics.conversionRate}%`} hint={isDe ? "Gewonnen / gewonnen+verloren" : "Won / won+lost"} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <RevenueCard pipelineValue={metrics.pipelineValue} />
          <WinRateCard winRate={Number(metrics.winRate)} />
        </div>

        <AIInsightCard
          insight={{
            headline: isDe ? "KI-Empfehlung" : "AI Recommendation",
            detail: isDe ? "Fokussiere 3 hochwertige Angebote" : "Focus on 3 high-value proposals",
            actions: isDe
              ? ["Angebots-Follow-ups priorisieren", "Gefährdete Deals heute anrufen", "Pipeline-Blocker prüfen"]
              : ["Prioritize proposal follow-ups", "Call at-risk deals today", "Review pipeline blockers"],
            confidence: "High",
          }}
        />

        <div className="grid gap-6 xl:grid-cols-2">
          <RevenueChart data={metrics.forecastTrend} />
          <PipelineChart data={metrics.statusChartData} />
        </div>
      </div>
    </AuthGuard>
  )
}