"use client";
import { formatTextForLanguage, getIntlLocale, translateText  } from "@/lib/i18n";


import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { calculateSalesScore } from "@/lib/salesScore";
import { analyzeLead, getStaleDays } from "@/lib/scoring";
import { getVisibleLeadNextAction } from "@/lib/leadNextAction";
import { toDisplayMessage } from "@/lib/apiError";
import type { Lead } from "@/types";
import { useAppPreferences } from "@/components/AppPreferencesProvider";

type StatusFilter = "all" | "open" | "customers" | Lead["status"];
type CostItem = { lead_id: string; name: string; amount: number };
type LeadAnalysis = { summary?: string; risk?: string; nextAction?: string; confidence?: number };

const money = (value: number, language: "en" | "de") => `€${Number(value || 0).toLocaleString(getIntlLocale(language), { maximumFractionDigits: 0 })}`;
const shortDate = (value: string | null | undefined, language: "en" | "de") => value && !Number.isNaN(new Date(value).getTime())
  ? new Intl.DateTimeFormat(getIntlLocale(language), { dateStyle: "medium" }).format(new Date(value))
  : translateText("Not set", language);
const statusLabel: Record<Lead["status"], string> = {
  new: "New",
  contacted: "Contacted",
  proposal: "Proposal",
  won: "Won",
  lost: "Lost",
};

