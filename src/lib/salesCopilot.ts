import type { Lead } from "@/types";
import { analyzeLead, getHealthScore, } from "@/lib/scoring";
export function generateSalesCopilot(leads: Lead[], forecast: number, revenue: number) {
    const analyzed = leads
        .filter(lead => lead.status !== "won" &&
        lead.status !== "lost")
        .map(lead => ({
        lead,
        analysis: analyzeLead(lead)
    }))
        .sort((a, b) => b.analysis.priority -
        a.analysis.priority);
    const urgentActions = analyzed
        .slice(0, 5)
        .map(item => ({
        leadId: item.lead.id,
        leadName: item.lead.name,
        company: item.lead.company,
        reason: item.analysis.reasons.join(" "),
        action: item.analysis.urgency === "High"
            ? "Contact immediately"
            : "Schedule follow-up",
        priority: item.analysis.urgency
    }));
    const averageHealth = leads.length
        ? Math.round(leads.reduce((sum, lead) => sum +
            getHealthScore(lead), 0)
            /
                leads.length)
        : 0;
    return {
        headline: averageHealth >= 70
            ? "Pipeline is healthy"
            : "Pipeline needs attention",
        summary: `Your pipeline health score is ${averageHealth}/100.`,
        urgentActions,
        pipelineHealth: {
            score: averageHealth,
            status: averageHealth >= 70
                ? "Healthy"
                : averageHealth >= 40
                    ? "Warning"
                    : "Critical",
            explanation: "Calculated from activity, deal value and pipeline movement."
        },
        forecast: {
            value: forecast,
            explanation: `Expected revenue is ${Math.round(forecast - revenue)}€ above closed revenue.`
        }
    };
}
