"use client";
import AuthGuard from "@/components/AuthGuard";
import RevenueCard from "@/components/dashboard/RevenueCard";
import WinRateCard from "@/components/dashboard/WinRateCard";
import RevenueChart from "@/components/dashboard/RevenueChart";
import PipelineChart from "@/components/dashboard/PipelineChart";
import LeadAnalyticsExplorer from "@/components/dashboard/LeadAnalyticsExplorer";
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";
import { useLeadsData } from "@/hooks/useLeadsData";
import { useRecentRevenueEvents } from "@/hooks/useRecentRevenueEvents";
function MetricCard({ label, value, hint }: {
    label: string;
    value: string;
    hint: string;
}) {
    return (<div className="rounded-2xl border border-border-subtle bg-surface-1 p-5">
      <p className="text-xs uppercase tracking-[0.25em] text-foreground/55">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-foreground">{value}</p>
      <p className="mt-2 text-sm text-foreground/60">{hint}</p>
    </div>);
}
export default function AnalyticsPage() {
    const locale = "en-US";
    const { leads, loading } = useLeadsData({ activityLimit: 5, includeCompleted: true });
    const metrics = useDashboardMetrics(leads);
    const revenueHistory = useRecentRevenueEvents();
    const customerCount = new Set(leads
      .filter((lead) => lead.status === "won" || lead.status === "lost")
      .map((lead) => lead.company?.trim().toLowerCase() || `private:${lead.id}`)).size;
    if (loading) {
        return <AuthGuard><div className="text-foreground">{"Loading..."}</div></AuthGuard>;
    }
    return (<AuthGuard>
      <div className="space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-cyan-400">{"Analytics"}</p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">{"Track performance across your pipeline"}</h1>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label={"Active Leads"} value={metrics.total.toString()} hint={"Open opportunities"}/>
          <MetricCard label={"Customers"} value={customerCount.toString()} hint={"Accounts with won or lost deals"}/>
          <MetricCard label={"Revenue"} value={`€${metrics.revenue.toLocaleString(locale)}`} hint={"Won revenue"}/>
          <MetricCard label={"Conversion Rate"} value={`${metrics.conversionRate}%`} hint={"Won / won + lost"}/>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <RevenueCard pipelineValue={metrics.pipelineValue}/>
          <WinRateCard winRate={Number(metrics.winRate)}/>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <RevenueChart data={revenueHistory}/>
          <PipelineChart data={metrics.statusChartData}/>
        </div>

        <LeadAnalyticsExplorer leads={leads}/>
      </div>
    </AuthGuard>);
}
