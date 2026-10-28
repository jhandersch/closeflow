"use client";
import { translateText } from "@/lib/i18n";


import { useEffect, useState } from "react";
import { useAppPreferences } from "@/components/AppPreferencesProvider";

export type AIInsight = {
  headline: string;
  detail: string;
  actions: string[];
  confidence: "High" | "Medium" | "Low";
};

export function useAIInsight(
  payload: unknown,
  fallback: AIInsight,
  ..._args: string[]
) {
  const { language } = useAppPreferences();
  const [insight, setInsight] = useState<AIInsight>(fallback);
  const [loading, setLoading] = useState(false);

  const payloadKey = JSON.stringify(payload);

  useEffect(() => {
    let cancelled = false;

    async function loadInsight() {
      setLoading(true);

      try {
        const response = await fetch("/api/ai-insight", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...(payload as Record<string, unknown>),
            language,
          }),
        });

        if (!response.ok) {
          throw new Error(translateText("AI request failed"));
        }

        const data = await response.json();

        if (!cancelled) {
          setInsight(data);
        }
      } catch {
        // Keep the fallback insight active.
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadInsight();

    return () => {
      cancelled = true;
    };
  }, [payloadKey, language]);

  return {
    insight,
    loading,
  };
}
