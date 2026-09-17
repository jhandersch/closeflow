"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import RevenueForecast from "@/components/dashboard/RevenueForecast";
import RevenueForecastAI from "@/components/dashboard/RevenueForecastAI";
import RevenueForecastChart from "@/components/dashboard/RevenueForecastChart";
import { useLeadsData } from "@/hooks/useLeadsData";
import { useRevenueForecastAI } from "@/hooks/useRevenueForecastAI";
import { calculateForecast } from "@/lib/forecast";
import { supabase } from "@/lib/supabase/client";

const DEFAULT_TIMEZONE = "Europe/Berlin";

function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format();
    return true;
  } catch {
    return false;
  }
}

export default function ForecastPage() {
  const [timeZone, setTimeZone] = useState(DEFAULT_TIMEZONE);

  const { leads } = useLeadsData({
    activityLimit: 10,
    includeCompleted: true,
  });

  useEffect(() => {
    let cancelled = false;

    const loadTimezone = async () => {
      const { data } = await supabase.auth.getUser();

      const storedTimezone =
        typeof data.user?.user_metadata?.timezone === "string"
          ? data.user.user_metadata.timezone
          : "";

      const nextTimezone = isValidTimeZone(storedTimezone)
        ? storedTimezone
        : DEFAULT_TIMEZONE;

      if (!cancelled) {
        setTimeZone(nextTimezone);
      }
    };

    void loadTimezone();

    return () => {
      cancelled = true;
    };
  }, []);

  const forecast = calculateForecast(leads, timeZone);

  const {
    insight,
    loading: insightLoading,
    error: insightError,
  } = useRevenueForecastAI(leads, forecast, "en");

  const forecastSeries = forecast.monthlyForecast;

  return (
    <AuthGuard>
      <div className="space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-400">
            Forecast
          </p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">
            Revenue Forecast
          </h1>
          <p className="mt-2 text-sm text-foreground/65">
            AI-based outlook for expected revenue, risk and confidence.
          </p>
        </div>

        <RevenueForecast
          pipelineValue={forecast.pipelineValue}
          weightedRevenue={forecast.weightedRevenue}
          revenueAtRisk={forecast.revenueAtRisk}
          commitRevenue={forecast.commitRevenue}
          bestCaseRevenue={forecast.bestCaseRevenue}
          confidence={forecast.confidence}
          averageHealth={forecast.averageHealth}
          averageProbability={forecast.averageProbability}
          activeDeals={forecast.activeDeals}
          singleDealRisk={forecast.singleDealRisk}
          dealsWithNextAction={forecast.dealsWithNextAction}
          dealsWithoutNextAction={forecast.dealsWithoutNextAction}
          nextActionCoverage={forecast.nextActionCoverage}
        />

        <RevenueForecastChart data={forecastSeries} />

        <RevenueForecastAI
          insight={insight}
          loading={insightLoading}
          error={insightError}
        />
      </div>
    </AuthGuard>
  );
}