export default function LeadAnalyticsExplorer({ leads }: { leads: Lead[] }) {
  const { language } = useAppPreferences();
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
      .filter(({ lead }) => !query || `${lead.name} ${lead.company || ""} ${getVisibleLeadNextAction(lead.status, lead.next_action, language)}`.toLowerCase().includes(query))
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
        body: JSON.stringify({ lead: selected.lead, activities, language }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Lead analysis could not be generated.");
      setAnalysis(result);
    } catch (error) {
      setAnalysisError(toDisplayMessage(error, "Lead analysis could not be generated."));
    } finally {
      setLoadingAnalysis(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border-subtle bg-surface-1 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-cyan-400">{translateText("Lead detail")}</p>
          <h2 className="mt-2 text-xl font-semibold text-foreground">{translateText("Explore every opportunity")}</h2>
          <p className="mt-1 text-sm text-foreground/60">{translateText("Compare value, stage, health, close probability and deal costs, then inspect an individual lead.")}</p>
        </div>
        <div className="text-sm text-foreground/60">{filteredLeads.length} {" "}{translateText("of")}{" "}{leads.length} {" "}{translateText("leads and customers")}</div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-[1fr_180px_180px]">
        <input aria-label={translateText("Search leads")} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={translateText("Search name, company or next action")} className="rounded-xl border border-border-subtle bg-surface-2 px-4 py-3 text-sm text-foreground outline-none focus:border-cyan-400" />
        <select aria-label={translateText("Filter by status")} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className="rounded-xl border border-border-subtle bg-surface-2 px-4 py-3 text-sm text-foreground outline-none focus:border-cyan-400">
          <option value="all">{translateText("Leads & customers")}</option><option value="open">{translateText("Active leads")}</option><option value="customers">{translateText("Customers (won & lost)")}</option><option value="new">{translateText("New leads")}</option><option value="contacted">{translateText("Contacted leads")}</option><option value="proposal">{translateText("Proposal leads")}</option><option value="won">{translateText("Won customers")}</option><option value="lost">{translateText("Lost customers")}</option>
        </select>
        <select aria-label={translateText("Sort leads")} value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="rounded-xl border border-border-subtle bg-surface-2 px-4 py-3 text-sm text-foreground outline-none focus:border-cyan-400">
          <option value="priority">{translateText("Sort: Priority")}</option><option value="value">{translateText("Sort: Net lead value")}</option><option value="probability">{translateText("Sort: Close probability")}</option><option value="health">{translateText("Sort: Health")}</option><option value="stale">{translateText("Sort: Days inactive")}</option>
        </select>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="overflow-x-auto rounded-xl border border-border-subtle">
          <table className="w-full min-w-[740px] text-left text-sm">
            <thead className="bg-surface-2/70 text-xs uppercase tracking-wide text-foreground/55">
              <tr><th className="px-4 py-3">{translateText("Lead", language)}</th><th className="px-4 py-3">{translateText("Stage", language)}</th><th className="px-4 py-3">{translateText("Net value", language)}</th><th className="px-4 py-3">{translateText("Probability", language)}</th><th className="px-4 py-3">{translateText("Health", language)}</th><th className="px-4 py-3">{translateText("Inactive", language)}</th></tr>
            </thead>
            <tbody>
              {filteredLeads.map(({ lead, score, staleDays, personalCosts, netValue }) => (
                <tr key={lead.id} role="button" tabIndex={0} aria-selected={selectedId === lead.id} onClick={() => setSelectedId(lead.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedId(lead.id); } }} className={`cursor-pointer border-t border-border-subtle text-foreground/75 hover:bg-foreground/[0.03] ${selectedId === lead.id ? "bg-cyan-500/[0.07]" : ""}`}>
                  <td className="px-4 py-3"><span className="font-medium text-foreground">{lead.name}</span><span className="mt-0.5 block text-xs text-foreground/50">{lead.company || translateText("No company")}</span></td>
                  <td className="px-4 py-3">{translateText(statusLabel[lead.status], language)}</td>
                  <td className="px-4 py-3">{money(netValue, language)}{personalCosts > 0 ? <span className="mt-0.5 block text-xs text-foreground/45">{translateText("gross", language)}{" "}{money(Number(lead.value || 0), language)}</span> : null}</td>
                  <td className="px-4 py-3">{score.probability}%</td>
                  <td className="px-4 py-3">{score.health}%</td>
                  <td className="px-4 py-3">{staleDays}{translateText("d")}</td>
                </tr>
              ))}
              {filteredLeads.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-foreground/55">{translateText("No leads match these filters.")}</td></tr> : null}
            </tbody>
          </table>
        </div>

        {selected ? (
          <div className="rounded-xl border border-border-subtle bg-surface-2/40 p-5">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-xs uppercase tracking-wide text-cyan-300">{selected.lead.status === "won" || selected.lead.status === "lost" ? translateText("Selected customer") : translateText("Selected lead")}</p><h3 className="mt-1 text-lg font-semibold text-foreground">{selected.lead.name}</h3><p className="text-sm text-foreground/55">{selected.lead.company || translateText("No company")} · {translateText(statusLabel[selected.lead.status], language)}</p></div>
              <Link href={selected.lead.status === "won" || selected.lead.status === "lost" ? `/customers/${encodeURIComponent(selected.lead.company?.trim() ? selected.lead.company.trim().toLowerCase() : `private:${selected.lead.id}`)}` : `/leads/${selected.lead.id}`} className="shrink-0 rounded-lg border border-border-subtle px-3 py-2 text-xs text-foreground/75 hover:bg-foreground/5">{selected.lead.status === "won" || selected.lead.status === "lost" ? translateText("Open customer") : translateText("Open lead")}</Link>
            </div>
            <div className="mt-4 grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
              <DetailMetric language={language} label="Gross value" value={money(Number(selected.lead.value || 0), language)} />
              <DetailMetric language={language} label="After listed costs" value={money(selected.netValue, language)} />
              <DetailMetric language={language} label="Priority" value={`${selected.score.priority}/100`} />
              <DetailMetric language={language} label="Risk" value={`${selected.score.risk}/100`} />
              <DetailMetric language={language} label="Time in stage" value={translateText(`${selected.stageDays} days`, language)} />
              <DetailMetric language={language} label="Close probability" value={`${selected.score.probability}%`} />
              <DetailMetric language={language} label="Expected close" value={shortDate(selected.lead.expected_close_at, language)} />
              <DetailMetric language={language} label="Last activity" value={shortDate(selected.lead.last_activity_at || selected.lead.last_contact_at, language)} />
            </div>
            {selected.leadCosts.length ? <div className="mt-4 rounded-lg border border-border-subtle p-3"><p className="text-xs font-semibold uppercase tracking-wide text-foreground/55">{translateText("Cost breakdown", language)}</p>{selected.leadCosts.map((cost, index) => <div key={`${cost.name}-${index}`} className="mt-2 flex justify-between gap-3 text-sm text-foreground/75"><span>{cost.name}</span><span>{money(cost.amount, language)}</span></div>)}</div> : null}
            <div className="mt-4"><p className="text-xs font-semibold uppercase tracking-wide text-foreground/55">{translateText("Score factors")}</p><ul className="mt-2 space-y-1 text-sm text-foreground/70">{selected.reasons.length ? selected.reasons.map((reason, index) => <li key={index}>• {translateText(reason, language)}</li>) : <li>{translateText("• No additional score factors.")}</li>}</ul></div>
            <div className="mt-4 rounded-lg border border-border-subtle p-3"><p className="text-xs font-semibold uppercase tracking-wide text-foreground/55">{translateText("Next action")}</p><p className="mt-1 text-sm text-foreground/80">{getVisibleLeadNextAction(selected.lead.status, selected.lead.next_action, language)}</p><p className="mt-2 text-xs text-foreground/50">{activities.length} {" "}{translateText("recent activities loaded for analysis.")}</p></div>
            <button type="button" onClick={() => void generateAnalysis()} disabled={loadingAnalysis} className="mt-4 w-full rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-300 disabled:opacity-50">{loadingAnalysis ? translateText("Analyzing lead...") : analysis ? translateText("Refresh AI analysis") : translateText("Generate AI lead analysis")}</button>
            {analysisError ? <p className="mt-3 text-sm text-rose-300">{translateText(analysisError, language)}</p> : null}
            {analysis ? <div className="mt-4 space-y-3 rounded-lg border border-cyan-500/20 bg-cyan-500/[0.04] p-3 text-sm"><p className="font-semibold text-cyan-200">{translateText("AI assessment ·")}{" "}{Math.round(Number(analysis.confidence || 0) * 100)}{translateText("% confidence")}</p><p className="text-foreground/75">{analysis.summary ? formatTextForLanguage(analysis.summary, language) : null}</p><p><span className="font-medium text-foreground">{translateText("Risk:")}</span> <span className="text-foreground/70">{analysis.risk ? formatTextForLanguage(analysis.risk, language) : null}</span></p><p><span className="font-medium text-foreground">{translateText("Recommended next step:")}</span> <span className="text-foreground/70">{analysis.nextAction ? formatTextForLanguage(analysis.nextAction, language) : null}</span></p></div> : null}
          </div>
        ) : <div className="rounded-xl border border-border-subtle p-8 text-center text-sm text-foreground/55">{translateText("Select a lead to see its detail.")}</div>}
      </div>
    </section>
  );
}

function DetailMetric({ language, label, value }: { language: "en" | "de"; label: string; value: string }) {
  return <div className="min-w-0 overflow-hidden rounded-lg border border-border-subtle bg-surface-1/70 p-3"><p className="break-words text-xs text-foreground/50 [overflow-wrap:anywhere]">{translateText(label, language)}</p><p className="mt-1 break-words font-semibold text-foreground [overflow-wrap:anywhere]">{value}</p></div>;
}
