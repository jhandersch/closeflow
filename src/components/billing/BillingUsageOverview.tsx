"use client";

import { useCallback, useEffect, useState } from "react";

type UsageData = {
    month: string;
    usage: { ai_requests: number; exports: number; active_leads: number };
    limits: { ai_requests: number | null; exports: number | null; team_seats: number | null; active_leads: number | null };
    seats: { members: number; pending_invites: number };
};

function UsageMeter({ label, used, limit, suffix }: { label: string; used: number; limit: number | null; suffix: string }) {
    const unlimited = limit === null;
    const percent = unlimited ? 0 : Math.min((used / Math.max(limit, 1)) * 100, 100);

    return (
        <div className="rounded-xl border border-border-subtle bg-surface-2/30 p-4">
            <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-foreground/65">{label}</span>
                <span className="text-sm font-semibold text-foreground">
                    {used.toLocaleString("en-US")} / {unlimited ? "Unlimited" : limit?.toLocaleString("en-US")} {suffix}
                </span>
            </div>
            {!unlimited && <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-foreground/10">
                <div className={`h-full rounded-full ${percent >= 90 ? "bg-amber-400" : "bg-cyan-400"}`} style={{ width: `${percent}%` }} />
            </div>}
        </div>
    );
}

export default function BillingUsageOverview() {
    const [data, setData] = useState<UsageData | null>(null);
    const [loading, setLoading] = useState(true);
    const loadUsage = useCallback(async () => {
        setLoading(true);
        try {
            const headers: HeadersInit = {};
            const workspaceId = window.localStorage.getItem("closeflow_active_workspace");
            if (workspaceId) headers["x-closeflow-workspace-id"] = workspaceId;
            const response = await fetch("/api/usage", { cache: "no-store", headers });
            if (!response.ok) throw new Error("Could not load plan usage");
            setData((await response.json()) as UsageData);
        } catch {
            setData(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadUsage();
        window.addEventListener("closeflow-workspace-changed", loadUsage);
        return () => window.removeEventListener("closeflow-workspace-changed", loadUsage);
    }, [loadUsage]);

    return (
        <section className="rounded-2xl border border-border-subtle bg-surface-1 p-6">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
                <div>
                    <h2 className="text-lg font-semibold text-foreground">Plan usage</h2>
                    <p className="mt-1 text-sm text-foreground/55">Track your current limits and monthly usage.</p>
                </div>
                {data && <span className="text-xs text-foreground/45">Usage for {data.month}</span>}
            </div>
            {loading ? (
                <div className="grid gap-3 sm:grid-cols-2"><div className="h-[76px] animate-pulse rounded-xl bg-foreground/5" /><div className="h-[76px] animate-pulse rounded-xl bg-foreground/5" /><div className="h-[76px] animate-pulse rounded-xl bg-foreground/5" /><div className="h-[76px] animate-pulse rounded-xl bg-foreground/5" /></div>
            ) : data ? (
                <div className="grid gap-3 sm:grid-cols-2">
                    <UsageMeter label="Active leads" used={data.usage.active_leads} limit={data.limits.active_leads} suffix="leads" />
                    <UsageMeter label="AI requests" used={data.usage.ai_requests} limit={data.limits.ai_requests} suffix="this month" />
                    <UsageMeter label="Exports" used={data.usage.exports} limit={data.limits.exports} suffix="this month" />
                    <UsageMeter label="Team members" used={data.seats.members + data.seats.pending_invites} limit={data.limits.team_seats} suffix="seats" />
                </div>
            ) : (
                <p className="text-sm text-foreground/55">Usage information is currently unavailable.</p>
            )}
        </section>
    );
}
