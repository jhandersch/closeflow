"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { useAppPreferences } from "@/components/AppPreferencesProvider";
import { supabase } from "@/lib/supabase/client";
type AdminOverview = {
    users: number;
    workspaces: number;
    leads: number;
    mrr: number;
    ai_requests: number;
    errors_24h: number;
    ai_cost_30d_usd: number;
    ai_tokens_30d: number;
};
export default function AdminPage() {
    const { language } = useAppPreferences();
    const [overview, setOverview] = useState<AdminOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const { data: { session }, } = await supabase.auth.getSession();
            const headers: Record<string, string> = {};
            if (session?.access_token) {
                headers.Authorization = `Bearer ${session.access_token}`;
            }
            const response = await fetch("/api/admin/overview", {
                headers,
                credentials: "include",
            });
            if (!response.ok) {
                let message = "Could not load admin overview";
                try {
                    const data = (await response.json()) as {
                        error?: string;
                    };
                    message = data.error || message;
                }
                catch {
                    const text = await response.text();
                    message = text || message;
                }
                setError(message);
                setLoading(false);
                return;
            }
            setOverview((await response.json()) as AdminOverview);
            setLoading(false);
        };
        void load();
    }, []);
    return (<AuthGuard>
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-400">{"Admin"}</p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">{"Platform Overview"}</h1>
          <p className="mt-2 text-sm text-foreground/65">{"Monitor global usage, growth and AI demand across all workspaces."}</p>
        </div>

        {loading ? <p className="text-sm text-foreground/60">{"Loading admin metrics..."}</p> : null}
        {error ? (<div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            <p>{error}</p>
            {error.toLowerCase().includes("two-factor authentication required") ? (<p className="mt-2">
                {"Enable 2FA first in "}<Link href="/settings#security" className="text-cyan-200 underline">{"Settings -&gt; Security"}</Link>.
              </p>) : null}
          </div>) : null}

        {overview ? (<div className="grid gap-4 md:grid-cols-8">
            <Stat label={"Users"} value={String(overview.users)}/>
            <Stat label={"Workspaces"} value={String(overview.workspaces)}/>
            <Stat label="Leads" value={String(overview.leads)}/>
            <Stat label="MRR" value={`€${overview.mrr}`}/>
            <Stat label={"AI Requests"} value={String(overview.ai_requests)}/>
            <Stat label={"Errors (24h)"} value={String(overview.errors_24h)}/>
            <Stat label={"AI Cost (30d)"} value={`$${overview.ai_cost_30d_usd.toFixed(2)}`}/>
            <Stat label={"AI Tokens (30d)"} value={String(overview.ai_tokens_30d)}/>
          </div>) : null}

        <div className="rounded-2xl border border-border-subtle bg-surface-1 p-5 text-sm text-foreground/75">
          {"Detailed workspace error log is available at "}<Link href="/settings/monitoring" className="text-cyan-300 underline">/settings/monitoring</Link>.
        </div>
      </div>
    </AuthGuard>);
}
function Stat({ label, value }: {
    label: string;
    value: string;
}) {
    return (<div className="rounded-2xl border border-border-subtle bg-surface-1 p-5">
      <p className="text-xs text-foreground/60">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
    </div>);
}
