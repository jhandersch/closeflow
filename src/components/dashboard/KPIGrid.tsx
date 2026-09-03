import KpiCard from "@/components/dashboard/KpiCard";
import { useAppPreferences } from "@/components/AppPreferencesProvider";
type KPIGridProps = {
    totalLeads: number;
    pipelineValue: number;
    wonDeals: number;
    revenue: number;
    conversionRate: number;
    activitiesThisWeek: number;
    openTasks: number;
};
export default function KPIGrid({ totalLeads, pipelineValue, wonDeals, revenue, conversionRate, activitiesThisWeek, openTasks, }: KPIGridProps) {
    const { t, language } = useAppPreferences();
    const locale = "en-US";
    return (<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

      <KpiCard label={t("dashboard.totalLeads", "Total Leads")} value={totalLeads.toString()} hint={t("dashboard.activeOpportunities", "Active opportunities")}/>


      <KpiCard label={t("dashboard.pipelineValue", "Pipeline Value")} value={`€${pipelineValue.toLocaleString(locale)}`} hint={t("dashboard.totalOpenDealValue", "Total open deal value")} accent="amber"/>


      <KpiCard label={t("dashboard.wonDeals", "Won Deals")} value={wonDeals.toString()} hint={t("dashboard.closedWonCount", "Closed won opportunities")} accent="emerald"/>


      <KpiCard label={t("dashboard.revenueClosed", "Revenue Closed")} value={`€${revenue.toLocaleString(locale)}`} hint={t("dashboard.wonBusiness", "Won business")} accent="emerald"/>


      <KpiCard label={t("dashboard.conversionRate", "Conversion Rate")} value={`${conversionRate}%`} hint={t("dashboard.wonVsClosed", "Won vs closed opportunities")} accent="cyan"/>


      <KpiCard label={t("dashboard.activitiesThisWeek", "Activities This Week")} value={activitiesThisWeek.toString()} hint={t("dashboard.activityVolumeHint", "All logged actions over 7 days")} accent="purple"/>


      <KpiCard label={t("dashboard.openTasks", "Open Tasks")} value={openTasks.toString()} hint={t("dashboard.tasksPending", "Tasks pending completion")} accent="red"/>

    </div>);
}
