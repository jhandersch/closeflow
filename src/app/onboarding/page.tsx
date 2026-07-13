"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Building2, Compass, Sparkles, Users } from "lucide-react"
import { useAppPreferences } from "@/components/AppPreferencesProvider"
import { supabase } from "@/lib/supabase/client"
import { loadDemoData } from "@/lib/demoData"

const sanitizeNextPath = (nextPath: string | null) => {
  if (!nextPath) return null
  if (!nextPath.startsWith("/")) return null
  if (nextPath.startsWith("//")) return null
  return nextPath
}

export default function OnboardingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useAppPreferences()
  const nextPath = sanitizeNextPath(searchParams.get("next"))
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
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

  const progress = useMemo(() => ((step + 1) / steps.length) * 100, [step])

  const handleFinish = async () => {
    setSaving(true)
    setError(null)

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        throw new Error("You need to be signed in to complete onboarding.")
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

      if (leadName.trim() || leadCompany.trim() || leadValue.trim()) {
        const { data: insertedLead, error: leadError } = await supabase.from("leads").insert({
          user_id: user.id,
          name: leadName.trim() || "New lead",
          company: leadCompany.trim() || companyName.trim() || "New account",
          status: leadStatus,
          value: Number(leadValue) || 0,
          created_at: new Date().toISOString(),
          stage_changed_at: new Date().toISOString(),
          last_activity_at: new Date().toISOString(),
          notes: "Created during onboarding",
        }).select("id").single()

        if (leadError) {
          throw leadError
        }

        if (insertedLead?.id) {
          await supabase.from("activities").insert({
            lead_id: insertedLead.id,
            user_id: user.id,
            action: "Lead created during onboarding",
            type: "created",
          })
        }
      }

      router.replace(nextPath || "/dashboard")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong while finishing onboarding.")
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
                      Wir richten jetzt in wenigen Schritten deinen Workspace ein, erstellen den ersten Lead und zeigen dir danach das Dashboard.
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-border-subtle bg-surface-2/70 p-5">
                  <h3 className="text-lg font-semibold text-foreground">Das passiert als NÃ¤chstes</h3>
                  <ul className="mt-4 space-y-3 text-sm text-foreground/65">
                    <li>â€¢ Firma und Team-Kontext hinterlegen</li>
                    <li>â€¢ Ersten Lead erstellen oder Ã¼berspringen</li>
                    <li>â€¢ Dashboard-VerstÃ¤ndnis fÃ¼r den tÃ¤glichen Flow</li>
                  </ul>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-2xl font-semibold text-foreground">Firma einrichten</h2>
                  <p className="mt-2 text-sm leading-7 text-foreground/65">
                    Diese Angaben personalisieren dein CRM und helfen spÃ¤ter bei Team- und Analytics-Features.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-sm text-foreground/80">
                    <span className="mb-2 block">Company name</span>
                    <input
                      value={companyName}
                      onChange={(event) => setCompanyName(event.target.value)}
                      placeholder="Acme Labs"
                      className="w-full rounded-2xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none transition focus:border-cyan-400/50"
                    />
                  </label>

                  <label className="text-sm text-foreground/80">
                    <span className="mb-2 block">Industry</span>
                    <input
                      value={industry}
                      onChange={(event) => setIndustry(event.target.value)}
                      placeholder="SaaS"
                      className="w-full rounded-2xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none transition focus:border-cyan-400/50"
                    />
                  </label>
                </div>

                <label className="block text-sm text-foreground/80">
                  <span className="mb-2 block">Team size</span>
                  <input
                    value={teamSize}
                    onChange={(event) => setTeamSize(event.target.value)}
                    placeholder="5-10"
                    className="w-full rounded-2xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none transition focus:border-cyan-400/50"
                  />
                </label>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-2xl font-semibold text-foreground">Ersten Lead erstellen</h2>
                  <p className="mt-2 text-sm leading-7 text-foreground/65">
                    Du kannst diesen Schritt Ã¼berspringen, aber mit einem ersten Lead wird dein Workspace sofort nutzbar.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-sm text-foreground/80">
                    <span className="mb-2 block">Name</span>
                    <input
                      value={leadName}
                      onChange={(event) => setLeadName(event.target.value)}
                      placeholder="Jordan Lee"
                      className="w-full rounded-2xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none transition focus:border-cyan-400/50"
                    />
                  </label>

                  <label className="text-sm text-foreground/80">
                    <span className="mb-2 block">Company</span>
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
                    <span className="mb-2 block">Deal value</span>
                    <input
                      type="number"
                      value={leadValue}
                      onChange={(event) => setLeadValue(event.target.value)}
                      placeholder="12000"
                      className="w-full rounded-2xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none transition focus:border-cyan-400/50"
                    />
                  </label>

                  <label className="text-sm text-foreground/80">
                    <span className="mb-2 block">Status</span>
                    <select
                      value={leadStatus}
                      onChange={(event) => setLeadStatus(event.target.value)}
                      className="w-full rounded-2xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none transition focus:border-cyan-400/50"
                    >
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="proposal">Proposal</option>
                      <option value="won">Won</option>
                    </select>
                  </label>
                </div>
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
                        Dein Workspace ist bereit. Hier ist der schnellste Weg fÃ¼r deinen tÃ¤glichen Sales-Flow.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-border-subtle bg-surface-2/70 p-5 text-sm text-foreground/65">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-cyan-300" />
                    <span>Company: {companyName.trim() || "Not provided"}</span>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <Compass className="h-5 w-5 text-cyan-300" />
                    <span>Industry: {industry.trim() || "Not provided"}</span>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-border-subtle bg-surface-2/70 p-4">
                    <p className="text-sm font-semibold text-foreground">1) Dashboard</p>
                    <p className="mt-2 text-xs text-foreground/65">Ãœberblick Ã¼ber Conversion, Umsatztrend und Aufgaben-Status.</p>
                  </div>
                  <div className="rounded-2xl border border-border-subtle bg-surface-2/70 p-4">
                    <p className="text-sm font-semibold text-foreground">2) Leads</p>
                    <p className="mt-2 text-xs text-foreground/65">Leads erstellen, filtern, bearbeiten, importieren/exportieren.</p>
                  </div>
                  <div className="rounded-2xl border border-border-subtle bg-surface-2/70 p-4">
                    <p className="text-sm font-semibold text-foreground">3) Pipeline</p>
                    <p className="mt-2 text-xs text-foreground/65">Deals per Drag and Drop durch Stufen bewegen.</p>
                  </div>
                  <div className="rounded-2xl border border-border-subtle bg-surface-2/70 p-4">
                    <p className="text-sm font-semibold text-foreground">4) Settings</p>
                    <p className="mt-2 text-xs text-foreground/65">Profil, Passwort, Username und Avatar verwalten.</p>
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
                Back
              </button>

              {step < steps.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setStep((current) => Math.min(steps.length - 1, current + 1))}
                  className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:opacity-90"
                >
                  Continue
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleFinish()}
                  disabled={saving}
                  className="rounded-2xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-black transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Finishing..." : "Onboarding abschliessen"}
                </button>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-border-subtle bg-surface-1 p-6">
              <h3 className="text-lg font-semibold text-foreground">Why onboarding helps</h3>
              <p className="mt-3 text-sm leading-7 text-foreground/65">
                A quick setup makes your new CRM feel prepared, with context, a first lead, and a clear path into the dashboard.
              </p>
            </div>
            <div className="rounded-3xl border border-border-subtle bg-surface-1 p-6">
              <h3 className="text-lg font-semibold text-foreground">What gets saved</h3>
              <p className="mt-3 text-sm leading-7 text-foreground/65">
                Your company details and onboarding state are stored securely in your Supabase user profile metadata.
              </p>
            </div>
            <div className="rounded-3xl border border-border-subtle bg-surface-1 p-6">
              <h3 className="text-lg font-semibold text-foreground">Try demo data</h3>
              <p className="mt-3 text-sm leading-7 text-foreground/65">
                Want to see how CloseFlow feels with a populated pipeline? You can load realistic sample leads after finishing setup.
              </p>
              <button
                type="button"
                onClick={() => {
                  void loadDemoData().then(() => {
                    router.replace("/dashboard")
                  }).catch((err) => {
                    setError(err instanceof Error ? err.message : "Demo data could not be loaded")
                  })
                }}
                className="mt-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-500/20"
              >
                Load demo data
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

