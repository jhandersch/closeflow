"use client"

import Link from "next/link"
import { ArrowRight, BarChart3, Brain, Compass, Sparkles, Users } from "lucide-react"
import { useAppPreferences } from "@/components/AppPreferencesProvider"

export default function HomePage() {
  const { language } = useAppPreferences()
  const isDe = language === "de"

  const features = isDe
    ? [
        { title: "KI-Lead-Empfehlungen", description: "Erkenne für jede Opportunity den besten nächsten Schritt mit KI-gestützter Priorisierung.", icon: Brain },
        { title: "Pipeline-Intelligence", description: "Verstehe Momentum, Risiko und Opportunity-Qualität über die gesamte Pipeline.", icon: Compass },
        { title: "Lead-Memory", description: "Behalte Kontext, Verlauf und Follow-up-Absichten direkt am Deal.", icon: Users },
        { title: "Activity-Intelligence", description: "Mache aus jeder Interaktion ein klares Signal für Fortschritt.", icon: Sparkles },
        { title: "Umsatzprognose", description: "Sieh erwarteten Umsatz, gewichteten Pipeline-Wert und Risiko an einem Ort.", icon: BarChart3 },
        { title: "Sales-Analytics", description: "Tracke Performance mit einem modernen, managementtauglichen Umsatzbild.", icon: BarChart3 },
      ]
    : [
        { title: "AI Lead Recommendations", description: "Spot the best next action for every opportunity with AI-guided prioritization.", icon: Brain },
        { title: "Pipeline Intelligence", description: "Understand momentum, risk and opportunity health across the full pipeline.", icon: Compass },
        { title: "Lead Memory", description: "Keep context, histories and follow-up intentions connected to each deal.", icon: Users },
        { title: "Activity Intelligence", description: "Turn every interaction into a clear signal about what is driving progress.", icon: Sparkles },
        { title: "Revenue Forecasting", description: "See expected revenue, weighted pipeline value and risk in one place.", icon: BarChart3 },
        { title: "Sales Analytics", description: "Track performance with a modern, executive-ready revenue view.", icon: BarChart3 },
      ]

  const previews = isDe
    ? [
        { title: "Executive-Dashboard", description: "Ein klarer Blick auf Forecast, Pipeline-Qualität und nächste Schritte." },
        { title: "Lead-Detail-Workspace", description: "Fokussierter Raum für Kontext, Scores und Follow-up-Planung." },
        { title: "KI-Insight-Layer", description: "Umsatz- und Aktivitäts-Intelligence, die Momentum-Veränderungen erklärt." },
      ]
    : [
        { title: "Executive dashboard", description: "A clear view of forecast, pipeline health and the next best actions." },
        { title: "Lead detail workspace", description: "A focused place for context, score insights and follow-up planning." },
        { title: "AI insight layer", description: "Revenue and activity intelligence that explain why momentum is changing." },
      ]

  const painPoints = isDe
    ? [
        "Pipeline-Kontext ist über Notizen, Calls und Postfächer verstreut",
        "Forecasts sind schwer vertrauenswürdig, wenn Deal-Momentum unklar ist",
        "Teams verlieren Zeit bei der Entscheidung des nächsten Schritts",
      ]
    : [
        "Pipeline context is scattered across notes, calls and inboxes",
        "Forecasts are hard to trust when deal momentum is unclear",
        "Teams lose time deciding what to do next",
      ]

  const outcomes = isDe
    ? [
        "KI zeigt, wo Umsatz gewonnen oder verloren wird",
        "Jeder Lead hat klaren Kontext, Memory und nächste Aktion",
        "Führungskräfte können Forecasts vertrauen und schneller coachen",
      ]
    : [
        "AI highlights where revenue is won or lost",
        "Every lead has clear context, memory and next action",
        "Leaders can trust the forecast and coach faster",
      ]

  const proofStats = isDe
    ? [
        { label: "Pipeline-Transparenz", value: "100%" },
        { label: "Kern-Workflows", value: "Leads + Aufgaben + KI" },
        { label: "Zeit bis First Value", value: "< 5 Min mit Demo" },
      ]
    : [
        { label: "Pipeline visibility", value: "100%" },
        { label: "Core workflows", value: "Leads + Tasks + AI" },
        { label: "Time to first value", value: "< 5 min with demo" },
      ]

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10 opacity-60">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(34,211,238,0.16),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(16,185,129,0.12),transparent_28%),radial-gradient(circle_at_50%_90%,rgba(59,130,246,0.12),transparent_30%)]" />
      </div>

      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 sm:px-8 lg:px-10">
        <Link href="/" className="text-xl font-semibold tracking-tight text-foreground">
          CloseFlow
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-foreground/65 md:flex">
          <a href="#features" className="transition hover:text-foreground">
            {isDe ? "Features" : "Features"}
          </a>
          <a href="#product" className="transition hover:text-foreground">
            {isDe ? "Produkt" : "Product"}
          </a>
          <a href="#pricing" className="transition hover:text-foreground">
            {isDe ? "Preise" : "Pricing"}
          </a>
          <Link href="/login" className="rounded-full border border-border-subtle px-4 py-2 transition hover:bg-white/5 hover:text-foreground">
            {isDe ? "Anmelden" : "Login"}
          </Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-7xl gap-12 px-6 py-16 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:px-10 lg:py-24">
          <div className="flex flex-col justify-center">
            <div className="inline-flex w-fit items-center rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-sm font-medium text-cyan-300">
              {isDe ? "Revenue OS für moderne B2B-Sales-Teams" : "Revenue OS for modern B2B sales teams"}
            </div>
            <h1 className="mt-6 text-4xl font-semibold leading-tight text-foreground sm:text-5xl lg:text-6xl">
              {isDe ? "Hör auf, Pipeline-Daten zu verwalten. Starte, Umsatz-Momentum zu steuern." : "Stop managing pipeline data. Start managing revenue momentum."}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-foreground/65">
              {isDe ? "CloseFlow kombiniert CRM-Ausführung, KI-Guidance und Forecast-Intelligence, damit Reps und Manager den besten nächsten Schritt kennen." : "CloseFlow combines CRM execution, AI guidance, and forecast intelligence so every rep and manager knows the best next move."}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login" className="rounded-2xl bg-white px-5 py-3 font-semibold text-black transition hover:opacity-90">
                {isDe ? "Kostenlos starten" : "Start free"}
                <ArrowRight className="ml-2 inline h-4 w-4" />
              </Link>
              <Link href="/demo" className="rounded-2xl border border-border-subtle px-5 py-3 font-semibold text-foreground/85 transition hover:bg-white/5">
                {isDe ? "Live-Demo-Workspace laden" : "Load live demo workspace"}
              </Link>
              <a href="#problem" className="rounded-2xl border border-border-subtle px-5 py-3 font-semibold text-foreground/85 transition hover:bg-white/5">
                {isDe ? "Warum Teams wechseln" : "Why teams switch"}
              </a>
            </div>
            <div className="mt-8 flex flex-wrap gap-6 text-sm text-foreground/55">
              <span>{isDe ? "Gebaut für B2B-Revenue-Teams" : "Built for B2B revenue teams"}</span>
              <span>•</span>
              <span>{isDe ? "KI-gestützte Priorisierung und Follow-up" : "AI-backed prioritization and follow-up"}</span>
              <span>•</span>
              <span>{isDe ? "Managementtaugliche Forecast-Klarheit" : "Executive-ready forecast clarity"}</span>
            </div>
          </div>

          <div className="rounded-[2rem] border border-border-subtle bg-surface-1 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] sm:p-6">
            <div className="rounded-[1.5rem] border border-border-subtle bg-surface-2/95 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground/65">{isDe ? "Forecast-Ausblick" : "Forecast outlook"}</p>
                  <p className="mt-1 text-3xl font-semibold text-foreground">{isDe ? "EUR 184k prognostiziert" : "EUR 184k projected"}</p>
                </div>
                <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-300">
                  +12.4%
                </div>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border-subtle bg-white/5 p-4">
                  <p className="text-sm text-foreground/65">{isDe ? "Prioritäts-Deals" : "Priority deals"}</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">14</p>
                </div>
                <div className="rounded-2xl border border-border-subtle bg-white/5 p-4">
                  <p className="text-sm text-foreground/65">{isDe ? "Umsatz im Risiko" : "Revenue at risk"}</p>
                  <p className="mt-2 text-2xl font-semibold text-amber-300">EUR 24k</p>
                </div>
              </div>
              <div className="mt-6 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4">
                <p className="text-sm font-semibold text-cyan-300">{isDe ? "KI-Empfehlung" : "AI recommendation"}</p>
                <p className="mt-2 text-sm leading-7 text-foreground/85">
                  {isDe ? "Drei Deals zeigen diese Woche stärkeres Momentum. Priorisiere Follow-ups innerhalb von 24 Stunden." : "Three deals are showing stronger momentum this week. Prioritize follow-up within 24 hours."}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-4 sm:px-8 lg:px-10">
          <div className="grid gap-4 rounded-[1.6rem] border border-border-subtle bg-surface-1 p-6 md:grid-cols-3">
            {proofStats.map((item) => (
              <div key={item.label}>
                <p className="text-xs uppercase tracking-[0.24em] text-foreground/45">{item.label}</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{item.value}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl px-6 py-16 sm:px-8 lg:px-10">
          <div className="max-w-2xl">
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-400">{isDe ? "Features" : "Features"}</p>
            <h2 className="mt-3 text-3xl font-semibold text-foreground sm:text-4xl">{isDe ? "Alles, was dein Team braucht, um Deals voranzubringen" : "Everything your team needs to move deals forward"}</h2>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <div key={feature.title} className="rounded-3xl border border-border-subtle bg-surface-1 p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-300">
                    <Icon size={20} />
                  </div>
                  <h3 className="mt-5 text-xl font-semibold text-foreground">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-foreground/65">{feature.description}</p>
                </div>
              )
            })}
          </div>
        </section>

        <section id="problem" className="mx-auto max-w-7xl px-6 py-16 sm:px-8 lg:px-10">
          <div className="grid gap-8 rounded-[2rem] border border-border-subtle bg-surface-1 p-8 lg:grid-cols-[0.95fr_1.05fr] lg:p-10">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-cyan-400">{isDe ? "Problem / Lösung" : "Problem / solution"}</p>
              <h2 className="mt-3 text-3xl font-semibold text-foreground">{isDe ? "Traditionelle CRMs speichern Daten. CloseFlow steuert Entscheidungen." : "Traditional CRMs store records. CloseFlow drives decisions."}</h2>
              <p className="mt-4 text-lg leading-8 text-foreground/65">
                {isDe ? "Dein Team braucht nicht mehr Felder und Tabs. Es braucht klaren Kontext, erklärbare Forecast-Signale und konkrete nächste Schritte." : "Your team does not need more fields and tabs. It needs clear context, explainable forecast signals, and actionable next steps."}
              </p>
              <ul className="mt-6 space-y-3 text-sm leading-7 text-foreground/65">
                {painPoints.map((pain) => (
                  <li key={pain}>- {pain}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-[1.5rem] border border-border-subtle bg-surface-2/80 p-6">
              <div className="flex items-start gap-3">
                <div className="mt-1 rounded-full bg-cyan-500/10 p-2 text-cyan-300">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-foreground">{isDe ? "Warum Teams wechseln" : "Why teams switch"}</h3>
                  <ul className="mt-4 space-y-3 text-sm leading-7 text-foreground/65">
                    {outcomes.map((outcome) => (
                      <li key={outcome}>- {outcome}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="product" className="mx-auto max-w-7xl px-6 py-16 sm:px-8 lg:px-10">
          <div className="max-w-2xl">
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-400">{isDe ? "Produktvorschau" : "Product preview"}</p>
            <h2 className="mt-3 text-3xl font-semibold text-foreground sm:text-4xl">{isDe ? "Ein genauerer Blick auf die CloseFlow-Erfahrung" : "A closer look at the CloseFlow experience"}</h2>
          </div>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {previews.map((preview) => (
              <div key={preview.title} className="rounded-[1.6rem] border border-border-subtle bg-surface-1 p-6">
                <div className="h-36 rounded-[1.2rem] border border-dashed border-border-subtle bg-surface-2/80" />
                <h3 className="mt-5 text-xl font-semibold text-foreground">{preview.title}</h3>
                <p className="mt-3 text-sm leading-7 text-foreground/65">{preview.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-16 sm:px-8 lg:px-10">
          <div className="rounded-[2rem] border border-border-subtle bg-surface-1 p-8 text-center lg:p-12">
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-400">{isDe ? "Social Proof" : "Social proof"}</p>
            <h2 className="mt-3 text-3xl font-semibold text-foreground sm:text-4xl">{isDe ? "Gebaut für Teams, die Pipeline wie ein Betriebssystem steuern" : "Built for teams that run pipeline like an operating system"}</h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-foreground/65">
              {isDe ? "CloseFlow ist für Revenue-Teams gebaut, die vorhersagbare Ausführung, schnelleres Follow-up und vertrauenswürdige Forecasts wollen." : "CloseFlow is purpose-built for revenue teams that want predictable execution, faster follow-up, and trusted forecasting."}
            </p>
          </div>
        </section>

        <section id="pricing" className="mx-auto max-w-7xl px-6 py-16 sm:px-8 lg:px-10">
          <div className="rounded-[2rem] border border-cyan-500/20 bg-cyan-500/10 p-8 text-center lg:p-12">
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">{isDe ? "Bereit zum Testen?" : "Ready to try it?"}</p>
            <h2 className="mt-3 text-3xl font-semibold text-foreground sm:text-4xl">{isDe ? "Kostenlos starten. Upgraden, wenn deine Pipeline skaliert." : "Start free. Upgrade when your pipeline scales."}</h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-foreground/80">
              {isDe ? "Erstelle jetzt deinen Workspace, lade in Minuten Demo-Daten und sieh genau, wie CloseFlow Pipeline-Aktivität in Umsatzbewegung verwandelt." : "Create your workspace now, load demo data in minutes, and see exactly how CloseFlow turns pipeline activity into revenue movement."}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/login" className="rounded-2xl bg-white px-5 py-3 font-semibold text-black transition hover:opacity-90">
                {isDe ? "Workspace erstellen" : "Create your workspace"}
              </Link>
              <Link href="/pricing" className="rounded-2xl border border-border-subtle px-5 py-3 font-semibold text-foreground/85 transition hover:bg-white/5">
                {isDe ? "Plaene vergleichen" : "Compare plans"}
              </Link>
              <a href="#features" className="rounded-2xl border border-border-subtle px-5 py-3 font-semibold text-foreground/85 transition hover:bg-white/5">
                {isDe ? "Features entdecken" : "Explore features"}
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-6 py-8 text-sm text-foreground/55 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-10">
        <p>© 2026 CloseFlow</p>
        <div className="flex gap-4">
          <a href="#features" className="transition hover:text-foreground">{isDe ? "Features" : "Features"}</a>
          <a href="#product" className="transition hover:text-foreground">{isDe ? "Produkt" : "Product"}</a>
          <a href="#pricing" className="transition hover:text-foreground">{isDe ? "Preise" : "Pricing"}</a>
          <a href="/login" className="transition hover:text-foreground">{isDe ? "Anmelden" : "Login"}</a>
        </div>
      </footer>
    </div>
  )
}

