"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import AuthGuard from "@/components/AuthGuard"
import { useAppPreferences } from "@/components/AppPreferencesProvider"
import { supabase } from "@/lib/supabase/client"

type LeadLite = {
  id: string
  name: string
  company: string
  status: string
  value: number
  notes?: string | null
}

type CopilotResponse = {
  strategy?: string
  dealSummary?: string
  callPreparation?: {
    goal?: string
    talkingPoints?: string[]
    questions?: string[]
  }
  emailDraft?: string
  objections?: Array<{
    objection?: string
    response?: string
  }>
  nextBestAction?: string
  meetingSummary?: string
}

type ChatMessage = {
  role: "user" | "assistant"
  content: string
}

export default function AIAssistantPage() {
  const { language, t } = useAppPreferences()
  const searchParams = useSearchParams()
  const leadIdFromQuery = searchParams.get("leadId")
  const [leads, setLeads] = useState<LeadLite[]>([])
  const [selectedLeadId, setSelectedLeadId] = useState("")
  const [loadingLeads, setLoadingLeads] = useState(true)
  const [running, setRunning] = useState(false)
  const [autoRanForLeadId, setAutoRanForLeadId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<CopilotResponse | null>(null)
  const [question, setQuestion] = useState("")
  const [chat, setChat] = useState<ChatMessage[]>([])

  useEffect(() => {
    const loadLeads = async () => {
      setLoadingLeads(true)
      setError(null)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setLoadingLeads(false)
        return
      }

      const { data, error: leadsError } = await supabase
        .from("leads")
        .select("id, name, company, status, value, notes")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100)

      if (leadsError) {
        setError(leadsError.message)
        setLoadingLeads(false)
        return
      }

      const nextLeads = (data || []) as LeadLite[]
      setLeads(nextLeads)

      const hasQueryLead = leadIdFromQuery && nextLeads.some((lead) => lead.id === leadIdFromQuery)

      if (hasQueryLead) {
        setSelectedLeadId(leadIdFromQuery)
        setLoadingLeads(false)
        return
      }

      if (nextLeads.length > 0) {
        setSelectedLeadId(nextLeads[0].id)
      }
      setLoadingLeads(false)
    }

    void loadLeads()
  }, [leadIdFromQuery])

  const selectedLead = useMemo(() => leads.find((lead) => lead.id === selectedLeadId) || null, [leads, selectedLeadId])

  const pipelineSummary = useMemo(() => {
    const totalLeads = leads.length
    const totalValue = leads.reduce((sum, lead) => sum + (lead.value || 0), 0)
    const wonLeads = leads.filter((lead) => lead.status === "won")
    const wonRevenue = wonLeads.reduce((sum, lead) => sum + (lead.value || 0), 0)
    const proposalCount = leads.filter((lead) => lead.status === "proposal").length

    return {
      totalLeads,
      totalValue,
      wonRevenue,
      proposalCount,
      statusBreakdown: {
        new: leads.filter((lead) => lead.status === "new").length,
        contacted: leads.filter((lead) => lead.status === "contacted").length,
        qualified: leads.filter((lead) => lead.status === "qualified").length,
        proposal: proposalCount,
        won: wonLeads.length,
        lost: leads.filter((lead) => lead.status === "lost").length,
      },
    }
  }, [leads])

  const runCopilot = async (mode: "lead-analysis" | "pipeline-analysis" | "sales-coach" | "email-generator" | "risk-detection" = "lead-analysis", presetQuestion?: string) => {
    const nextQuestion = (presetQuestion || question).trim()

    if (!nextQuestion) {
      setError(t("ai.errors.enterQuestion", "Bitte gib eine Frage für den KI-Assistenten ein."))
      return
    }

    if (mode !== "pipeline-analysis" && !selectedLead) {
      setError(t("ai.errors.selectLead", "Bitte wähle zuerst einen Lead aus."))
      return
    }

    setRunning(true)
    setError(null)
    setChat((current) => [...current, { role: "user", content: nextQuestion }])

    try {
      let activities: Array<{ created_at: string; action: string }> = []

      if (selectedLead) {
        const activityQuery = await supabase
          .from("activities")
          .select("created_at, action")
          .eq("lead_id", selectedLead.id)
          .order("created_at", { ascending: false })
          .limit(25)

        if (activityQuery.error) {
          throw new Error(activityQuery.error.message)
        }

        activities = activityQuery.data || []
      }

      const response = await fetch("/api/sales-copilot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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
      })

      const payload = (await response.json()) as CopilotResponse & { error?: string }

      if (!response.ok) {
        throw new Error(payload.error || "AI Assistant request failed")
      }

      setResult(payload)
      const summary = [payload.strategy, payload.nextBestAction, payload.dealSummary]
        .filter(Boolean)
        .join("\n\n")
      setChat((current) => [...current, { role: "assistant", content: summary || t("ai.generated", "KI-Antwort erstellt.") }])
      setQuestion("")
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : t("ai.errors.generate", "KI-Ausgabe konnte nicht erstellt werden."))
      setChat((current) => [...current, { role: "assistant", content: t("ai.errors.chatFallback", "Ich konnte keine Antwort erstellen. Bitte versuche es erneut.") }])
    } finally {
      setRunning(false)
    }
  }

  useEffect(() => {
    if (!leadIdFromQuery || !selectedLead) return
    if (selectedLead.id !== leadIdFromQuery) return
    if (running) return
    if (autoRanForLeadId === leadIdFromQuery) return

    setAutoRanForLeadId(leadIdFromQuery)
    void runCopilot(
      "lead-analysis",
      language === "de"
        ? "Analysiere diesen Lead und gib mir die besten nächsten Schritte."
        : "Analyze this lead and give me the best next actions."
    )
  }, [autoRanForLeadId, language, leadIdFromQuery, running, selectedLead])

  return (
    <AuthGuard>
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <p className="cf-label text-cyan-400">AI</p>
          <h1 className="cf-title mt-2 text-3xl font-bold text-foreground">{t("nav.ai", "KI-Assistent")}</h1>
          <p className="mt-2 text-sm text-foreground/65">{t("ai.subtitle", "Frage nach Leads, Pipeline-Risiken, Verhandlungs-Coaching, E-Mail-Entwürfen und Forecast-Sicherheit.")}</p>
          {selectedLead ? (
            <div className="mt-3">
              <Link
                href={`/leads/${selectedLead.id}`}
                className="inline-flex rounded-full border border-border-subtle bg-surface-2/70 px-3 py-1 text-xs font-medium text-foreground/75 transition hover:text-foreground"
              >
                {t("ai.openLead", "Lead-Detail öffnen")}
              </Link>
            </div>
          ) : null}
        </div>

        <div className="cf-card cf-enter p-6">
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <select
              value={selectedLeadId}
              onChange={(event) => setSelectedLeadId(event.target.value)}
              disabled={loadingLeads || leads.length === 0}
              className="w-full rounded-xl border border-border-subtle bg-surface-1 px-4 py-3 text-foreground outline-none focus:border-cyan-400 disabled:opacity-50"
            >
              {loadingLeads ? <option>{t("ai.loadingLeads", "Leads werden geladen...")}</option> : null}
              {!loadingLeads && leads.length === 0 ? <option>{t("ai.noLeads", "Keine Leads verfügbar")}</option> : null}
              {leads.map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {lead.name} - {lead.company} ({lead.status})
                </option>
              ))}
            </select>

            <button
              onClick={() => void runCopilot("lead-analysis")}
              disabled={running || loadingLeads || !selectedLead}
              className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-5 py-3 font-semibold text-cyan-300 disabled:opacity-50"
            >
              {running ? t("ai.generating", "Wird erstellt...") : t("ai.runLeadAnalysis", "Lead-Analyse starten")}
            </button>
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-5">
            <button onClick={() => void runCopilot("pipeline-analysis", language === "de" ? "Analysiere meine Pipeline und sag mir, worauf ich mich heute fokussieren soll." : "Analyze my pipeline and tell me what to focus on today.")} disabled={running} className="rounded-xl border border-border-subtle px-3 py-2 text-xs text-foreground/85 hover:bg-foreground/5">{t("ai.quick.pipeline", "Pipeline analysieren")}</button>
            <button onClick={() => void runCopilot("sales-coach", language === "de" ? "Wie sollte ich diesen Deal verhandeln?" : "How should I negotiate this deal?")} disabled={running || !selectedLead} className="rounded-xl border border-border-subtle px-3 py-2 text-xs text-foreground/85 hover:bg-foreground/5">{t("ai.quick.coach", "Sales Coach")}</button>
            <button onClick={() => void runCopilot("email-generator", language === "de" ? "Schreibe eine Follow-up-E-Mail, die ich jetzt senden kann." : "Write a follow-up email I can send now.")} disabled={running || !selectedLead} className="rounded-xl border border-border-subtle px-3 py-2 text-xs text-foreground/85 hover:bg-foreground/5">{t("ai.quick.email", "E-Mail Generator")}</button>
            <button onClick={() => void runCopilot("risk-detection", language === "de" ? "Welche Deals sterben gerade und warum?" : "Which deals are dying and why?")} disabled={running} className="rounded-xl border border-border-subtle px-3 py-2 text-xs text-foreground/85 hover:bg-foreground/5">{t("ai.quick.risk", "Risiko-Erkennung")}</button>
            <button onClick={() => void runCopilot("pipeline-analysis", language === "de" ? "Erreiche ich mein Umsatzziel in diesem Monat?" : "Will I hit my revenue target this month?")} disabled={running} className="rounded-xl border border-border-subtle px-3 py-2 text-xs text-foreground/85 hover:bg-foreground/5">{t("ai.quick.forecast", "Forecast")}</button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
            <input
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder={t("ai.inputPlaceholder", "Welche Leads sollte ich heute kontaktieren?")}
              className="w-full rounded-xl border border-border-subtle bg-surface-1 px-4 py-3 text-sm text-foreground outline-none focus:border-cyan-400"
            />
            <button onClick={() => void runCopilot("lead-analysis")} disabled={running || !question.trim()} className="rounded-xl bg-foreground px-4 py-2 text-sm font-semibold text-background disabled:opacity-60">
              {t("ai.ask", "KI fragen")}
            </button>
          </div>

          <p className="mt-3 text-xs text-foreground/55">
            Leads: {pipelineSummary.totalLeads} | Pipeline Value: EUR {Math.round(pipelineSummary.totalValue).toLocaleString("de-DE")} | Won Revenue: EUR {Math.round(pipelineSummary.wonRevenue).toLocaleString("de-DE")}
          </p>

          {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
        </div>

        <div className="cf-card cf-enter p-5">
          <h2 className="cf-title text-lg font-semibold text-foreground">{t("ai.chatTitle", "Assistent-Chat")}</h2>
          <div className="mt-4 space-y-3">
            {chat.length === 0 ? (
              <p className="text-sm text-foreground/55">{t("ai.chatEmpty", "Starte mit einer Frage oder nutze eine Schnellaktion für Empfehlungen.")}</p>
            ) : (
              chat.map((message, index) => (
                <div key={`${message.role}-${index}`} className={`rounded-xl border p-3 text-sm ${message.role === "user" ? "border-cyan-500/20 bg-cyan-500/10 text-cyan-200" : "border-border-subtle bg-surface-2/70 text-foreground/85"}`}>
                  <p className="mb-1 text-xs uppercase tracking-[0.2em] text-foreground/55">{message.role === "user" ? t("ai.you", "Du") : "AI"}</p>
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {result ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="cf-card cf-enter p-5">
              <h2 className="cf-title text-lg font-semibold text-foreground">{language === "de" ? "Strategie" : "Strategy"}</h2>
              <p className="mt-2 text-sm text-foreground/80">{result.strategy || (language === "de" ? "Keine Strategie zurückgegeben." : "No strategy returned.")}</p>
            </div>

            <div className="cf-card cf-enter p-5">
              <h2 className="cf-title text-lg font-semibold text-foreground">{language === "de" ? "Nächste beste Aktion" : "Next Best Action"}</h2>
              <p className="mt-2 text-sm text-foreground/80">{result.nextBestAction || (language === "de" ? "Keine Aktion zurückgegeben." : "No action returned.")}</p>
            </div>

            <div className="cf-card cf-enter p-5">
              <h2 className="cf-title text-lg font-semibold text-foreground">{language === "de" ? "Gesprächsvorbereitung" : "Call Preparation"}</h2>
              <p className="mt-2 text-sm text-foreground/80">{language === "de" ? "Ziel" : "Goal"}: {result.callPreparation?.goal || "-"}</p>
              <p className="mt-3 text-xs uppercase tracking-[0.2em] text-foreground/55">{language === "de" ? "Talking Points" : "Talking points"}</p>
              <ul className="mt-2 space-y-1 text-sm text-foreground/80">
                {(result.callPreparation?.talkingPoints || []).map((item, index) => (
                  <li key={`tp-${index}`}>- {item}</li>
                ))}
              </ul>
              <p className="mt-3 text-xs uppercase tracking-[0.2em] text-foreground/55">{language === "de" ? "Fragen" : "Questions"}</p>
              <ul className="mt-2 space-y-1 text-sm text-foreground/80">
                {(result.callPreparation?.questions || []).map((item, index) => (
                  <li key={`q-${index}`}>- {item}</li>
                ))}
              </ul>
            </div>

            <div className="cf-card cf-enter p-5">
              <h2 className="cf-title text-lg font-semibold text-foreground">{language === "de" ? "E-Mail-Entwurf" : "Email Draft"}</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/80">{result.emailDraft || (language === "de" ? "Kein E-Mail-Entwurf zurückgegeben." : "No email draft returned.")}</p>
            </div>

            <div className="cf-card cf-enter p-5 md:col-span-2">
              <h2 className="cf-title text-lg font-semibold text-foreground">{language === "de" ? "Einwände" : "Objections"}</h2>
              <div className="mt-3 space-y-2">
                {(result.objections || []).map((item, index) => (
                  <div key={`obj-${index}`} className="cf-card-soft p-3">
                    <p className="text-sm font-semibold text-foreground">{item.objection || (language === "de" ? "Einwand" : "Objection")}</p>
                    <p className="mt-1 text-sm text-foreground/80">{item.response || (language === "de" ? "Keine Antwort zurückgegeben." : "No response returned.")}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </AuthGuard>
  )
}
