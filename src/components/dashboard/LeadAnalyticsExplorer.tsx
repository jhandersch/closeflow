"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { calculateSalesScore } from "@/lib/salesScore";
import { analyzeLead, getStaleDays } from "@/lib/scoring";
import { getVisibleLeadNextAction } from "@/lib/leadNextAction";
import type { Lead } from "@/types";

type StatusFilter = "all" | "open" | "customers" | Lead["status"];
type CostItem = { lead_id: string; name: string; amount: number };
type LeadAnalysis = { summary?: string; risk?: string; nextAction?: string; confidence?: number };

const money = (value: number) => `€${Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
const shortDate = (value?: string | null) => value && !Number.isNaN(new Date(value).getTime())
  ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(value))
  : "Not set";
const statusLabel: Record<Lead["status"], string> = {
  new: "New",
  contacted: "Contacted",
  proposal: "Proposal",
  won: "Won",
  lost: "Lost",
};

export default function LeadAnalyticsExplorer({ leads }: { leads: Lead[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState("priority");
  const [selectedId, setSelectedId] = useState(leads[0]?.id || "");
  const [costs, setCosts] = useState<CostItem[]>([]);
  const [activities, setActivities] = useState<Array<{ created_at: string; action: string }>>([]);
  const [analysis, setAnalysis] = useState<LeadAnalysis | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [analysisError, setAnalysisError] = useState("");

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      const value = data.user?.user_metadata?.personal_deal_costs;
      setCosts(Array.isArray(value) ? value.filter((item: any) => item && typeof item.lead_id === "string" && typeof item.name === "string" && Number.isFinite(Number(item.amount)) && Number(item.amount) >= 0).map((item: any) => ({ lead_id: item.lead_id, name: item.name, amount: Number(item.amount) })) : []);
    });
    return () => { active = false; };
  }, []);

  const scoredLeads = useMemo(() => leads.map((lead) => {
    const staleDays = getStaleDays(lead);
    const score = calculateSalesScore(lead, staleDays);
    const leadCosts = costs.filter((cost) => cost.lead_id === lead.id);
    const personalCosts = leadCosts.reduce((sum, cost) => sum + cost.amount, 0);
    return {
      lead,
      score,
      staleDays,
      stageDays: Math.max(0, Math.floor((Date.now() - new Date(lead.stage_changed_at || lead.created_at).getTime()) / 86400000)),
      leadCosts,
      personalCosts,
      netValue: Number(lead.value || 0) - personalCosts,
      reasons: analyzeLead(lead).reasons,
    };
  }), [leads, costs]);

  const filteredLeads = useMemo(() => {
    const query = search.trim().toLowerCase();
    return scoredLeads
      .filter(({ lead }) => statusFilter === "all" || (statusFilter === "open" ? lead.status !== "won" && lead.status !== "lost" : statusFilter === "customers" ? lead.status === "won" || lead.status === "lost" : lead.status === statusFilter))
      .filter(({ lead }) => !query || `${lead.name} ${lead.company || ""} ${getVisibleLeadNextAction(lead.status, lead.next_action)}`.toLowerCase().includes(query))
      .sort((a, b) => {
        if (sortBy === "value") return b.netValue - a.netValue;
        if (sortBy === "probability") return b.score.probability - a.score.probability;
        if (sortBy === "health") return b.score.health - a.score.health;
        if (sortBy === "stale") return b.staleDays - a.staleDays;
        return b.score.priority - a.score.priority;
      });
  }, [scoredLeads, search, statusFilter, sortBy]);

  useEffect(() => {
    if (!filteredLeads.some(({ lead }) => lead.id === selectedId)) {
      setSelectedId(filteredLeads[0]?.lead.id || "");
    }
  }, [filteredLeads, selectedId]);

  const selected = scoredLeads.find(({ lead }) => lead.id === selectedId);

  useEffect(() => {
    let active = true;
    setActivities([]);
    setAnalysis(null);
    setAnalysisError("");
    if (!selectedId) return;
    void supabase.from("activities").select("created_at, action").eq("lead_id", selectedId).order("created_at", { ascending: false }).limit(8).then(({ data, error }) => {
      if (!active) return;
      if (error) console.error("Lead analytics activity lookup failed:", error);
      setActivities((data || []) as Array<{ created_at: string; action: string }>);
    });
    return () => { active = false; };
  }, [selectedId]);

  const generateAnalysis = async () => {
    if (!selected) return;
    setLoadingAnalysis(true);
    setAnalysisError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch("/api/lead-memory-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ lead: selected.lead, activities, language: "en" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Lead analysis could not be generated.");
      setAnalysis(result);
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : "Lead analysis could not be generated.");
    } finally {
      setLoadingAnalysis(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border-subtle bg-surface-1 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-cyan-400">Lead detail</p>
          <h2 className="mt-2 text-xl font-semibold text-foreground">Explore every opportunity</h2>
          <p className="mt-1 text-sm text-foreground/60">Compare value, stage, health, close probability and deal costs, then inspect an individual lead.</p>
        </div>
        <div className="text-sm text-foreground/60">{filteredLeads.length} of {leads.length} leads and customers</div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-[1fr_180px_180px]">
        <input aria-label="Search leads" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, company or next action" className="rounded-xl border border-border-subtle bg-surface-2 px-4 py-3 text-sm text-foreground outline-none focus:border-cyan-400" />
        <select aria-label="Filter by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className="rounded-xl border border-border-subtle bg-surface-2 px-4 py-3 text-sm text-foreground outline-none focus:border-cyan-400">
          <option value="all">Leads & customers</option><option value="open">Active leads</option><option value="customers">Customers (won & lost)</option><option value="new">New leads</option><option value="contacted">Contacted leads</option><option value="proposal">Proposal leads</option><option value="won">Won customers</option><option value="lost">Lost customers</option>
        </select>
        <select aria-label="Sort leads" value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="rounded-xl border border-border-subtle bg-surface-2 px-4 py-3 text-sm text-foreground outline-none focus:border-cyan-400">
          <option value="priority">Sort: Priority</option><option value="value">Sort: Net deal value</option><option value="probability">Sort: Close probability</option><option value="health">Sort: Health</option><option value="stale">Sort: Days inactive</option>
        </select>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="overflow-x-auto rounded-xl border border-border-subtle">
          <table className="w-full min-w-[740px] text-left text-sm">
            <thead className="bg-surface-2/70 text-xs uppercase tracking-wide text-foreground/55">
              <tr><th className="px-4 py-3">Lead</th><th className="px-4 py-3">Stage</th><th className="px-4 py-3">Net value</th><th className="px-4 py-3">Probability</th><th className="px-4 py-3">Health</th><th className="px-4 py-3">Inactive</th></tr>
            </thead>
            <tbody>
              {filteredLeads.map(({ lead, score, staleDays, personalCosts, netValue }) => (
                <tr key={lead.id} role="button" tabIndex={0} aria-selected={selectedId === lead.id} onClick={() => setSelectedId(lead.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedId(lead.id); } }} className={`cursor-pointer border-t border-border-subtle text-foreground/75 hover:bg-foreground/[0.03] ${selectedId === lead.id ? "bg-cyan-500/[0.07]" : ""}`}>
                  <td className="px-4 py-3"><span className="font-medium text-foreground">{lead.name}</span><span className="mt-0.5 block text-xs text-foreground/50">{lead.company || "No company"}</span></td>
                  <td className="px-4 py-3">{statusLabel[lead.status]}</td>
                  <td className="px-4 py-3">{money(netValue)}{personalCosts > 0 ? <span className="mt-0.5 block text-xs text-foreground/45">gross {money(Number(lead.value || 0))}</span> : null}</td>
                  <td className="px-4 py-3">{score.probability}%</td>
                  <td className="px-4 py-3">{score.health}%</td>
                  <td className="px-4 py-3">{staleDays}d</td>
                </tr>
              ))}
              {filteredLeads.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-foreground/55">No leads match these filters.</td></tr> : null}
            </tbody>
          </table>
        </div>

        {selected ? (
          <div className="rounded-xl border border-border-subtle bg-surface-2/40 p-5">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-xs uppercase tracking-wide text-cyan-300">{selected.lead.status === "won" || selected.lead.status === "lost" ? "Selected customer" : "Selected lead"}</p><h3 className="mt-1 text-lg font-semibold text-foreground">{selected.lead.name}</h3><p className="text-sm text-foreground/55">{selected.lead.company || "No company"} · {statusLabel[selected.lead.status]}</p></div>
              <Link href={selected.lead.status === "won" || selected.lead.status === "lost" ? `/customers/${encodeURIComponent(selected.lead.company?.trim() ? selected.lead.company.trim().toLowerCase() : `private:${selected.lead.id}`)}` : `/leads/${selected.lead.id}`} className="shrink-0 rounded-lg border border-border-subtle px-3 py-2 text-xs text-foreground/75 hover:bg-foreground/5">{selected.lead.status === "won" || selected.lead.status === "lost" ? "Open customer" : "Open lead"}</Link>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <DetailMetric label="Gross value" value={money(Number(selected.lead.value || 0))} />
              <DetailMetric label="After listed costs" value={money(selected.netValue)} />
              <DetailMetric label="Priority" value={`${selected.score.priority}/100`} />
              <DetailMetric label="Risk" value={`${selected.score.risk}/100`} />
              <DetailMetric label="Time in stage" value={`${selected.stageDays} days`} />
              <DetailMetric label="Close probability" value={`${selected.score.probability}%`} />
              <DetailMetric label="Expected close" value={shortDate(selected.lead.expected_close_at)} />
              <DetailMetric label="Last activity" value={shortDate(selected.lead.last_activity_at || selected.lead.last_contact_at)} />
            </div>
            {selected.leadCosts.length ? <div className="mt-4 rounded-lg border border-border-subtle p-3"><p className="text-xs font-semibold uppercase tracking-wide text-foreground/55">Cost breakdown</p>{selected.leadCosts.map((cost, index) => <div key={`${cost.name}-${index}`} className="mt-2 flex justify-between gap-3 text-sm text-foreground/75"><span>{cost.name}</span><span>{money(cost.amount)}</span></div>)}</div> : null}
            <div className="mt-4"><p className="text-xs font-semibold uppercase tracking-wide text-foreground/55">Score factors</p><ul className="mt-2 space-y-1 text-sm text-foreground/70">{selected.reasons.length ? selected.reasons.map((reason, index) => <li key={index}>• {reason}</li>) : <li>• No additional score factors.</li>}</ul></div>
            <div className="mt-4 rounded-lg border border-border-subtle p-3"><p className="text-xs font-semibold uppercase tracking-wide text-foreground/55">Next action</p><p className="mt-1 text-sm text-foreground/80">{getVisibleLeadNextAction(selected.lead.status, selected.lead.next_action)}</p><p className="mt-2 text-xs text-foreground/50">{activities.length} recent activities loaded for analysis.</p></div>
            <button type="button" onClick={() => void generateAnalysis()} disabled={loadingAnalysis} className="mt-4 w-full rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-300 disabled:opacity-50">{loadingAnalysis ? "Analyzing lead..." : analysis ? "Refresh AI analysis" : "Generate AI lead analysis"}</button>
            {analysisError ? <p className="mt-3 text-sm text-rose-300">{analysisError}</p> : null}
            {analysis ? <div className="mt-4 space-y-3 rounded-lg border border-cyan-500/20 bg-cyan-500/[0.04] p-3 text-sm"><p className="font-semibold text-cyan-200">AI assessment · {Math.round(Number(analysis.confidence || 0) * 100)}% confidence</p><p className="text-foreground/75">{analysis.summary}</p><p><span className="font-medium text-foreground">Risk:</span> <span className="text-foreground/70">{analysis.risk}</span></p><p><span className="font-medium text-foreground">Recommended next step:</span> <span className="text-foreground/70">{analysis.nextAction}</span></p></div> : null}
          </div>
        ) : <div className="rounded-xl border border-border-subtle p-8 text-center text-sm text-foreground/55">Select a lead to see its detail.</div>}
      </div>
    </section>
  );
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-border-subtle bg-surface-1/70 p-3"><p className="text-xs text-foreground/50">{label}</p><p className="mt-1 font-semibold text-foreground">{value}</p></div>;
}
