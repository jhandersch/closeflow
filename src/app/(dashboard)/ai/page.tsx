"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import { useAppPreferences } from "@/components/AppPreferencesProvider";
import { supabase } from "@/lib/supabase/client";
type LeadLite = {
    id: string;
    name: string;
    company: string;
    status: string;
    value: number;
    notes?: string | null;
};
type CopilotResponse = {
    strategy?: string;
    dealSummary?: string;
    callPreparation?: {
        goal?: string;
        talkingPoints?: string[];
        questions?: string[];
    };
    emailDraft?: string;
    objections?: Array<{
        objection?: string;
        response?: string;
    }>;
    nextBestAction?: string;
    meetingSummary?: string;
};
type ChatMessage = {
    role: "user" | "assistant";
    content: string;
};
export default function AIAssistantPage() {
    const { language, t } = useAppPreferences();
    const locale = "en-US";
    const searchParams = useSearchParams();
    const leadIdFromQuery = searchParams.get("leadId");
    const [leads, setLeads] = useState<LeadLite[]>([]);
    const [selectedLeadId, setSelectedLeadId] = useState("");
    const [loadingLeads, setLoadingLeads] = useState(true);
    const [running, setRunning] = useState(false);
    const [autoRanForLeadId, setAutoRanForLeadId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<CopilotResponse | null>(null);
    const [question, setQuestion] = useState("");
    const [chat, setChat] = useState<ChatMessage[]>([]);
    useEffect(() => {
        const loadLeads = async () => {
            setLoadingLeads(true);
            setError(null);
            const { data: { user }, } = await supabase.auth.getUser();
            if (!user) {
                setLoadingLeads(false);
                return;
            }
            const { data: membership, error: membershipError } = await supabase
                .from("workspace_members")
                .select("workspace_id")
                .eq("user_id", user.id)
                .single();
            if (membershipError || !membership) {
                throw new Error("No workspace found");
            }
            const workspaceId = membership.workspace_id;
            const { data, error: leadsError } = await supabase
                .from("leads")
                .select("id, name, company, status, value, notes")
                .eq("workspace_id", workspaceId)
                .order("created_at", { ascending: false })
                .limit(100);
            if (leadsError) {
                setError(leadsError.message);
                setLoadingLeads(false);
                return;
            }
            const nextLeads = (data || []) as LeadLite[];
            setLeads(nextLeads);
            const hasQueryLead = leadIdFromQuery && nextLeads.some((lead) => lead.id === leadIdFromQuery);
            if (hasQueryLead) {
                setSelectedLeadId(leadIdFromQuery);
                setLoadingLeads(false);
                return;
            }
            if (nextLeads.length > 0) {
                setSelectedLeadId(nextLeads[0].id);
            }
            setLoadingLeads(false);
        };
        void loadLeads();
    }, [leadIdFromQuery]);
    const selectedLead = useMemo(() => leads.find((lead) => lead.id === selectedLeadId) || null, [leads, selectedLeadId]);
    const pipelineSummary = useMemo(() => {
        const totalLeads = leads.length;
        const totalValue = leads.reduce((sum, lead) => sum + (lead.value || 0), 0);
        const wonLeads = leads.filter((lead) => lead.status === "won");
        const wonRevenue = wonLeads.reduce((sum, lead) => sum + (lead.value || 0), 0);
        const proposalCount = leads.filter((lead) => lead.status === "proposal").length;
        return {
            totalLeads,
            totalValue,
            wonRevenue,
            proposalCount,
            statusBreakdown: {
                new: leads.filter((lead) => lead.status === "new").length,
                contacted: leads.filter((lead) => lead.status === "contacted").length,
                proposal: proposalCount,
                won: wonLeads.length,
                lost: leads.filter((lead) => lead.status === "lost").length,
            },
        };
    }, [leads]);
    const runCopilot = async (mode: "lead-analysis" | "pipeline-analysis" | "sales-coach" | "email-generator" | "risk-detection" = "lead-analysis", presetQuestion?: string) => {
        const nextQuestion = (presetQuestion || question).trim();
        if (!nextQuestion) {
            setError(t("ai.errors.enterQuestion", "Enter a question for AI Assistant"));
            return;
        }
        if (mode !== "pipeline-analysis" && !selectedLead) {
            setError(t("ai.errors.selectLead", "Select a lead first"));
            return;
        }
        setRunning(true);
        setError(null);
        setChat((current) => [...current, { role: "user", content: nextQuestion }]);
        try {
            let activities: Array<{
                created_at: string;
                action: string;
            }> = [];
            if (selectedLead) {
                const activityQuery = await supabase
                    .from("activities")
                    .select("created_at, action")
                    .eq("lead_id", selectedLead.id)
                    .order("created_at", { ascending: false })
                    .limit(25);
                if (activityQuery.error) {
                    throw new Error(activityQuery.error.message);
                }
                activities = activityQuery.data || [];
            }
            const { data: { session }, } = await supabase.auth.getSession();
            if (!session?.access_token) {
                throw new Error(t("ai.errors.auth", "Please sign in again."));
            }
            const response = await fetch("/api/sales-copilot", {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    lead: selectedLead,
                    activities,
                    memory: {},
                    risk: {},
                    status: selectedLead?.status,
                    question: nextQuestion,
                    mode,
                    pipeline: pipelineSummary,
                    language,
                }),
            });
            const payload = (await response.json()) as CopilotResponse & {
                error?: string;
            };
            if (!response.ok) {
                throw new Error(payload.error || "AI Assistant request failed");
            }
            setResult(payload);
            const summary = [payload.strategy, payload.nextBestAction, payload.dealSummary]
                .filter(Boolean)
                .join("\n\n");
            setChat((current) => [...current, { role: "assistant", content: summary || t("ai.generated", "AI response generated.") }]);
            setQuestion("");
        }
        catch (runError) {
            setError(runError instanceof Error ? runError.message : t("ai.errors.generate", "Could not generate AI output"));
            setChat((current) => [...current, { role: "assistant", content: t("ai.errors.chatFallback", "I could not generate a response. Please try again.") }]);
        }
        finally {
            setRunning(false);
        }
    };
    useEffect(() => {
        if (!leadIdFromQuery || !selectedLead)
            return;
        if (selectedLead.id !== leadIdFromQuery)
            return;
        if (running)
            return;
        if (autoRanForLeadId === leadIdFromQuery)
            return;
        setAutoRanForLeadId(leadIdFromQuery);
        void runCopilot("lead-analysis", t("ai.prompts.autoLeadAnalysis", "Analyze this lead and give me the best next actions."));
    }, [autoRanForLeadId, leadIdFromQuery, running, selectedLead, t]);
    return (<AuthGuard>
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <p className="cf-label text-cyan-400">AI</p>
          <h1 className="cf-title mt-2 text-3xl font-bold text-foreground">{t("nav.ai", "AI Assistant")}</h1>
          <p className="mt-2 text-sm text-foreground/65">{t("ai.subtitle", "Ask about leads, pipeline risk, negotiation coaching, email drafts, and forecast confidence.")}</p>
          {selectedLead ? (<div className="mt-3">
              <Link href={`/leads/${selectedLead.id}`} className="inline-flex rounded-full border border-border-subtle bg-surface-2/70 px-3 py-1 text-xs font-medium text-foreground/75 transition hover:text-foreground">
                {t("ai.openLead", "Open lead detail")}
              </Link>
            </div>) : null}
        </div>

        <div className="cf-card cf-enter p-6">
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <select value={selectedLeadId} onChange={(event) => setSelectedLeadId(event.target.value)} disabled={loadingLeads || leads.length === 0} className="w-full rounded-xl border border-border-subtle bg-surface-1 px-4 py-3 text-foreground outline-none focus:border-cyan-400 disabled:opacity-50">
              {loadingLeads ? <option>{t("ai.loadingLeads", "Loading leads...")}</option> : null}
              {!loadingLeads && leads.length === 0 ? <option>{t("ai.noLeads", "No leads available")}</option> : null}
              {leads.map((lead) => (<option key={lead.id} value={lead.id}>
                  {lead.name} - {lead.company} ({lead.status})
                </option>))}
            </select>

            <button onClick={() => void runCopilot("lead-analysis")} disabled={running || loadingLeads || !selectedLead} className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-5 py-3 font-semibold text-cyan-300 disabled:opacity-50">
              {running ? t("ai.generating", "Generating...") : t("ai.runLeadAnalysis", "Run Lead Analysis")}
            </button>
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-5">
            <button onClick={() => void runCopilot("pipeline-analysis", t("ai.prompts.pipelineFocus", "Analyze my pipeline and tell me what to focus on today."))} disabled={running} className="rounded-xl border border-border-subtle px-3 py-2 text-xs text-foreground/85 hover:bg-foreground/5">{t("ai.quick.pipeline", "Analyze my pipeline")}</button>
            <button onClick={() => void runCopilot("sales-coach", t("ai.prompts.salesCoach", "How should I negotiate this deal?"))} disabled={running || !selectedLead} className="rounded-xl border border-border-subtle px-3 py-2 text-xs text-foreground/85 hover:bg-foreground/5">{t("ai.quick.coach", "Sales coach")}</button>
            <button onClick={() => void runCopilot("email-generator", t("ai.prompts.emailGenerator", "Write a follow-up email I can send now."))} disabled={running || !selectedLead} className="rounded-xl border border-border-subtle px-3 py-2 text-xs text-foreground/85 hover:bg-foreground/5">{t("ai.quick.email", "Email generator")}</button>
            <button onClick={() => void runCopilot("risk-detection", t("ai.prompts.riskDetection", "Which deals are dying and why?"))} disabled={running} className="rounded-xl border border-border-subtle px-3 py-2 text-xs text-foreground/85 hover:bg-foreground/5">{t("ai.quick.risk", "Risk detection")}</button>
            <button onClick={() => void runCopilot("pipeline-analysis", t("ai.prompts.forecast", "Will I hit my revenue target this month?"))} disabled={running} className="rounded-xl border border-border-subtle px-3 py-2 text-xs text-foreground/85 hover:bg-foreground/5">{t("ai.quick.forecast", "Forecast")}</button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
            <input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder={t("ai.inputPlaceholder", "Which leads should I contact today?")} className="w-full rounded-xl border border-border-subtle bg-surface-1 px-4 py-3 text-sm text-foreground outline-none focus:border-cyan-400"/>
            <button onClick={() => void runCopilot("lead-analysis")} disabled={running || !question.trim()} className="rounded-xl bg-foreground px-4 py-2 text-sm font-semibold text-background disabled:opacity-60">
              {t("ai.ask", "Ask AI")}
            </button>
          </div>

          <p className="mt-3 text-xs text-foreground/55">
            {t("dashboard.leads", "Leads")}: {pipelineSummary.totalLeads} | {t("dashboard.pipelineValue", "Pipeline-Wert")}: EUR {Math.round(pipelineSummary.totalValue).toLocaleString(locale)} | {t("dashboard.revenueClosed", "Abgeschlossener Umsatz")}: EUR {Math.round(pipelineSummary.wonRevenue).toLocaleString(locale)}
          </p>

          {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
        </div>

        <div className="cf-card cf-enter p-5">
          <h2 className="cf-title text-lg font-semibold text-foreground">{t("ai.chatTitle", "Assistant Chat")}</h2>
          <div className="mt-4 space-y-3">
            {chat.length === 0 ? (<p className="text-sm text-foreground/55">{t("ai.chatEmpty", "Start with a question or use a quick action to generate recommendations.")}</p>) : (chat.map((message, index) => (<div key={`${message.role}-${index}`} className={`rounded-xl border p-3 text-sm ${message.role === "user" ? "border-cyan-500/20 bg-cyan-500/10 text-cyan-200" : "border-border-subtle bg-surface-2/70 text-foreground/85"}`}>
                  <p className="mb-1 text-xs uppercase tracking-[0.2em] text-foreground/55">{message.role === "user" ? t("ai.you", "You") : t("ai.assistant", "AI")}</p>
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>)))}
          </div>
        </div>

        {result ? (<div className="grid gap-4 md:grid-cols-2">
            <div className="cf-card cf-enter p-5">
              <h2 className="cf-title text-lg font-semibold text-foreground">{t("ai.strategy", "Strategy")}</h2>
              <p className="mt-2 text-sm text-foreground/80">{result.strategy || t("ai.noStrategy", "No strategy returned.")}</p>
            </div>

            <div className="cf-card cf-enter p-5">
              <h2 className="cf-title text-lg font-semibold text-foreground">{t("ai.nextBestAction", "Next Best Action")}</h2>
              <p className="mt-2 text-sm text-foreground/80">{result.nextBestAction || t("ai.noNextBestAction", "No action returned.")}</p>
            </div>

            <div className="cf-card cf-enter p-5">
              <h2 className="cf-title text-lg font-semibold text-foreground">{t("ai.callPreparation", "Call Preparation")}</h2>
              <p className="mt-2 text-sm text-foreground/80">{t("ai.goal", "Goal")}: {result.callPreparation?.goal || "-"}</p>
              <p className="mt-3 text-xs uppercase tracking-[0.2em] text-foreground/55">{t("ai.talkingPoints", "Talking points")}</p>
              <ul className="mt-2 space-y-1 text-sm text-foreground/80">
                {(result.callPreparation?.talkingPoints || []).map((item, index) => (<li key={`tp-${index}`}>- {item}</li>))}
              </ul>
              <p className="mt-3 text-xs uppercase tracking-[0.2em] text-foreground/55">{t("ai.questions", "Questions")}</p>
              <ul className="mt-2 space-y-1 text-sm text-foreground/80">
                {(result.callPreparation?.questions || []).map((item, index) => (<li key={`q-${index}`}>- {item}</li>))}
              </ul>
            </div>

            <div className="cf-card cf-enter p-5">
              <h2 className="cf-title text-lg font-semibold text-foreground">{t("ai.emailDraft", "Email Draft")}</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/80">{result.emailDraft || t("ai.noEmailDraft", "No email draft returned.")}</p>
            </div>

            <div className="cf-card cf-enter p-5 md:col-span-2">
              <h2 className="cf-title text-lg font-semibold text-foreground">{t("ai.objections", "Objections")}</h2>
              <div className="mt-3 space-y-2">
                {(result.objections || []).map((item, index) => (<div key={`obj-${index}`} className="cf-card-soft p-3">
                    <p className="text-sm font-semibold text-foreground">{item.objection || t("ai.objection", "Objection")}</p>
                    <p className="mt-1 text-sm text-foreground/80">{item.response || t("ai.noObjectionResponse", "No response returned.")}</p>
                  </div>))}
              </div>
            </div>
          </div>) : null}
      </div>
    </AuthGuard>);
}
