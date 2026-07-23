"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import toast from "react-hot-toast"
import AuthGuard from "@/components/AuthGuard"
import { useAppPreferences } from "@/components/AppPreferencesProvider"

type BillingState = {
  workspace_id: string | null
  plan: string
  status: string
  current_period_end: string | null
  stripe_subscription_id: string | null
}

export default function BillingPage() {
  const { language } = useAppPreferences()
  const isDe = language === "de"
  const locale = isDe ? "de-DE" : "en-US"

  const [loading, setLoading] = useState(false)
  const [billing, setBilling] = useState<BillingState | null>(null)
  const [billingLoading, setBillingLoading] = useState(true)

  const loadBilling = async () => {
    setBillingLoading(true)
    const response = await fetch("/api/billing")
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

  const startUpgrade = async () => {
    setLoading(true)
    const response = await fetch("/api/stripe/create-checkout", {
      method: "POST",
    })

    if (!response.ok) {
      let message = isDe ? "Checkout konnte nicht gestartet werden" : "Could not start checkout"
      try {
        const data = (await response.json()) as { error?: string }
        message = data.error || message
      } catch {
        const text = await response.text()
        message = text || message
      }

      if (message.toLowerCase().includes("two-factor authentication required")) {
        toast.error(isDe ? "2FA vor Upgrade erforderlich. Öffne Einstellungen -> Sicherheit." : "2FA required before plan upgrades. Open Settings -> Security.")
      } else {
        toast.error(message)
      }

      setLoading(false)
      return
    }

    const data = (await response.json()) as { checkoutUrl?: string | null; message?: string }

    if (!data.checkoutUrl) {
      toast.error(data.message || (isDe ? "Stripe-Checkout ist nicht konfiguriert" : "Stripe checkout is not configured"))
      setLoading(false)
      return
    }

    window.location.href = data.checkoutUrl
  }

  return (
    <AuthGuard>
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-cyan-400">{isDe ? "Abrechnung" : "Abrechnung"}</p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">{isDe ? "Aktueller Plan" : "Current Plan"}</h1>
        </div>

        <section className="rounded-2xl border border-border-subtle bg-surface-1 p-6">
          <p className="text-sm text-foreground/60">{isDe ? "Plan" : "Plan"}</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{billingLoading ? (isDe ? "Lade..." : "Lädt...") : (billing?.plan || "free").toUpperCase()}</p>
          <p className="mt-1 text-sm text-foreground/65">{isDe ? "Status" : "Status"}: {billingLoading ? "..." : (billing?.status || (isDe ? "inaktiv" : "inaktiv"))}</p>
          <p className="mt-3 text-sm text-foreground/65">
            {billing?.current_period_end
              ? (isDe
                ? `Aktuelle Periode endet am ${new Date(billing.current_period_end).toLocaleDateString(locale)}.`
                : `Current period ends on ${new Date(billing.current_period_end).toLocaleDateString(locale)}.`)
              : (isDe ? "50 Leads, 10 KI-Analysen, Basis-Prognose." : "50 Leads, 10 AI analyses, basic forecasting.")}
          </p>
          <button onClick={() => void startUpgrade()} disabled={loading} className="mt-6 rounded-xl bg-white px-4 py-2 font-semibold text-black transition hover:opacity-90 disabled:opacity-60">
            {loading ? (isDe ? "Checkout startet..." : "Starting checkout...") : (isDe ? "Upgrade" : "Upgrade")}
          </button>
          <button onClick={() => void loadBilling()} className="ml-2 mt-6 rounded-xl border border-border-subtle px-4 py-2 text-sm text-foreground/80 hover:bg-foreground/5">
            {isDe ? "Status aktualisieren" : "Refresh status"}
          </button>
          <p className="mt-3 text-xs text-foreground/50">
            {isDe ? "Sensible Abrechnungsaktionen können 2FA erfordern." : "Sensitive billing actions may require 2FA."} <Link href="/settings#security" className="text-cyan-300">{isDe ? "Sicherheit öffnen" : "Open Security"}</Link>
          </p>
        </section>
      </div>
    </AuthGuard>
  )
}