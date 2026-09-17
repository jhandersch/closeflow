"use client";

import { useEffect, useState } from "react";

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
            language: "en",
          }),
        });

        if (!response.ok) {
          throw new Error("AI request failed");
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
  }, [payloadKey]);

  return {
    insight,
    loading,
  };
}