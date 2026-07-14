import KpiCard from "@/components/dashboard/KpiCard"
import { useAppPreferences } from "@/components/AppPreferencesProvider"

type KPIGridProps = {
  total: number
  openPipeline: number
  pipelineValue: number
  revenue: number
  winRate: string
  conversionRate: number
  wonLostLabel: string
  averageDealValue: number
  averageSalesCycle: number
  atRiskDeals: number
}

export default function KPIGrid({
  total,
  openPipeline,
  pipelineValue,
  revenue,
  winRate,
  conversionRate,
  wonLostLabel,
  averageDealValue,
  averageSalesCycle,
  atRiskDeals,
}: KPIGridProps) {
  const { t } = useAppPreferences()

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

      <KpiCard
        label={t("dashboard.totalLeads", "Total Leads")}
        value={total.toString()}
        hint={t("dashboard.activeOpportunities", "Active opportunities")}
      />


      <KpiCard
        label={t("dashboard.pipelineValue", "Pipeline Value")}
        value={`€${pipelineValue.toLocaleString("de-DE")}`}
        hint={`${openPipeline} ${t(
          "dashboard.dealsInProgress",
          "deals in progress"
        )}`}
        accent="amber"
      />


      <KpiCard
        label={t("dashboard.revenueClosed", "Revenue Closed")}
        value={`€${revenue.toLocaleString("de-DE")}`}
        hint={t("dashboard.wonBusiness", "Won business")}
        accent="emerald"
      />


      <KpiCard
        label={t("dashboard.winRate", "Win Rate")}
        value={`${winRate}%`}
        hint={`${wonLostLabel} ${t(
          "dashboard.wonLost",
          "won/lost"
        )} | ${conversionRate}% ${t(
          "dashboard.conversion",
          "conversion"
        )}`}
        accent="cyan"
      />


      <KpiCard
        label={t("dashboard.averageDeal", "Average Deal")}
        value={`€${averageDealValue.toLocaleString("de-DE")}`}
        hint={t(
          "dashboard.averageOpportunitySize",
          "Average opportunity size"
        )}
        accent="purple"
      />


      <KpiCard
        label={t("dashboard.salesCycle", "Sales Cycle")}
        value={`${averageSalesCycle} days`}
        hint={t(
          "dashboard.averageClosingTime",
          "Average closing time"
        )}
        accent="blue"
      />


      <KpiCard
        label={t(
          "dashboard.attentionNeeded",
          "Attention Needed"
        )}
        value={atRiskDeals.toString()}
        hint={t(
          "dashboard.dealsLosingMomentum",
          "Deals losing momentum"
        )}
        accent="red"
      />


      <KpiCard
        label={t("dashboard.forecast", "Forecast")}
        value={`€${pipelineValue.toLocaleString("de-DE")}`}
        hint={t(
          "dashboard.expectedPipeline",
          "Expected pipeline"
        )}
        accent="emerald"
      />

    </div>
  )
}