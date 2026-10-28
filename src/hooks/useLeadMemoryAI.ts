"use client";

import { useEffect, useState } from "react";
import { useAppPreferences } from "@/components/AppPreferencesProvider";
import { translateText } from "@/lib/i18n";

type LeadMemory = {
  summary: string;
  risk: string;
  nextAction: string;
  confidence: number;
};

export function useLeadMemoryAI(
  lead: any,
  activities: any[],
  ..._args: string[]
) {
  const { language } = useAppPreferences();
  const [memory, setMemory] = useState<LeadMemory | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!lead) {
      return;
    }

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
      } catch (error) {
        console.error(error);

        setMemory({
          summary: translateText("Unable to analyze this lead."),
          risk: translateText("Unknown"),
          nextAction: translateText("Review the lead manually."),
          confidence: 0,
        });
      } finally {
        setLoading(false);
      }
    }

    void generateMemory();
  }, [activities, lead, language]);

  return {
    memory,
    loading,
  };
}
