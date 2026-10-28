import { getIntlLocale, translateText } from "@/lib/i18n";
import { getPriorityScore, getStaleDays, } from "@/lib/scoring";
import { generateAIInsight, } from "@/lib/ai";
type AICoach = {
    title: string;
    message: string;
    reasons: string[];
    action: string;
    confidence: number;
};
type NextAction = {
    icon: string;
    title: string;
    action: string;
    description: string;
    confidence: number;
};
type LeadAIResult = {
    recommendations: any[];
    nextAction: NextAction | null;
    aiCoach: AICoach | null;
    aiRisk: any;
    scoreReasons: any[];
    aiInsight: any;
};
export function useLeadAI(lead: any): LeadAIResult {
    if (!lead) {
        return {
            recommendations: [],
            nextAction: null,
            aiCoach: null,
            aiRisk: null,
            scoreReasons: [],
            aiInsight: null,
        };
    }
    const priority = getPriorityScore(lead);
    const staleDays = getStaleDays(lead);
    const recommendations: any[] = [];
    if (lead.status === "new") {
        recommendations.push({
            icon: "AI",
            title: translateText("Qualify lead"),
            description: translateText("Gather missing information and identify intent."),
            priority: "low",
            reason: translateText("New lead needs qualification."),
            score: priority,
        });
    }
    if (lead.status === "contacted") {
        recommendations.push({
            icon: "MAIL",
            title: translateText("Send follow-up"),
            description: translateText("Re-engage the customer."),
            priority: "medium",
            reason: translateText("Lead has been contacted but not progressed."),
            score: priority,
        });
    }
    if (lead.status === "proposal") {
        recommendations.push({
            icon: "CALL",
            title: translateText("Call customer today"),
            description: translateText("Address objections and close the deal."),
            priority: priority >= 75
                ? "high"
                : "medium",
            reason: translateText("Proposal stage requires attention."),
            score: priority,
        });
    }
    const nextAction = staleDays > 7
        ? {
            icon: "ALERT",
            title: translateText("Immediate follow-up required"),
            action: translateText("Contact customer today"),
            description: translateText("Lead has become inactive."),
            confidence: 92,
        }
        :
            lead.status === "proposal"
                ? {
                    icon: "CALL",
                    title: translateText("Closing opportunity"),
                    action: translateText("Schedule closing call"),
                    description: translateText("Proposal stage shows buying intent."),
                    confidence: 87,
                }
                :
                    {
                        icon: "INFO",
                        title: translateText("Continue nurturing"),
                        action: translateText("Maintain relationship"),
                        description: translateText("No urgent action required."),
                        confidence: 70,
                    };
    const aiInsight = generateAIInsight(lead);
    aiInsight.recommendation = translateText(aiInsight.recommendation);
    aiInsight.risk = translateText(aiInsight.risk);
    const aiRisk = staleDays > 14
        ? {
            level: "high",
            title: translateText("Lead going cold"),
            message: getIntlLocale() === "de-DE" ? `Seit ${staleDays} Tagen keine Aktivität.` : `No activity for ${staleDays} days.`,
            icon: "ALERT",
        }
        :
            {
                level: "low",
                title: translateText("Healthy lead"),
                message: translateText("No major risks detected."),
                icon: "OK",
            };
    const scoreReasons = [];
    if (lead.value >= 10000) {
        scoreReasons.push({
            icon: "VALUE",
            text: translateText("High deal value increases opportunity score"),
        });
    }
    if (priority > 80) {
        scoreReasons.push({
            icon: "SIGNAL",
            text: translateText("Strong overall opportunity signal"),
        });
    }
    const aiCoach: AICoach = {
        title: lead.status === "proposal"
            ? translateText("Closing opportunity")
            : priority > 80
                ? translateText("High priority lead")
                : translateText("Continue nurturing"),
        message: lead.status === "proposal"
            ? translateText("This lead is close to conversion.")
            : translateText("Lead is progressing normally."),
        reasons: [
            `${translateText("Priority score:")} ${priority}`,
            `${translateText("Current stage:")} ${translateText(lead.status)}`,
        ],
        action: nextAction?.action ?? translateText("Review lead"),
        confidence: nextAction?.confidence ?? 70,
    };
    return {
        recommendations,
        nextAction,
        aiInsight,
        aiRisk,
        scoreReasons,
        aiCoach,
    };
}
