"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import AuthGuard from "@/components/AuthGuard"
import { supabase } from "@/lib/supabase/client"
import { useAppPreferences } from "@/components/AppPreferencesProvider"

type BillingState = {
  workspace_id: string | null
  plan: string
  status: string
  current_period_end: string | null
  stripe_subscription_id: string | null
}

type PlanKey = "free" | "pro" | "business"

const plans: Array<{
  key: PlanKey
  name: string
  price: string
  subtitle: string
  cta: string
  featured?: boolean
  checkout?: boolean
  description: string
  features: string[]
}> = [
  {
    key: "free",
    name: "Free",
    price: "EUR 0",
    subtitle: "for early validation",
    cta: "Current plan",
    description: "Get started with essentials and validate your sales motion.",
    features: ["Up to 50 leads", "Basic forecasting", "Core pipeline board", "Single workspace"],
  },
  {
    key: "pro",
    name: "Pro",
    price: "EUR 29",
    subtitle: "per workspace / month",
    cta: "Upgrade to Pro",
    checkout: true,
    featured: true,
    description: "For teams ready to run AI-assisted pipeline execution daily.",
    features: ["Unlimited leads", "Advanced AI assistants", "Import/export CSV + XLSX", "5 team seats"],
  },
  {
    key: "business",
    name: "Business",
    price: "EUR 79",
    subtitle: "per workspace / month",
    cta: "Upgrade to Business",
    checkout: true,
    description: "For growing teams with heavier automation and forecasting needs.",
    features: ["Everything in Pro", "Priority automation capacity", "Expanded usage limits", "10+ team seats"],
  },
]

