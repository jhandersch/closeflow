"use client";
import { useEffect, useState } from "react";
type LeadMemory = {
    summary: string;
    risk: string;
    nextAction: string;
    confidence: number;
};
export function useLeadMemoryAI(lead: any, activities: any[], language: "en" = "en") {
    const [memory, setMemory] = useState<LeadMemory | null>(null);
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        if (!lead)
            return;
        async function generateMemory() {
            setLoading(true);
            try {
                const response = await fetch("/api/lead-memory-ai", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        lead,
                        activities,
                        language,
                    }),
                });
                const data = await response.json();
                setMemory(data);
            }
            catch (error) {
                console.error(error);
                setMemory({
                    summary: "Unable to analyze this lead.",
                    risk: "Unknown",
                    nextAction: "Review the lead manually.",
                    confidence: 0,
                });
            }
            setLoading(false);
        }
        generateMemory();
    }, [activities, language, lead]);
    return {
        memory,
        loading,
    };
}
