import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type MonthlyRevenue = { month: string; value: number };
const DEFAULT_TIMEZONE = "Europe/Berlin";

function monthKey(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    timeZone,
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  return `${year}-${month}`;
}

export function useRecentRevenueEvents() {
  const [data, setData] = useState<MonthlyRevenue[]>(() => buildMonths(new Map(), DEFAULT_TIMEZONE));

  useEffect(() => {
    let active = true;

    const load = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      if (!user) return;

      const savedTimezone = typeof user.user_metadata?.timezone === "string"
        ? user.user_metadata.timezone
        : DEFAULT_TIMEZONE;
      let timezone = DEFAULT_TIMEZONE;
      try {
        new Intl.DateTimeFormat("en-US", { timeZone: savedTimezone });
        timezone = savedTimezone;
      } catch {
        // Keep the default timezone when the saved value is invalid.
      }

      const workspacesResponse = await fetch("/api/workspaces");
      if (!workspacesResponse.ok) return;
      const workspaces = await workspacesResponse.json() as Array<{ workspace?: { id?: string } }>;
      const workspaceId = workspaces[0]?.workspace?.id;
      if (!workspaceId) {
        if (active) setData(buildMonths(new Map(), timezone));
        return;
      }

      const { data: events, error } = await supabase
        .from("revenue_events")
        .select("amount, created_at")
        .eq("workspace_id", workspaceId);
      if (error) throw error;

      const buckets = new Map<string, number>();
      for (const event of events || []) {
        const date = new Date(event.created_at);
        if (Number.isNaN(date.getTime())) continue;
        const key = monthKey(date, timezone);
        buckets.set(key, (buckets.get(key) || 0) + Number(event.amount || 0));
      }

      if (active) setData(buildMonths(buckets, timezone));
    };

    void load().catch((error) => console.error("Revenue history lookup failed:", error));
    return () => { active = false; };
  }, []);

  return data;
}

function buildMonths(buckets: Map<string, number>, timeZone: string) {
  const now = new Date();
  const currentParts = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    timeZone,
  }).formatToParts(now);
  const year = Number(currentParts.find((part) => part.type === "year")?.value);
  const month = Number(currentParts.find((part) => part.type === "month")?.value);
  const labelFormatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });

  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 6 + index, 1, 12));
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    return {
      month: labelFormatter.format(date),
      value: Math.round(buckets.get(key) || 0),
    };
  });
}
