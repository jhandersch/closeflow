import { useMemo } from "react";
import { generateDashboardInsight } from "@/lib/openai";
import { analyzeLead, getHealthScore } from "@/lib/scoring";
import type { Lead } from "@/types";
import { calculateForecast } from "@/lib/forecast";
const stageOrder = [
    "new",
    "contacted",
    "proposal",
    "won",
    "lost",
] as const;
export function useDashboardMetrics(leads: Lead[]) {
    return useMemo(() => {
        /*
         * BASIC METRICS
         */
        const openLeads = leads.filter((lead) => lead.status === "new" ||
            lead.status === "contacted" ||
            lead.status === "proposal");
        const total = openLeads.length;
        const won = leads.filter((lead) => lead.status === "won").length;
        const lost = leads.filter((lead) => lead.status === "lost").length;
        const wonOrLost = won + lost;
        /*
         * REALIZED REVENUE
         */
        const revenue = leads
            .filter((lead) => lead.status === "won")
            .reduce((sum, lead) => sum + (lead.value || 0), 0);
        /*
         * OPEN PIPELINE
         */
        const pipelineValue = openLeads.reduce((sum, lead) => sum + (lead.value || 0), 0);
        const openPipeline = openLeads.length;
        /*
         * WEIGHTED FORECAST
         */
        const forecastData = calculateForecast(leads);
        const forecast = forecastData;
        const forecastTrend = forecastData.monthlyForecast.map((item) => ({
            month: item.month,
            value: Math.round(item.value),
        }));
        /*
         * PIPELINE DATA
         */
        const proposalLeads = leads.filter((lead) => lead.status === "proposal");
        const contactedLeads = leads.filter((lead) => lead.status === "contacted");
        const highValueDeals = openLeads.filter((lead) => (lead.value || 0) >= 5000);
        /*
         * HEALTH / RISK
         *
         * Scoped to active (open) deals only, so
         * this stays consistent with RevenueForecast's
         * active-deal health/probability averages.
         */
        const atRiskDeals = openLeads
            .filter((lead) => getHealthScore(lead) < 50)
            .sort((a, b) => (b.value || 0) -
            (a.value || 0));
        const healthyLeadCount = openLeads.filter((lead) => getHealthScore(lead) >= 70).length;
        const watchlistCount = Math.max(0, openPipeline -
            healthyLeadCount -
            atRiskDeals.length);
        /*
         * PRIORITY DEALS
         */
        const priorityDeals = [...openLeads]
            .map((lead) => ({
            ...lead,
            analysis: analyzeLead(lead),
        }))
            .sort((a, b) => b.analysis.priority -
            a.analysis.priority)
            .slice(0, 4);
        /*
         * STAGE COUNTS
         */
        const stageCounts = stageOrder.map((stage) => ({
            stage,
            count: leads.filter((lead) => lead.status === stage).length,
            value: leads
                .filter((lead) => lead.status === stage)
                .reduce((sum, lead) => sum + (lead.value || 0), 0),
        }));
        /*
         * MONTH BUCKETS
         */
        /*
       * WON DEALS
       */
        const wonLeads = leads.filter((lead) => lead.status === "won");
        /*
         * DEAL VALUE
         */
        const averageDealValue = won > 0
            ? Math.round(revenue / won)
            : openPipeline > 0
                ? Math.round(pipelineValue / openPipeline)
                : 0;
        /*
         * SALES CYCLE
         */
        const wonCycleDays = wonLeads.map((lead) => {
            const created = new Date(lead.created_at).getTime();
            const closed = new Date(lead.stage_changed_at ||
                lead.updated_at ||
                lead.created_at).getTime();
            return Math.max(0, Math.round((closed - created) /
                (1000 * 60 * 60 * 24)));
        });
        const averageSalesCycle = wonCycleDays.length > 0
            ? Math.round(wonCycleDays.reduce((a, b) => a + b, 0) / wonCycleDays.length)
            : 0;
        /*
         * CONVERSION
         */
        const conversionRate = wonOrLost > 0
            ? Number(((won / wonOrLost) *
                100).toFixed(1))
            : 0;
        /*
         * PIPELINE COVERAGE
         */
        const pipelineCoverage = revenue > 0
            ? Number((pipelineValue / revenue).toFixed(1))
            : 0;
        /*
         * DASHBOARD AI INSIGHT
         */
        const insight = generateDashboardInsight({
            leads,
            revenue,
            forecast: forecast,
            proposalLeads: proposalLeads.length,
            atRiskDeals: atRiskDeals.length,
            highValueDeals: highValueDeals.length,
        });
        /*
       * =========================
       * SINGLE DEAL CONCENTRATION
       * =========================
       *
       * Measures how dependent the
       * active pipeline is on its
       * largest opportunity.
       */
        let largestActiveDeal = 0;
        for (const lead of leads) {
            if (lead.status === "won" ||
                lead.status === "lost") {
                continue;
            }
            const value = Number(lead.value || 0);
            if (value > largestActiveDeal) {
                largestActiveDeal = value;
            }
        }
        const singleDealRisk = pipelineValue > 0
            ? Math.round((largestActiveDeal /
                pipelineValue) *
                100)
            : 0;
        /*
         * RETURN
         */
        return {
            total,
            won,
            lost,
            pipelineValue,
            openPipeline,
            revenue,
            /*
            * Weighted forecast value.
            * The complete canonical forecast is available
            * through forecastData.
            */
            forecast,
            forecastData,
            proposalLeads,
            contactedLeads,
            highValueDeals,
            atRiskDeals,
            healthyLeadCount,
            watchlistCount,
            priorityDeals,
            /*
             * Forecast chart
             */
            forecastTrend,
            singleDealRisk,
            /*
             * Pipeline chart
             */
            statusChartData: [
                {
                    name: "New",
                    value: leads.filter((lead) => lead.status === "new").length,
                },
                {
                    name: "Contacted",
                    value: contactedLeads.length,
                },
                {
                    name: "Proposal",
                    value: proposalLeads.length,
                },
                {
                    name: "Won",
                    value: won,
                },
                {
                    name: "Lost",
                    value: lost,
                },
            ],
            winRate: wonOrLost > 0
                ? ((won / wonOrLost) *
                    100).toFixed(1)
                : "0",
            conversionRate,
            wonLostLabel: `${won}/${lost}`,
            averageDealValue,
            averageSalesCycle,
            pipelineCoverage,
            forecastDelta: Math.max(0, Math.round(forecast.weightedRevenue -
                revenue)),
            stageCounts,
            insight,
            currentMonthRevenue: forecastData.monthlyForecast[forecastData.monthlyForecast.length - 1]?.value || 0,
        };
    }, [leads]);
}
