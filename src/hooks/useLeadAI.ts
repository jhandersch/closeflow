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
            title: "Qualify lead",
            description: "Gather missing information and identify intent.",
            priority: "low",
            reason: "New lead needs qualification.",
            score: priority,
        });
    }
    if (lead.status === "contacted") {
        recommendations.push({
            icon: "MAIL",
            title: "Send follow-up",
            description: "Re-engage the customer.",
            priority: "medium",
            reason: "Lead has been contacted but not progressed.",
            score: priority,
        });
    }
    if (lead.status === "proposal") {
        recommendations.push({
            icon: "CALL",
            title: "Call customer today",
            description: "Address objections and close the deal.",
            priority: priority >= 75
                ? "high"
                : "medium",
            reason: "Proposal stage requires attention.",
            score: priority,
        });
    }
    const nextAction = staleDays > 7
        ? {
            icon: "ALERT",
            title: "Immediate follow-up required",
            action: "Contact customer today",
            description: "Lead has become inactive.",
            confidence: 92,
        }
        :
            lead.status === "proposal"
                ? {
                    icon: "CALL",
                    title: "Closing opportunity",
                    action: "Schedule closing call",
                    description: "Proposal stage shows buying intent.",
                    confidence: 87,
                }
                :
                    {
                        icon: "INFO",
                        title: "Continue nurturing",
                        action: "Maintain relationship",
                        description: "No urgent action required.",
                        confidence: 70,
                    };
    const aiInsight = generateAIInsight(lead);
    const aiRisk = staleDays > 14
        ? {
            level: "high",
            title: "Lead going cold",
            message: `No activity for ${staleDays} days.`,
            icon: "ALERT",
        }
        :
            {
                level: "low",
                title: "Healthy lead",
                message: "No major risks detected.",
                icon: "OK",
            };
    const scoreReasons = [];
    if (lead.value >= 10000) {
        scoreReasons.push({
            icon: "VALUE",
            text: "High deal value increases opportunity score",
        });
    }
    if (priority > 80) {
        scoreReasons.push({
            icon: "SIGNAL",
            text: "Strong overall opportunity signal",
        });
    }
    const aiCoach: AICoach = {
        title: lead.status === "proposal"
            ? "Closing opportunity"
            : priority > 80
                ? "High priority lead"
                : "Continue nurturing",
        message: lead.status === "proposal"
            ? "This lead is close to conversion."
            : "Lead is progressing normally.",
        reasons: [
            `Priority score: ${priority}`,
            `Current stage: ${lead.status}`,
        ],
        action: nextAction?.action ?? "Review lead",
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
