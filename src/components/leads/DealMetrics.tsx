"use client"

import { useAppPreferences } from "@/components/AppPreferencesProvider"

type DealMetricsProps = {
  dealAge: number
  priorityScore: number
  healthScore: number
  value: number
  stageAge: number
}

export default function DealMetrics({
  dealAge,
  priorityScore,
  healthScore,
  value,
  stageAge,
}: DealMetricsProps) {
  const { language } = useAppPreferences()
  const isDe = language === "de"
  const locale = isDe ? "de-DE" : "en-US"

  return (
    <div className="rounded-xl bg-surface-1 p-6">
      <h2 className="mb-4 text-xl font-semibold">
        {isDe ? "Deal-Informationen" : "Deal Information"}
      </h2>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">

        <div className="rounded-xl border border-border-subtle bg-surface-2/70 p-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-foreground/55">{isDe ? "Alter" : "Age"}</p>
          <p className="mt-3 text-sm text-foreground/55">{isDe ? "Deal-Alter" : "Deal Age"}</p>
          <p className="mt-1 text-2xl font-bold text-foreground">
            {dealAge} {isDe ? "Tage" : "days"}
          </p>
        </div>

        <div className="rounded-xl border border-border-subtle bg-surface-2/70 p-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-foreground/55">{isDe ? "Score" : "Score"}</p>
          <p className="mt-3 text-sm text-foreground/55">{isDe ? "Priorität" : "Priority"}</p>
          <p className="mt-1 text-2xl font-bold text-emerald-400">
            {priorityScore}/100
          </p>
        </div>

        <div className="rounded-xl border border-border-subtle bg-surface-2/70 p-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-foreground/55">{isDe ? "Zustand" : "Health"}</p>
          <p className="mt-3 text-sm text-foreground/55">{isDe ? "Gesundheit" : "Health"}</p>
          <p className="mt-1 text-2xl font-bold text-cyan-400">
            {healthScore}/100
          </p>
        </div>

        <div className="rounded-xl border border-border-subtle bg-surface-2/70 p-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-foreground/55">{isDe ? "Wert" : "Value"}</p>
          <p className="mt-3 text-sm text-foreground/55">{isDe ? "Deal-Wert" : "Deal Value"}</p>
          <p className="mt-1 text-2xl font-bold text-purple-400">
            €{value.toLocaleString(locale)}
          </p>
        </div>

        <div className="rounded-xl border border-border-subtle bg-surface-2/70 p-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-foreground/55">{isDe ? "Phase" : "Stage"}</p>
          <p className="mt-3 text-sm text-foreground/55">
            {isDe ? "Zeit in Phase" : "Time in Stage"}
          </p>
          <p className="mt-1 text-2xl font-bold text-yellow-400">
            {stageAge} {isDe ? "Tage" : "days"}
          </p>
        </div>

      </div>
    </div>
  )
}
