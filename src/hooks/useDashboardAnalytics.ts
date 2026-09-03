"use client";
import { useMemo } from "react";
import { calculateSalesScore } from "@/lib/salesScore";
import { getStaleDays } from "@/lib/scoring";
import type { Lead } from "@/types/lead";
export function useDashboardAnalytics(leads: Lead[]) {
    return useMemo(() => {
        const activeLeads = leads.filter((lead) => lead.status !== "won" &&
            lead.status !== "lost");
        const wonDeals = leads.filter((lead) => lead.status === "won");
        const lostDeals = leads.filter((lead) => lead.status === "lost");
        const pipelineValue = activeLeads.reduce((sum, lead) => sum + (lead.value || 0), 0);
        const wonRevenue = wonDeals.reduce((sum, lead) => sum + (lead.value || 0), 0);
        const hotLeads = activeLeads.filter((lead) => {
            const score = calculateSalesScore(lead, getStaleDays(lead));
            return score.priority >= 80;
        });
        const attentionLeads = activeLeads.filter((lead) => {
            const stale = getStaleDays(lead);
            return stale >= 7;
        });
        const averageAI = activeLeads.length === 0
            ? 0
            : Math.round(activeLeads.reduce((sum, lead) => sum +
                calculateSalesScore(lead, getStaleDays(lead)).priority, 0) / activeLeads.length);
        return {
            pipelineValue,
            wonRevenue,
            activeLeads: activeLeads.length,
            wonDeals: wonDeals.length,
            lostDeals: lostDeals.length,
            hotLeads: hotLeads.length,
            attentionLeads: attentionLeads.length,
            averageAI,
        };
    }, [leads]);
}
