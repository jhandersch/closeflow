"use client";
import { useEffect, useState } from "react";
import { getHealthScore, getCloseProbability, analyzeLead, } from "@/lib/scoring";
import type { Lead } from "@/types";
import type { ForecastSummary } from "@/types/forecast";
type ForecastAI = {
    summary: string;
    positiveFactors: string[];
    risks: string[];
    recommendation: string;
};
export function useForecastAI(forecast: ForecastSummary, leads: Lead[], language: "en" = "en") {
    const [analysis, setAnalysis] = useState<ForecastAI | null>(null);
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        if (!leads.length) {
            setAnalysis(null);
            setLoading(false);
            return;
        }
        let active = true;
        async function generate() {
            setLoading(true);
            try {
                /*
                 * The forecast must not filter out all
                 * leads.
                 *
                 * Won/lost deals can remain relevant
                 * for analysis.
                 */
                const analyzedLeads = leads
                    .map((lead) => ({
                    id: lead.id,
                    name: lead.name,
                    company: lead.company,
                    status: lead.status,
                    value: Number(lead.value || 0),
                    health: getHealthScore(lead),
                    probability: getCloseProbability(lead),
                    analysis: analyzeLead(lead),
                    created_at: lead.created_at,
                    stage_changed_at: lead.stage_changed_at,
                    notes: lead.notes ?? "",
                    next_action: lead.next_action ?? null,
                }))
                    .sort((a, b) => b.value - a.value)
                    .slice(0, 20);
                /*
                 * API request
                 *
                 * Send the canonical calculateForecast()
                 * output as-is so the AI sees the exact
                 * same numbers shown in the UI.
                 */
                const res = await fetch("/api/revenue-forecast-ai", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        language,
                        forecast,
                        leads: analyzedLeads,
                    }),
                });
                if (!res.ok) {
                    const errorText = await res.text();
                    console.error("FORECAST API ERROR:", errorText);
                    throw new Error(errorText ||
                        "Forecast API request failed");
                }
                const data = await res.json();
                if (!active) {
                    return;
                }
                /*
                 * API response:
                 *
                 * topDrivers
                 * risks
                 * recommendations
                 * pipelineComment
                 */
                setAnalysis({
                    summary: data.summary ??
                        data.pipelineComment ??
                        "",
                    positiveFactors: Array.isArray(data.topDrivers)
                        ? data.topDrivers
                        : [],
                    risks: Array.isArray(data.risks)
                        ? data.risks
                        : [],
                    recommendation: Array.isArray(data.recommendations)
                        ? data.recommendations.join(" ")
                        : data.pipelineComment ??
                            "",
                });
            }
            catch (error) {
                console.error("FORECAST AI ERROR:", error);
                if (!active) {
                    return;
                }
                setAnalysis({
                    summary: "Forecast analysis unavailable.",
                    positiveFactors: [],
                    risks: [
                        "The AI forecast analysis could not be generated.",
                    ],
                    recommendation: "Review the pipeline manually and prioritize the largest open deals.",
                });
            }
            finally {
                if (active) {
                    setLoading(false);
                }
            }
        }
        void generate();
        return () => {
            active = false;
        };
    }, [
        language,
        forecast.pipelineValue,
        forecast.weightedRevenue,
        forecast.revenueAtRisk,
        forecast.commitRevenue,
        forecast.bestCaseRevenue,
        forecast.confidence,
        forecast.averageHealth,
        forecast.averageProbability,
        forecast.activeDeals,
        leads,
    ]);
    return {
        analysis,
        loading,
    };
}
