"use client"

type Props = {
  analysis: {
    summary: string
    positiveFactors: string[]
    risks: string[]
    recommendation: string
  } | null

  loading: boolean
}

export default function AIForecastCard({
  analysis,
  loading,
}: Props) {

  if (loading) {
    return (
      <div className="rounded-2xl border border-border-subtle bg-surface-1 p-6 animate-pulse">
        <div className="h-6 w-56 rounded bg-white/10" />
        <div className="mt-5 h-4 w-full rounded bg-white/10" />
        <div className="mt-2 h-4 w-5/6 rounded bg-white/10" />
      </div>
    )
  }

  if (!analysis) return null

  return (

    <div className="
      rounded-2xl
      border
      border-cyan-500/20
      bg-gradient-to-br
      from-[#111]
      to-[#18181b]
      p-6
    ">

      <p className="text-xs uppercase tracking-widest text-cyan-400">
        AI Forecast Analyst
      </p>

      <h2 className="mt-2 text-2xl font-bold text-foreground">
        Revenue Intelligence
      </h2>

      <div className="mt-6">

        <p className="text-foreground/80 leading-7">
          {analysis.summary}
        </p>

      </div>

      <div className="mt-6">

        <h3 className="font-semibold text-emerald-400">
          Positive Factors
        </h3>

        <ul className="mt-3 space-y-2">

          {analysis.positiveFactors.map((item, index) => (

            <li
              key={index}
              className="text-sm text-foreground/80"
            >
              â€¢ {item}
            </li>

          ))}

        </ul>

      </div>

      <div className="mt-6">

        <h3 className="font-semibold text-red-400">
          Risks
        </h3>

        <ul className="mt-3 space-y-2">

          {analysis.risks.map((item, index) => (

            <li
              key={index}
              className="text-sm text-foreground/80"
            >
              â€¢ {item}
            </li>

          ))}

        </ul>

      </div>

      <div className="
        mt-6
        rounded-xl
        border
        border-cyan-500/20
        bg-cyan-500/10
        p-4
      ">

        <p className="text-xs uppercase text-cyan-300">
          Recommendation
        </p>

        <p className="mt-2 text-foreground">
          {analysis.recommendation}
        </p>

      </div>

    </div>

  )
}
