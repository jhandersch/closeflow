export type DashboardInsight = {
    headline: string;
    detail: string;
    actions: string[];
    confidence: "High" | "Medium" | "Low";
};
type InsightInput = {
    leads: Array<{
        status: string;
        value: number;
        notes?: string | null;
    }>;
    revenue: number;
    forecast: {
        pipelineValue: number;
        weightedRevenue: number;
        revenueAtRisk: number;
        commitRevenue: number;
        bestCaseRevenue: number;
        confidence: number;
        averageHealth: number;
        averageProbability: number;
        activeDeals: number;
    };
    proposalLeads: number;
    atRiskDeals: number;
    highValueDeals: number;
};
export function generateDashboardInsight({ leads, forecast, proposalLeads, atRiskDeals, highValueDeals, }: InsightInput): DashboardInsight {
    const activeLeads = leads.filter((lead) => lead.status !== "won" &&
        lead.status !== "lost");
    const activePipeline = forecast.pipelineValue;
    const hasRisk = forecast.revenueAtRisk > 0 ||
        atRiskDeals > 0;
    const hasProposals = proposalLeads > 0;
    const hasHighValue = highValueDeals > 0;
    if (activeLeads.length === 0) {
        return {
            headline: "No active opportunities.",
            detail: "Your pipeline currently has no open deals. Focus on creating new opportunities.",
            actions: [
                "Add new leads to rebuild the pipeline.",
                "Define clear next actions for new opportunities.",
            ],
            confidence: "High",
        };
    }
    if (hasRisk) {
        return {
            headline: "Several opportunities need attention.",
            detail: `${atRiskDeals} active ${atRiskDeals === 1 ? "deal shows" : "deals show"} elevated risk and may require immediate follow-up.`,
            actions: [
                `Review ${atRiskDeals} at-risk ${atRiskDeals === 1 ? "deal" : "deals"}.`,
                "Define clear next actions for all active opportunities.",
                "Prioritize high-value opportunities that are close to advancing.",
            ],
            confidence: "High",
        };
    }
    if (hasProposals) {
        return {
            headline: "Proposal-stage opportunities need follow-up.",
            detail: `${proposalLeads} active ${proposalLeads === 1 ? "deal is" : "deals are"} currently in proposal stage within a €${activePipeline.toLocaleString("en-US")} active pipeline. Average close probability is ${forecast.averageProbability}%.`,
            actions: [
                `Follow up on the ${proposalLeads === 1 ? "proposal" : "proposals"}.`,
                "Define the next action and expected close step.",
                "Monitor proposal progression closely.",
            ],
            confidence: "High",
        };
    }
    if (hasHighValue) {
        return {
            headline: "High-value opportunities are in the pipeline.",
            detail: `${highValueDeals} active ${highValueDeals === 1 ? "deal exceeds" : "deals exceed"} €5,000 and should receive focused follow-up.`,
            actions: [
                "Prioritize the highest-value active opportunities.",
                "Define concrete next actions for each priority deal.",
            ],
            confidence: "Medium",
        };
    }
    return {
        headline: "Pipeline momentum is steady.",
        detail: `Your active pipeline contains ${forecast.activeDeals} ${forecast.activeDeals === 1
            ? "opportunity"
            : "opportunities"} worth €${activePipeline.toLocaleString("en-US")}, with ${forecast.averageHealth}% average health and ${forecast.averageProbability}% average close probability.`,
        actions: [
            "Keep active opportunities moving to the next stage.",
            "Define clear next actions to prevent inactivity.",
        ],
        confidence: "Medium",
    };
}
