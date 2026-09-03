import { getPriorityScore, getHealthScore, getStaleDays } from "./scoring";
export function generateAIInsight(lead: any) {
    const priority = getPriorityScore(lead);
    const health = getHealthScore(lead);
    const stale = getStaleDays(lead);
    let risk = "Low";
    if (stale > 14) {
        risk = "High";
    }
    else if (stale > 7) {
        risk = "Medium";
    }
    let probability = 70;
    if (priority > 80) {
        probability += 15;
    }
    if (health < 50) {
        probability -= 20;
    }
    if (risk === "High") {
        probability -= 25;
    }
    return {
        score: priority,
        health,
        risk,
        probability: Math.max(10, Math.min(probability, 95)),
        recommendation: risk === "High"
            ? "Contact this customer immediately"
            :
                lead.status === "proposal"
                    ? "Schedule a closing call"
                    :
                        lead.status === "contacted"
                            ? "Send a follow-up message"
                            :
                                "Continue nurturing this lead"
    };
}
