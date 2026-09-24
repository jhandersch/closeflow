import { useCallback, useEffect, useState } from "react";
import type { Activity, Lead } from "@/types";
type UseLeadsDataOptions = {
    activityLimit?: number | null;
    activityFilter?: "today" | "week" | "month" | "all" | "8weeks";
    includeCompleted?: boolean;
};
export function useLeadsData({ activityLimit = 6, activityFilter = "month", includeCompleted = false, }: UseLeadsDataOptions = {}) {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const load = useCallback(async (isRefresh = false) => {
        if (isRefresh) {
            setRefreshing(true);
        }
        else {
            setLoading(true);
        }
        setError(null);
        try {
            const activityRequest = activityLimit !== 0
                ? fetch(`/api/activity?filter=${activityFilter}`, {
                    cache: "no-store",
                }).catch((error) => {
                    console.error("ACTIVITY DATA ERROR:", error);
                    return null;
                })
                : Promise.resolve(null);
            const [leadsResponse, activityResponse] = await Promise.all([
                fetch(`/api/leads?${includeCompleted ? "includeCompleted=true&" : ""}t=${Date.now()}`, {
                    cache: "no-store",
                }),
                activityRequest,
            ]);
            const leadsJson = await leadsResponse.json();
            if (!leadsResponse.ok) {
                throw new Error(leadsJson.error ||
                    "Failed loading leads");
            }
            const activityJson = activityResponse?.ok
                ? await activityResponse.json().catch(() => [])
                : [];
            const activityData = Array.isArray(activityJson)
                ? activityLimit === null
                    ? activityJson
                    : activityJson.slice(0, activityLimit)
                : [];
            setLeads(Array.isArray(leadsJson)
                ? (leadsJson as Lead[])
                : leadsJson.leads ?? []);
            setActivities(activityData as Activity[]);
        }
        catch (error) {
            console.error("DASHBOARD DATA ERROR:", error);
            setError(error instanceof Error
                ? error.message
                : "Unknown error");
            // Bestehende Daten bei einem Refresh behalten.
            if (!isRefresh) {
                setLeads([]);
                setActivities([]);
            }
        }
        finally {
            if (isRefresh) {
                setRefreshing(false);
            }
            else {
                setLoading(false);
            }
        }
    }, [activityFilter, activityLimit, includeCompleted]);
    useEffect(() => {
        void load(false);
    }, [load]);
    const refresh = useCallback(async () => {
        await load(true);
    }, [load]);
    return {
        leads,
        setLeads,
        activities,
        loading,
        refreshing,
        error,
        refresh,
    };
}
export type { Lead, Activity, };
