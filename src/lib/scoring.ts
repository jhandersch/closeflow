import type { Lead } from "@/types";
import { calculateSalesScore } from "@/lib/salesScore";
export function getStaleDays(lead: Lead) {
    const base = lead.stage_changed_at ||
        lead.created_at;
    const diff = Date.now() -
        new Date(base).getTime();
    return Math.max(0, Math.floor(diff /
        (1000 * 60 * 60 * 24)));
}
/*
  ZENTRALES SCORING

  Alle Scores kommen aus
  calculateSalesScore().
*/
export function getPriorityScore(lead: Lead) {
    const staleDays = getStaleDays(lead);
    return calculateSalesScore(lead, staleDays).priority;
}
export function getHealthScore(lead: Lead) {
    const staleDays = getStaleDays(lead);
    return calculateSalesScore(lead, staleDays).health;
}
export function getCloseProbability(lead: Lead) {
    const staleDays = getStaleDays(lead);
    return calculateSalesScore(lead, staleDays).probability;
}
/*
  KOMPLETTE ANALYSE
*/
export type LeadAnalysis = {
    priority: number;
    health: number;
    urgency: "Low" | "Medium" | "High";
    reasons: string[];
    probability: number;
};
export function analyzeLead(lead: Lead): LeadAnalysis {
    const staleDays = getStaleDays(lead);
    const score = calculateSalesScore(lead, staleDays);
    const reasons: string[] = [];
    /*
      PIPELINE STAGE
    */
    if (lead.status === "proposal") {
        reasons.push("Lead befindet sich in der Angebotsphase.");
    }
    if (lead.status === "contacted") {
        reasons.push("The lead was contacted but has not progressed further.");
    }
    if (lead.status === "new") {
        reasons.push("Lead muss noch qualifiziert werden.");
    }
    /*
      DEAL VALUE
    */
    if ((lead.value || 0) >= 10000) {
        reasons.push("Hoher Deal-Wert.");
    }
    else if ((lead.value || 0) >= 5000) {
        reasons.push("Above-average deal value.");
    }
    /*
      INACTIVITY
    */
    if (staleDays > 14) {
        reasons.push(`No activity for ${staleDays} days.`);
    }
    else if (staleDays > 7) {
        reasons.push(`Lead war ${staleDays} Tage inactive.`);
    }
    else if (staleDays > 3) {
        reasons.push(`Lead war ${staleDays} Tage inactive.`);
    }
    /*
      URGENCY
    */
    let urgency: "Low" | "Medium" | "High" = "Low";
    if (score.priority >= 80 ||
        score.probability >= 80) {
        urgency = "High";
    }
    else if (score.priority >= 50 ||
        score.probability >= 55) {
        urgency = "Medium";
    }
    return {
        priority: score.priority,
        health: score.health,
        urgency,
        reasons,
        probability: score.probability,
    };
}
