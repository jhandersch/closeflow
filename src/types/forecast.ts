export type ForecastSummary = {
    pipelineValue: number;
    weightedRevenue: number;
    revenueAtRisk: number;
    commitRevenue: number;
    bestCaseRevenue: number;
    confidence: number;
    averageHealth: number;
    averageProbability: number;
    activeDeals: number;
    singleDealRisk: number;
};
export type RevenueForecastInsight = {
    confidence: number;
    health: "Excellent" | "Healthy" | "Warning" | "Critical";
    headline: string;
    summary: string;
    topDrivers: string[];
    risks: string[];
    recommendations: string[];
    pipelineComment: string;
    singleDealRisk: number;
};
