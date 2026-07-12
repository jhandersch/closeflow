type Props = {
  insight: {
    explanation: string
    positiveDrivers: string[]
    risks: string[]
    recommendation: string
    confidence: number
  } | null
  loading?: boolean
}

export default function RevenueForecastAI({ insight, loading = false }: Props) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#111] p-6 animate-pulse">
        <div className="h-6 w-56 rounded bg-white/10" />
        <div className="mt-5 h-4 w-full rounded bg-white/10" />
        <div className="mt-2 h-4 w-5/6 rounded bg-white/10" />
      </div>
    )
  }

  if (!insight) return null

  const confidence = insight.confidence > 1 ? Math.round(insight.confidence) : Math.round(insight.confidence * 100)

  return (
    <div className="rounded-2xl border border-cyan-500/20 bg-[#111] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-400">AI Revenue Intelligence</p>
          <h2 className="mt-2 text-xl font-semibold text-white">🤖 Why this forecast matters</h2>
        </div>
        <div className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-sm font-semibold text-cyan-300">
          {confidence}% confidence
        </div>
      </div>

      <p className="mt-5 text-sm leading-7 text-zinc-300">{insight.explanation}</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="font-semibold text-emerald-400">✅ Positive Drivers</h3>
          <ul className="mt-3 space-y-2 text-sm text-zinc-300">
            {insight.positiveDrivers.length > 0 ? (
              insight.positiveDrivers.map((item) => (
                <li key={item} className="rounded-lg border border-emerald-500/10 bg-emerald-500/5 px-3 py-2">
                  {item}
                </li>
              ))
            ) : (
              <li className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-zinc-400">
                No positive drivers were identified.
              </li>
            )}
          </ul>
        </div>

        <div>
          <h3 className="font-semibold text-amber-400">⚠ Risks</h3>
          <ul className="mt-3 space-y-2 text-sm text-zinc-300">
            {insight.risks.length > 0 ? (
              insight.risks.map((item) => (
                <li key={item} className="rounded-lg border border-amber-500/10 bg-amber-500/5 px-3 py-2">
                  {item}
                </li>
              ))
            ) : (
              <li className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-zinc-400">
                No major risks were flagged.
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-4">
        <p className="text-sm font-semibold text-cyan-300">Recommendation</p>
        <p className="mt-2 text-sm leading-7 text-white">{insight.recommendation}</p>
      </div>
    </div>
  )
}