export default function PricingPage() {
  const { language } = useAppPreferences()
  const isDe = language === "de"

  const [billing, setBilling] = useState<BillingState | null>(null)
  const [billingLoading, setBillingLoading] = useState(true)
  const [pendingPlan, setPendingPlan] = useState<PlanKey | null>(null)
  const [error, setError] = useState<string | null>(null)

  const getAuthHeaders = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    const headers: Record<string, string> = {}
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`
    }
    return headers
  }

  const loadBilling = async () => {
    setBillingLoading(true)
    const response = await fetch("/api/billing", {
      headers: await getAuthHeaders(),
    })

    if (!response.ok) {
      setBilling(null)
      setBillingLoading(false)
      return
    }

    setBilling((await response.json()) as BillingState)
    setBillingLoading(false)
  }

  useEffect(() => {
    void loadBilling()
  }, [])

  const currentPlan = useMemo(() => {
    if (billingLoading) return null
    const normalized = (billing?.plan || "free").toLowerCase()
    return normalized === "business" || normalized === "pro" ? normalized : "free"
  }, [billing, billingLoading])

  const startCheckout = async (plan: PlanKey) => {
    if (plan === "free") return

    setPendingPlan(plan)
    setError(null)

    const response = await fetch("/api/stripe/create-checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(await getAuthHeaders()),
      },
      body: JSON.stringify({ plan }),
    })

    const payload = (await response.json().catch(() => null)) as
      | { checkoutUrl?: string | null; error?: string; message?: string }
      | null

    if (!response.ok) {
      setError(payload?.error || payload?.message || (isDe ? "Checkout konnte nicht gestartet werden." : "Could not start checkout."))
      setPendingPlan(null)
      return
    }

    if (!payload?.checkoutUrl) {
      setError(payload?.message || (isDe ? "Stripe-Checkout ist noch nicht konfiguriert." : "Stripe checkout is not configured yet."))
      setPendingPlan(null)
      return
    }

    window.location.assign(payload.checkoutUrl)
  }

  return (
    <AuthGuard>
      <div className="mx-auto max-w-6xl space-y-8">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-cyan-400">{isDe ? "Preise" : "Preise"}</p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">{isDe ? "Wähle deinen Wachstumsplan" : "Wähle deinen Wachstumsplan"}</h1>
          <p className="mt-3 max-w-3xl text-sm text-foreground/70">
            {isDe
              ? "Starte kostenlos und schalte mit wachsender Pipeline KI-Ausführung, höhere Limits und Team-Skalierung frei."
              : "Start free, then unlock AI execution, higher limits, and team scale as your pipeline grows."}
          </p>
          <p className="mt-2 text-xs text-foreground/55">
            {isDe ? "Aktueller Plan" : "Aktueller Plan"}: {billingLoading ? (isDe ? "Lade..." : "Lädt...") : (billing?.plan || "free").toUpperCase()} ({billing?.status || (isDe ? "inaktiv" : "inaktiv")})
          </p>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => {
            const active = currentPlan === plan.key
            const loading = pendingPlan === plan.key

            return (
              <PlanCard
                key={plan.key}
                name={plan.name}
                price={plan.price}
                subtitle={plan.subtitle}
                description={plan.description}
                features={plan.features}
                featured={plan.featured}
                active={active}
                ctaLabel={
                  active
                    ? (isDe ? "Aktueller Plan" : "Current plan")
                    : loading
                      ? (isDe ? "Checkout startet..." : "Starting checkout...")
                      : isDe
                        ? plan.key === "pro"
                          ? "Auf Pro upgraden"
                          : plan.key === "business"
                            ? "Auf Business upgraden"
                            : "Aktueller Plan"
                        : plan.cta
                }
                disabled={active || loading || pendingPlan !== null || !plan.checkout}
                onClick={
                  plan.checkout
                    ? () => {
                        void startCheckout(plan.key)
                      }
                    : undefined
                }
              />
            )
          })}
        </div>

        <section className="rounded-2xl border border-border-subtle bg-surface-1 p-6">
          <h2 className="text-lg font-semibold text-foreground">{isDe ? "Feature-Vergleich" : "Feature comparison"}</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border-subtle text-left text-foreground/60">
                  <th className="py-3 pr-4 font-medium">{isDe ? "Fähigkeit" : "Capability"}</th>
                  <th className="py-3 pr-4 font-medium">{isDe ? "Free" : "Free"}</th>
                  <th className="py-3 pr-4 font-medium">Pro</th>
                  <th className="py-3 font-medium">Business</th>
                </tr>
              </thead>
              <tbody className="text-foreground/85">
                <tr className="border-b border-border-subtle/60">
                  <td className="py-3 pr-4">{isDe ? "Lead-Kapazitaet" : "Lead capacity"}</td>
                  <td className="py-3 pr-4">50</td>
                  <td className="py-3 pr-4">{isDe ? "Unbegrenzt" : "Unlimited"}</td>
                  <td className="py-3">{isDe ? "Unbegrenzt" : "Unlimited"}</td>
                </tr>
                <tr className="border-b border-border-subtle/60">
                  <td className="py-3 pr-4">{isDe ? "KI-Assistenten" : "AI assistants"}</td>
                  <td className="py-3 pr-4">{isDe ? "Basis" : "Basic"}</td>
                  <td className="py-3 pr-4">{isDe ? "Erweitert" : "Advanced"}</td>
                  <td className="py-3">{isDe ? "Erweitert + Priorität" : "Advanced + priority"}</td>
                </tr>
                <tr className="border-b border-border-subtle/60">
                  <td className="py-3 pr-4">{isDe ? "Team-Sitze" : "Team seats"}</td>
                  <td className="py-3 pr-4">1</td>
                  <td className="py-3 pr-4">5</td>
                  <td className="py-3">10+</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4">{isDe ? "Automations-Volumen" : "Automation volume"}</td>
                  <td className="py-3 pr-4">{isDe ? "Starter" : "Starter"}</td>
                  <td className="py-3 pr-4">{isDe ? "Wachstum" : "Growth"}</td>
                  <td className="py-3">{isDe ? "Skalierung" : "Scale"}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs text-foreground/55">
            {isDe
              ? <>Abrechnungsaktionen können je nach Sicherheitsrichtlinie 2FA erfordern. Konfiguriere es in <Link href="/settings#security" className="text-cyan-300">Einstellungen</Link>.</>
              : <>Billing actions can require 2FA depending on your security policy. Configure it in <Link href="/settings#security" className="text-cyan-300">Settings</Link>.</>}
          </p>
        </section>
      </div>
    </AuthGuard>
  )
}

function PlanCard({
  name,
  price,
  subtitle,
  description,
  features,
  ctaLabel,
  featured,
  active,
  disabled,
  onClick,
}: {
  name: string
  price: string
  subtitle: string
  description: string
  features: string[]
  ctaLabel: string
  featured?: boolean
  active?: boolean
  disabled?: boolean
  onClick?: () => void
}) {
  return (
    <div className={`rounded-2xl border p-6 ${featured ? "border-cyan-500/30 bg-cyan-500/10" : "border-border-subtle bg-surface-1"}`}>
      <p className="text-sm uppercase tracking-[0.25em] text-foreground/55">{name}</p>
      <p className="mt-3 text-3xl font-bold text-foreground">{price}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-foreground/45">{subtitle}</p>
      <p className="mt-2 text-sm text-foreground/65">{description}</p>
      <ul className="mt-4 space-y-2 text-sm text-foreground/75">
        {features.map((feature) => (
          <li key={feature}>- {feature}</li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`mt-6 inline-flex rounded-xl px-4 py-2 font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
          active ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-200" : "bg-white text-black hover:opacity-90"
        }`}
      >
        {ctaLabel}
      </button>
    </div>
  )
}
