import { getIntlLocale, type AppLanguage } from "@/lib/i18n";

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
export function generateDashboardInsight({ leads, forecast, proposalLeads, atRiskDeals, highValueDeals, }: InsightInput, language: AppLanguage): DashboardInsight {
    const isGerman = language === "de";
    const pipeline = activePipelineFormatter(forecast.pipelineValue, isGerman);
    const activeLeads = leads.filter((lead) => lead.status !== "won" &&
        lead.status !== "lost");
    const activePipeline = forecast.pipelineValue;
    const hasRisk = forecast.revenueAtRisk > 0 ||
        atRiskDeals > 0;
    const hasProposals = proposalLeads > 0;
    const hasHighValue = highValueDeals > 0;
    if (activeLeads.length === 0) {
        return {
            headline: isGerman ? "Keine aktiven Leads." : "No active opportunities.",
            detail: isGerman ? "Deine Pipeline enthält derzeit keine offenen Leads. Konzentriere dich auf neue Leads." : "Your pipeline currently has no open deals. Focus on creating new opportunities.",
            actions: isGerman ? [
                "Füge neue Leads hinzu, um die Pipeline wieder aufzubauen.",
                "Lege klare nächste Maßnahmen für neue Leads fest.",
            ] : [
                "Add new leads to rebuild the pipeline.",
                "Define clear next actions for new opportunities.",
            ],
            confidence: "High",
        };
    }
    if (hasRisk) {
        return {
            headline: isGerman ? "Mehrere Leads erfordern Aufmerksamkeit." : "Several opportunities need attention.",
            detail: isGerman ? `${atRiskDeals} aktive ${atRiskDeals === 1 ? "Lead weist" : "Leads weisen"} ein erhöhtes Risiko auf und erfordern möglicherweise eine zeitnahe Nachfassaktion.` : `${atRiskDeals} active ${atRiskDeals === 1 ? "deal shows" : "deals show"} elevated risk and may require immediate follow-up.`,
            actions: isGerman ? [
                `Prüfe die ${atRiskDeals} gefährdeten Leads.`,
                "Lege klare nächste Maßnahmen für alle aktiven Leads fest.",
                "Priorisiere wertvolle Leads, bei denen der nächste Schritt ansteht.",
            ] : [
                `Review ${atRiskDeals} at-risk ${atRiskDeals === 1 ? "deal" : "deals"}.`,
                "Define clear next actions for all active opportunities.",
                "Prioritize high-value opportunities that are close to advancing.",
            ],
            confidence: "High",
        };
    }
    if (hasProposals) {
        return {
            headline: isGerman ? "Bei Leads mit Angebot ist eine Nachfassaktion erforderlich." : "Proposal-stage opportunities need follow-up.",
            detail: isGerman ? `${proposalLeads} aktive ${proposalLeads === 1 ? "Lead befindet sich" : "Leads befinden sich"} bei einem Pipeline-Wert von ${pipeline} in der Angebotsphase. Die durchschnittliche Abschlusswahrscheinlichkeit beträgt ${forecast.averageProbability}%.` : `${proposalLeads} active ${proposalLeads === 1 ? "deal is" : "deals are"} currently in proposal stage within a €${activePipeline.toLocaleString(getIntlLocale())} active pipeline. Average close probability is ${forecast.averageProbability}%.`,
            actions: isGerman ? [
                `Fasse bei ${proposalLeads === 1 ? "dem Angebot" : "den Angeboten"} nach.`,
                "Lege die nächste Maßnahme und den erwarteten Abschlussschritt fest.",
                "Behalte den Fortschritt der Angebote im Blick.",
            ] : [
                `Follow up on the ${proposalLeads === 1 ? "proposal" : "proposals"}.`,
                "Define the next action and expected close step.",
                "Monitor proposal progression closely.",
            ],
            confidence: "High",
        };
    }
    if (hasHighValue) {
        return {
            headline: isGerman ? "Wertvolle Leads sind in der Pipeline." : "High-value opportunities are in the pipeline.",
            detail: isGerman ? `${highValueDeals} aktive ${highValueDeals === 1 ? "Lead überschreitet" : "Leads überschreiten"} 5.000 € und sollten gezielt nachverfolgt werden.` : `${highValueDeals} active ${highValueDeals === 1 ? "deal exceeds" : "deals exceed"} €5,000 and should receive focused follow-up.`,
            actions: isGerman ? [
                "Priorisiere die wertvollsten aktiven Leads.",
                "Lege für jeden priorisierten Lead konkrete nächste Maßnahmen fest.",
            ] : [
                "Prioritize the highest-value active opportunities.",
                "Define concrete next actions for each priority deal.",
            ],
            confidence: "Medium",
        };
    }
    return {
        headline: isGerman ? "Die Pipeline entwickelt sich stabil." : "Pipeline momentum is steady.",
        detail: isGerman ? `Deine Pipeline umfasst ${forecast.activeDeals} aktive Leads im Wert von ${pipeline}, bei einem durchschnittlichen Status von ${forecast.averageHealth}% und einer Abschlusswahrscheinlichkeit von ${forecast.averageProbability}%.` : `Your active pipeline contains ${forecast.activeDeals} ${forecast.activeDeals === 1
            ? "opportunity"
            : "opportunities"} worth €${activePipeline.toLocaleString(getIntlLocale())}, with ${forecast.averageHealth}% average health and ${forecast.averageProbability}% average close probability.`,
        actions: isGerman ? [
            "Führe aktive Leads zur nächsten Phase.",
            "Lege klare nächste Maßnahmen fest, um Inaktivität zu vermeiden.",
        ] : [
            "Keep active opportunities moving to the next stage.",
            "Define clear next actions to prevent inactivity.",
        ],
        confidence: "Medium",
    };
}
function activePipelineFormatter(value: number, isGerman: boolean) {
    return isGerman
        ? `${value.toLocaleString("de-DE")} €`
        : `€${value.toLocaleString("en-US")}`;
}
