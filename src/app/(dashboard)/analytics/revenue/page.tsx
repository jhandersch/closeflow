"use client"

import { useEffect, useMemo, useState } from "react"
import AuthGuard from "@/components/AuthGuard"
import RevenueChart from "@/components/dashboard/RevenueChart"
import PipelineChart from "@/components/dashboard/PipelineChart"
import { supabase } from "@/lib/supabase/client"
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics"
import { useLeadsData } from "@/hooks/useLeadsData"
import { useAppPreferences } from "@/components/AppPreferencesProvider"

export default function RevenueAnalyticsPage() {
  const { language } = useAppPreferences()
  const isDe = language === "de"
  const locale = isDe ? "de-DE" : "en-US"

  const { leads, loading } = useLeadsData({ activityLimit: 5, includeCompleted: true })
  const metrics = useDashboardMetrics(leads)
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [revenueEvents, setRevenueEvents] = useState<Array<{ month: string; value: number }>>([])

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      if (!workspaceId) {
        const workspacesResponse = await fetch("/api/workspaces")
        if (!workspacesResponse.ok) return
        const bundles = (await workspacesResponse.json()) as Array<{ workspace: { id: string } }>
        setWorkspaceId(bundles[0]?.workspace.id || null)
        return
      }

      const { data } = await supabase.from("revenue_events").select("amount, created_at, type").eq("workspace_id", workspaceId)
      const buckets = new Map<string, number>()
      for (const event of data || []) {
        const month = new Date(event.created_at).toLocaleDateString(locale, { month: "short", year: "2-digit" })
        buckets.set(month, (buckets.get(month) || 0) + Number(event.amount || 0))
      }
      setRevenueEvents(Array.from(buckets.entries()).map(([month, value]) => ({ month, value })))
    }

    void load()
  }, [locale, workspaceId])

  const wonLost = useMemo(() => [
    { name: "New", value: metrics.statusChartData.find((item) => item.name === "New")?.value || 0 },
    { name: "Contacted", value: metrics.statusChartData.find((item) => item.name === "Contacted")?.value || 0 },
    { name: "Proposal", value: metrics.statusChartData.find((item) => item.name === "Proposal")?.value || 0 },
    { name: "Won", value: metrics.statusChartData.find((item) => item.name === "Won")?.value || 0 },
  ], [metrics.statusChartData])

  if (loading) {
    return <AuthGuard><div className="text-foreground">{isDe ? "Umsatz-Analytics werden geladen..." : "Loading revenue analytics..."}</div></AuthGuard>
  }

  return (
    <AuthGuard>
      <div className="space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-cyan-400">{isDe ? "Umsatz-Analysen" : "Revenue Analytics"}</p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">{isDe ? "Umsatz über die Zeit" : "Revenue over time"}</h1>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card label={isDe ? "Umsatz" : "Revenue"} value={`€${metrics.revenue.toLocaleString(locale)}`} />
          <Card label={isDe ? "Durchschnittlicher Deal" : "Average deal size"} value={`€${metrics.averageDealValue.toLocaleString(locale)}`} />
          <Card label={isDe ? "Sales-Zyklus" : "Sales cycle"} value={`${metrics.averageSalesCycle} ${isDe ? "Tage" : "days"}`} />
          <Card label={isDe ? "Conversion" : "Conversion"} value={`${metrics.conversionRate}%`} />
        </div>

        <RevenueChart data={revenueEvents} />
        <PipelineChart data={wonLost} />
      </div>
    </AuthGuard>
  )
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-1 p-5">
      <p className="text-xs uppercase tracking-[0.25em] text-foreground/55">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  )
}
