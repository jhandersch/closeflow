"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Building2, Compass, Sparkles, Users } from "lucide-react"
import { useAppPreferences } from "@/components/AppPreferencesProvider"
import { supabase } from "@/lib/supabase/client"
import { loadDemoData } from "@/lib/demoData"

type QuickStartMode = "lead" | "demo"

const ONBOARDING_DRAFT_KEY = "closeflow-onboarding-draft-v1"

const sanitizeNextPath = (nextPath: string | null) => {
  if (!nextPath) return null
  if (!nextPath.startsWith("/")) return null
  if (nextPath.startsWith("//")) return null
  return nextPath
}

export default function OnboardingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t, language } = useAppPreferences()
  const isDe = language === "de"
  const nextPath = sanitizeNextPath(searchParams.get("next"))
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [quickStartMode, setQuickStartMode] = useState<QuickStartMode>("lead")
  const [companyName, setCompanyName] = useState("")
  const [industry, setIndustry] = useState("")
  const [teamSize, setTeamSize] = useState("")
  const [leadName, setLeadName] = useState("")
  const [leadCompany, setLeadCompany] = useState("")
  const [leadValue, setLeadValue] = useState("")
  const [leadStatus, setLeadStatus] = useState("new")

  const steps = useMemo(
    () => [
      { id: 1, title: t("onboarding.stepWelcome", "Welcome") },
      { id: 2, title: t("onboarding.stepCompany", "Set up company") },
      { id: 3, title: t("onboarding.stepLead", "Create first lead") },
      { id: 4, title: t("onboarding.stepDashboard", "Understand dashboard") },
    ],
    [t]
  )

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      if (error || !user) {
        const loginTarget = nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login"
        router.replace(loginTarget)
        return
      }

      if (user.user_metadata?.onboarding_completed) {
        router.replace(nextPath || "/dashboard")
        return
      }

      setLoading(false)
    }

    void checkUser()
  }, [nextPath, router])

  useEffect(() => {
    if (loading) return

    try {
      const saved = localStorage.getItem(ONBOARDING_DRAFT_KEY)
      if (!saved) return

      const draft = JSON.parse(saved) as {
        step?: number
        quickStartMode?: QuickStartMode
        companyName?: string
        industry?: string
        teamSize?: string
        leadName?: string
        leadCompany?: string
        leadValue?: string
        leadStatus?: string
      }

      setStep(typeof draft.step === "number" ? Math.min(Math.max(draft.step, 0), 3) : 0)
      setQuickStartMode(draft.quickStartMode === "demo" ? "demo" : "lead")
      setCompanyName(draft.companyName || "")
      setIndustry(draft.industry || "")
      setTeamSize(draft.teamSize || "")
      setLeadName(draft.leadName || "")
      setLeadCompany(draft.leadCompany || "")
      setLeadValue(draft.leadValue || "")
      setLeadStatus(draft.leadStatus || "new")
    } catch {
      localStorage.removeItem(ONBOARDING_DRAFT_KEY)
    }
  }, [loading])

  useEffect(() => {
    if (loading) return

    const payload = {
      step,
      quickStartMode,
      companyName,
      industry,
      teamSize,
      leadName,
      leadCompany,
      leadValue,
      leadStatus,
    }

    localStorage.setItem(ONBOARDING_DRAFT_KEY, JSON.stringify(payload))
  }, [companyName, industry, leadCompany, leadName, leadStatus, leadValue, loading, quickStartMode, step, teamSize])

  const progress = useMemo(() => ((step + 1) / steps.length) * 100, [step])

  const canContinue = useMemo(() => {
    if (step === 1) {
      return companyName.trim().length >= 2
    }

    if (step === 2 && quickStartMode === "lead") {
      if (!leadName.trim() || !leadCompany.trim()) {
        return false
      }

      if (leadValue.trim() && Number.isNaN(Number(leadValue))) {
        return false
      }
    }

    return true
  }, [companyName, leadCompany, leadName, leadValue, quickStartMode, step])

  const handleFinish = async () => {
    setSaving(true)
    setError(null)

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        throw new Error(isDe ? "Du musst angemeldet sein, um das Onboarding abzuschliessen." : "You need to be signed in to complete onboarding.")
      }

      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString(),
          company_name: companyName.trim() || null,
          industry: industry.trim() || null,
          team_size: teamSize.trim() || null,
        },
      })

      if (metadataError) {
        throw metadataError
      }

      if (quickStartMode === "demo") {
        await loadDemoData()
      }

      if (quickStartMode === "lead" && (leadName.trim() || leadCompany.trim() || leadValue.trim())) {
        const { data: insertedLead, error: leadError } = await supabase.from("leads").insert({
          user_id: user.id,
          name: leadName.trim() || (isDe ? "Neuer Lead" : "New lead"),
          company: leadCompany.trim() || companyName.trim() || (isDe ? "Neues Konto" : "New account"),
          status: leadStatus,
          value: Number(leadValue) || 0,
          created_at: new Date().toISOString(),
          stage_changed_at: new Date().toISOString(),
          last_activity_at: new Date().toISOString(),
          notes: isDe ? "Im Onboarding erstellt" : "Created during onboarding",
        }).select("id").single()

        if (leadError) {
          throw leadError
        }

        if (insertedLead?.id) {
          await supabase.from("activities").insert({
            lead_id: insertedLead.id,
            user_id: user.id,
            action: isDe ? "Lead waehrend Onboarding erstellt" : "Lead created during onboarding",
            type: "created",
          })
        }
      }

      localStorage.removeItem(ONBOARDING_DRAFT_KEY)

      router.replace(nextPath || "/dashboard")
    } catch (err) {
      setError(err instanceof Error ? err.message : (isDe ? "Beim Abschluss des Onboardings ist ein Fehler aufgetreten." : "Something went wrong while finishing onboarding."))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
        <div className="w-full max-w-md rounded-3xl border border-border-subtle bg-surface-1 p-8">
          <div className="h-3 w-24 animate-pulse rounded-full bg-cyan-500/30" />
          <div className="mt-6 space-y-3">
            <div className="h-4 w-full animate-pulse rounded-full bg-foreground/10" />
            <div className="h-4 w-5/6 animate-pulse rounded-full bg-foreground/10" />
            <div className="h-4 w-4/6 animate-pulse rounded-full bg-foreground/10" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="rounded-3xl border border-border-subtle bg-surface-1 p-6 shadow-[0_0_0_1px_color-mix(in_oklab,var(--foreground)_8%,transparent)] sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-cyan-400">{t("onboarding.label", "Onboarding")}</p>
              <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">{t("onboarding.welcomeTitle", "Welcome to CloseFlow")}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-foreground/65 sm:text-base">
                {t("onboarding.welcomeBody", "Let's set up your CRM workspace and create your first momentum in just a few minutes.")}
              </p>
            </div>

            <div className="w-full max-w-xs rounded-2xl border border-border-subtle bg-surface-2/70 p-4">
              <div className="flex items-center justify-between text-sm text-foreground/65">
                <span>{t("onboarding.progress", "Progress")}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-foreground/10">
                <div className="h-2 rounded-full bg-cyan-400 transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-4">
            {steps.map((item, index) => {
              const current = index === step
              const done = index < step
              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border px-4 py-3 text-sm ${
                    done
                      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                      : current
                        ? "border-cyan-500/20 bg-cyan-500/10 text-cyan-300"
                        : "border-border-subtle bg-surface-2/70 text-foreground/65"
                  }`}
                >
                  <p className="font-medium">{item.title}</p>
                </div>
              )
            })}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-border-subtle bg-surface-1 p-6 shadow-[0_0_0_1px_color-mix(in_oklab,var(--foreground)_8%,transparent)] sm:p-8">
            {step === 0 && (
              <div className="space-y-6">
                <div className="flex items-start gap-3 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4">
                  <Sparkles className="mt-1 h-5 w-5 text-cyan-300" />
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">Willkommen bei CloseFlow</h2>
                    <p className="mt-2 text-sm leading-7 text-foreground/80">
                      {isDe
                        ? "Wir richten jetzt in wenigen Schritten deinen Workspace ein, erstellen den ersten Lead und zeigen dir danach das Dashboard."
                        : "We will set up your workspace in a few steps, create your first lead, and then show you the dashboard."}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-border-subtle bg-surface-2/70 p-5">
                  <h3 className="text-lg font-semibold text-foreground">{isDe ? "Das passiert als Nächstes" : "What happens next"}</h3>
                  <ul className="mt-4 space-y-3 text-sm text-foreground/65">
                    <li>- {isDe ? "Firma und Team-Kontext hinterlegen" : "Set up company and team context"}</li>
                    <li>- {isDe ? "Schnellstart wählen: Demo-Daten oder erster Lead" : "Choose quick start: demo data or first lead"}</li>
                    <li>- {isDe ? "Dashboard-Verständnis für den täglichen Flow" : "Understand the dashboard for daily workflow"}</li>
                  </ul>
                </div>

                <div className="rounded-2xl border border-border-subtle bg-surface-2/70 p-5">
                  <h3 className="text-lg font-semibold text-foreground">{isDe ? "Schnellstart" : "Quick start"}</h3>
                  <p className="mt-2 text-sm leading-7 text-foreground/65">{isDe ? "Wähle den schnellsten Weg zu deinem Aha-Moment." : "Choose the fastest path to your aha moment."}</p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setQuickStartMode("lead")}
                      className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                        quickStartMode === "lead"
                          ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
                          : "border-border-subtle bg-surface-1 text-foreground/75"
                      }`}
                    >
                      <p className="font-semibold">{isDe ? "Ich erstelle meinen ersten Lead" : "I will create my first lead"}</p>
                      <p className="mt-1 text-xs">{isDe ? "Bester Pfad für produktiven Start." : "Best path for a productive start."}</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickStartMode("demo")}
                      className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                        quickStartMode === "demo"
                          ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
                          : "border-border-subtle bg-surface-1 text-foreground/75"
                      }`}
                    >
                      <p className="font-semibold">{isDe ? "Ich starte mit Demo-Daten" : "I will start with demo data"}</p>
                      <p className="mt-1 text-xs">{isDe ? "Sofort gefüllte Pipeline zum Erkunden." : "Instantly populated pipeline for exploration."}</p>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-2xl font-semibold text-foreground">{isDe ? "Firma einrichten" : "Set up company"}</h2>
                  <p className="mt-2 text-sm leading-7 text-foreground/65">
                    {isDe
                      ? "Diese Angaben personalisieren dein CRM und helfen später bei Team- und Analytics-Features."
                      : "These details personalize your CRM and help later with team and analytics features."}
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-sm text-foreground/80">
                    <span className="mb-2 block">{isDe ? "Firmenname" : "Company name"}</span>
                    <input
                      value={companyName}
                      onChange={(event) => setCompanyName(event.target.value)}
                      placeholder="Acme Labs"
                      className="w-full rounded-2xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none transition focus:border-cyan-400/50"
                    />
                  </label>

                  <label className="text-sm text-foreground/80">
                    <span className="mb-2 block">{isDe ? "Branche" : "Industry"}</span>
                    <input
                      value={industry}
                      onChange={(event) => setIndustry(event.target.value)}
                      placeholder="SaaS"
                      className="w-full rounded-2xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none transition focus:border-cyan-400/50"
                    />
                  </label>
                </div>

                <label className="block text-sm text-foreground/80">
                  <span className="mb-2 block">{isDe ? "Teamgröße" : "Team size"}</span>
                  <input
                    value={teamSize}
                    onChange={(event) => setTeamSize(event.target.value)}
                    placeholder="5-10"
                    className="w-full rounded-2xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none transition focus:border-cyan-400/50"
                  />
                </label>
                {!companyName.trim() ? (
                  <p className="text-xs text-amber-300">{isDe ? "Bitte gib mindestens den Firmennamen an, damit wir den Workspace personalisieren können." : "Please provide at least the company name so we can personalize your workspace."}</p>
                ) : null}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-2xl font-semibold text-foreground">
                    {quickStartMode === "demo" ? "Demo aktivieren" : "Ersten Lead erstellen"}
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-foreground/65">
                    {quickStartMode === "demo"
                      ? (isDe ? "Wir laden beim Abschluss automatisch Demo-Leads, Aktivitäten und Aufgaben." : "We automatically load demo leads, activities, and tasks when you finish.")
                      : (isDe ? "Mit einem ersten Lead wird dein Workspace sofort produktiv nutzbar." : "With a first lead, your workspace becomes immediately useful.")}
                  </p>
                </div>

                {quickStartMode === "lead" ? (
                  <>
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="text-sm text-foreground/80">
                        <span className="mb-2 block">{isDe ? "Name" : "Name"}</span>
                        <input
                          value={leadName}
                          onChange={(event) => setLeadName(event.target.value)}
                          placeholder="Jordan Lee"
                          className="w-full rounded-2xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none transition focus:border-cyan-400/50"
                        />
                      </label>

                      <label className="text-sm text-foreground/80">
                        <span className="mb-2 block">{isDe ? "Firma" : "Company"}</span>
                        <input
                          value={leadCompany}
                          onChange={(event) => setLeadCompany(event.target.value)}
                          placeholder="Northstar"
                          className="w-full rounded-2xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none transition focus:border-cyan-400/50"
                        />
                      </label>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="text-sm text-foreground/80">
                        <span className="mb-2 block">{isDe ? "Deal-Wert" : "Deal value"}</span>
                        <input
                          type="number"
                          value={leadValue}
                          onChange={(event) => setLeadValue(event.target.value)}
                          placeholder="12000"
                          className="w-full rounded-2xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none transition focus:border-cyan-400/50"
                        />
                      </label>

                      <label className="text-sm text-foreground/80">
                        <span className="mb-2 block">{isDe ? "Status" : "Status"}</span>
                        <select
                          value={leadStatus}
                          onChange={(event) => setLeadStatus(event.target.value)}
                          className="w-full rounded-2xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none transition focus:border-cyan-400/50"
                        >
                          <option value="new">{isDe ? "Neu" : "New"}</option>
                          <option value="contacted">{isDe ? "Kontaktiert" : "Contacted"}</option>
                          <option value="proposal">{isDe ? "Angebot" : "Proposal"}</option>
                          <option value="won">{isDe ? "Gewonnen" : "Won"}</option>
                        </select>
                      </label>
                    </div>
                    {(!leadName.trim() || !leadCompany.trim()) && (
                      <p className="text-xs text-amber-300">{isDe ? "Name und Firma sind für den ersten Lead erforderlich." : "Name and company are required for the first lead."}</p>
                    )}
                  </>
                ) : (
                  <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-5 text-sm leading-7 text-foreground/80">
                    {isDe
                      ? "Beim Abschluss laden wir ein realistisches Demo-Workspace mit Leads, Aktivitäten und Aufgaben, damit du sofort durch das Produkt klicken kannst."
                      : "When finishing, we load a realistic demo workspace with leads, activities, and tasks so you can click through the product immediately."}
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5">
                  <div className="flex items-start gap-3">
                    <Building2 className="mt-1 h-5 w-5 text-emerald-300" />
                    <div>
                      <h2 className="text-2xl font-semibold text-foreground">Dashboard erklaeren</h2>
                      <p className="mt-2 text-sm leading-7 text-foreground/80">
                        {isDe
                          ? "Dein Workspace ist bereit. Hier ist der schnellste Weg für deinen täglichen Sales-Flow."
                          : "Your workspace is ready. Here is the fastest path for your daily sales flow."}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-border-subtle bg-surface-2/70 p-5 text-sm text-foreground/65">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-cyan-300" />
                    <span>{isDe ? "Firma" : "Company"}: {companyName.trim() || (isDe ? "Nicht angegeben" : "Not provided")}</span>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <Compass className="h-5 w-5 text-cyan-300" />
                    <span>{isDe ? "Branche" : "Industry"}: {industry.trim() || (isDe ? "Nicht angegeben" : "Not provided")}</span>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-border-subtle bg-surface-2/70 p-4">
                    <p className="text-sm font-semibold text-foreground">1) {isDe ? "Dashboard" : "Dashboard"}</p>
                    <p className="mt-2 text-xs text-foreground/65">{isDe ? "Überblick über Conversion, Umsatztrend und Aufgaben-Status." : "Overview of conversion, revenue trend, and task status."}</p>
                  </div>
                  <div className="rounded-2xl border border-border-subtle bg-surface-2/70 p-4">
                    <p className="text-sm font-semibold text-foreground">2) {isDe ? "Leads" : "Leads"}</p>
                    <p className="mt-2 text-xs text-foreground/65">{isDe ? "Leads erstellen, filtern, bearbeiten, importieren/exportieren." : "Create, filter, edit, import/export leads."}</p>
                  </div>
                  <div className="rounded-2xl border border-border-subtle bg-surface-2/70 p-4">
                    <p className="text-sm font-semibold text-foreground">3) {isDe ? "Pipeline" : "Pipeline"}</p>
                    <p className="mt-2 text-xs text-foreground/65">{isDe ? "Deals per Drag and Drop durch Stufen bewegen." : "Move deals across stages via drag and drop."}</p>
                  </div>
                  <div className="rounded-2xl border border-border-subtle bg-surface-2/70 p-4">
                    <p className="text-sm font-semibold text-foreground">4) {isDe ? "Einstellungen" : "Settings"}</p>
                    <p className="mt-2 text-xs text-foreground/65">{isDe ? "Profil, Passwort, Benutzername und Avatar verwalten." : "Manage profile, password, username, and avatar."}</p>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-5 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            )}

            <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setStep((current) => Math.max(0, current - 1))}
                disabled={step === 0}
                className="rounded-2xl border border-border-subtle px-4 py-2 text-sm font-medium text-foreground/80 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDe ? "Zurück" : "Back"}
              </button>

              {step < steps.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setStep((current) => Math.min(steps.length - 1, current + 1))}
                  disabled={!canContinue}
                  className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:opacity-90"
                >
                  {isDe ? "Weiter" : "Continue"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleFinish()}
                  disabled={saving}
                  className="rounded-2xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-black transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (isDe ? "Schliesse ab..." : "Finishing...") : (isDe ? "Onboarding abschliessen" : "Finish onboarding")}
                </button>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-border-subtle bg-surface-1 p-6">
              <h3 className="text-lg font-semibold text-foreground">{isDe ? "Warum Onboarding hilft" : "Why onboarding helps"}</h3>
              <p className="mt-3 text-sm leading-7 text-foreground/65">
                {isDe
                  ? "Ein schnelles Setup macht dein neues CRM sofort nutzbar, mit Kontext, erstem Lead und klarem Weg ins Dashboard."
                  : "A quick setup makes your new CRM feel prepared, with context, a first lead, and a clear path into the dashboard."}
              </p>
            </div>
            <div className="rounded-3xl border border-border-subtle bg-surface-1 p-6">
              <h3 className="text-lg font-semibold text-foreground">{isDe ? "Was gespeichert wird" : "What gets saved"}</h3>
              <p className="mt-3 text-sm leading-7 text-foreground/65">
                {isDe
                  ? "Deine Firmendaten und der Onboarding-Status werden sicher in den Supabase-Profilmetadaten gespeichert."
                  : "Your company details and onboarding state are stored securely in your Supabase user profile metadata."}
              </p>
            </div>
            <div className="rounded-3xl border border-border-subtle bg-surface-1 p-6">
              <h3 className="text-lg font-semibold text-foreground">{isDe ? "Demo-Daten testen" : "Try demo data"}</h3>
              <p className="mt-3 text-sm leading-7 text-foreground/65">
                {isDe
                  ? "Willst du sehen, wie sich CloseFlow mit einer gefuellten Pipeline anfuehlt? Nach dem Setup kannst du realistische Beispieldaten laden."
                  : "Want to see how CloseFlow feels with a populated pipeline? You can load realistic sample leads after finishing setup."}
              </p>
              <button
                type="button"
                onClick={() => {
                  void loadDemoData().then(() => {
                    router.replace("/dashboard")
                  }).catch((err) => {
                    setError(err instanceof Error ? err.message : (isDe ? "Demo-Daten konnten nicht geladen werden" : "Demo data could not be loaded"))
                  })
                }}
                className="mt-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-500/20"
              >
                {isDe ? "Demo-Daten laden" : "Load demo data"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

