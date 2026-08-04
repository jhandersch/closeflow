"use client"

import { useAppPreferences } from "@/components/AppPreferencesProvider"

type AIInsightCardProps = {
  insight: {
    headline: string
    detail: string
    actions: string[]
    confidence: "High" | "Medium" | "Low"
  }
}

export default function AIInsightCard({ insight }: AIInsightCardProps) {
  const { t } = useAppPreferences()

  const confidenceColor =
    insight.confidence === "High"
      ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/20"
      : insight.confidence === "Medium"
      ? "text-yellow-300 bg-yellow-500/10 border-yellow-500/20"
      : "text-red-300 bg-red-500/10 border-red-500/20"


  return (

    <section
      className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-transparent p-6"
      aria-labelledby="ai-insight-heading"
    >

      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">


        <div className="flex gap-4">

          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
            AI
          </div>


          <div>

            <p className="text-sm uppercase tracking-widest text-cyan-400">
              {t("ai.salesIntelligence", "AI Sales Intelligence")}
            </p>


            <h2
              id="ai-insight-heading"
              className="mt-2 text-2xl font-bold text-foreground"
            >
              {insight.headline}
            </h2>


            <p className="mt-2 max-w-2xl text-sm text-foreground/80">
              {insight.detail}
            </p>

          </div>

        </div>



        <div
          className={`rounded-full border px-4 py-2 text-sm font-semibold ${confidenceColor}`}
        >
          {insight.confidence} {t("ai.confidenceLabel", "confidence")}
        </div>


      </div>



      <div className="mt-6">

        <p className="mb-3 text-sm text-foreground/55">
          {t("ai.recommendedActions", "Recommended actions")}
        </p>


        <div className="space-y-3">

          {insight.actions.map((action, index) => (

            <div
              key={action}
              className="flex items-center gap-3 rounded-xl border border-border-subtle bg-surface-2/70 p-4"
            >

              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-300">
                {index + 1}
              </div>


              <p className="text-sm text-foreground/85">
                {action}
              </p>


            </div>

          ))}

        </div>

      </div>


    </section>

  )
}
