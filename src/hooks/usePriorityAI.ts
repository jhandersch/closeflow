"use client";
import { translateText } from "@/lib/i18n";


import { useEffect, useState } from "react";
import { leadDisplayName, leadCompany } from "@/lib/utils";
import {
  analyzeLead,
  getHealthScore,
  getPriorityScore,
  getCloseProbability,
} from "@/lib/scoring";
import { useAppPreferences } from "@/components/AppPreferencesProvider";

type PriorityAIResult = {
  headline: string;
  explanation: string;
  nextAction: string;
  priorityReason: string;
  riskLevel: "Low" | "Medium" | "High";
};

export function usePriorityAI(
  leads: any[],
  ..._args: string[]
) {
  const { language } = useAppPreferences();
  const [data, setData] = useState<PriorityAIResult>({
    headline: "",
    explanation: "",
    nextAction: "",
    priorityReason: "",
    riskLevel: "Medium",
  });

  useEffect(() => {
    if (!leads.length) {
      setData({
        headline: translateText("No priorities available"),
        explanation: translateText("Add leads to receive AI recommendations."),
        nextAction: translateText("Create new opportunities."),
        priorityReason: translateText("No data available."),
        riskLevel: "Low",
      });
      return;
    }

    async function generate() {
      try {
        const scoredLeads = leads
          .filter(
            (lead) =>
              lead.status !== "won" &&
              lead.status !== "lost",
          )
          .map((lead) => ({
            ...lead,
            priority: getPriorityScore(lead),
            health: getHealthScore(lead),
            probability: getCloseProbability(lead),
            analysis: analyzeLead(lead),
          }))
          .sort((a, b) => b.priority - a.priority)
          .slice(0, 4);

        const response = await fetch("/api/priority-ai", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            language,
            leads: scoredLeads.map((lead) => ({
              id: lead.id,
              name: leadDisplayName(lead),
              company: leadCompany(lead),
              status: lead.status,
              value: lead.value,
              priority: lead.priority,
              health: lead.health,
              probability: lead.probability,
              urgency: lead.analysis.urgency,
              reasons: lead.analysis.reasons,
              created_at: lead.created_at,
              stage_changed_at: lead.stage_changed_at,
              notes: lead.notes ?? "",
              next_action: lead.next_action ?? null,
            })),
          }),
        });

        if (!response.ok) {
          throw new Error(translateText("Priority AI request failed"));
        }

        const result = await response.json();

        setData({
          headline: result.headline ?? "",
          explanation: result.explanation ?? "",
          nextAction: result.nextAction ?? "",
          priorityReason: result.priorityReason ?? "",
          riskLevel: result.riskLevel ?? "Medium",
        });
      } catch (error) {
        console.error("Priority AI error:", error);

        const highest = leads
          .filter(
            (lead) =>
              lead.status !== "won" &&
              lead.status !== "lost",
          )
          .sort(
            (a, b) =>
              getPriorityScore(b) -
              getPriorityScore(a),
          )[0];

        setData({
          headline: highest
            ? language === "de" ? `${leadDisplayName(highest)} benötigt Aufmerksamkeit` : `${leadDisplayName(highest)} needs attention`
            : translateText("AI analysis unavailable"),

          explanation: highest
            ? translateText("This opportunity was prioritized using value, stage and activity signals.")
            : translateText("Unable to analyze opportunities right now."),

          nextAction:
            highest?.next_action ??
            translateText("Review your highest-value deals manually."),

          priorityReason: highest
            ? analyzeLead(highest).reasons.map((reason) => {
                const inactive = reason.match(/^No activity for (\d+) days\.$/);
                return inactive && language === "de"
                  ? `Seit ${inactive[1]} Tagen keine Aktivität.`
                  : translateText(reason);
              }).join(" ")
            : translateText("No AI data available."),

          riskLevel: highest
            ? getHealthScore(highest) < 50
              ? "High"
              : getHealthScore(highest) < 70
                ? "Medium"
                : "Low"
            : "Medium",
        });
      }
    }

    void generate();
  }, [leads, language]);

  return data;
}
