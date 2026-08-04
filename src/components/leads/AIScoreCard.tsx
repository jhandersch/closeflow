"use client"

import { useAppPreferences } from "@/components/AppPreferencesProvider"

type AIScoreCardProps = {
  score: number
  health: number
  probability: number
  risk: string
  recommendation: string
}

export default function AIScoreCard({
  score,
  health,
  probability,
  risk,
  recommendation,
}: AIScoreCardProps) {
  const { t } = useAppPreferences()

  return (
    <div className="
      rounded-2xl
      border
      border-cyan-500/20
      bg-gradient-to-br
      from-cyan-500/10
      via-blue-500/5
      to-transparent
      p-6
    ">

      <div className="flex items-center justify-between">

        <div>

          <p className="
            text-sm
            uppercase
            tracking-widest
            text-cyan-400
          ">
            {t("ai.salesIntelligence", "AI Sales Intelligence")}
          </p>


          <h2 className="
            mt-2
            text-2xl
            font-bold
            text-foreground
          ">
            {t("ai.leadAnalysis", "Lead Analysis")}
          </h2>

        </div>


        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
          AI
        </div>

      </div>


      <div className="
        mt-6
        grid
        gap-4
        md:grid-cols-4
      ">


        <ScoreBox
          title={t("ai.leadScore", "Lead Score")}
          value={`${score}`}
          color="text-cyan-400"
        />


        <ScoreBox
          title={t("ai.health", "Health")}
          value={`${health}`}
          color="text-green-400"
        />


        <ScoreBox
          title={t("ai.winChance", "Win Chance")}
          value={`${probability}%`}
          color="text-purple-400"
        />


        <ScoreBox
          title={t("dashboard.risk", "Risk")}
          value={risk}
          color="text-yellow-400"
        />


      </div>


      <div className="
        mt-6
        rounded-xl
        border
        border-border-subtle
        bg-surface-2/70
        p-4
      ">

        <p className="text-sm text-foreground/55">
          {t("ai.recommendedAction", "Recommended Action")}
        </p>


        <p className="
          mt-2
          text-lg
          font-semibold
          text-foreground
        ">
          {recommendation}
        </p>

      </div>


    </div>
  )
}


function ScoreBox({
  title,
  value,
  color,
}: {
  title: string
  value: string
  color: string
}) {

  return (
    <div className="
      rounded-xl
      bg-surface-2/70
      p-4
    ">

      <p className="text-sm text-foreground/55">
        {title}
      </p>


      <p className={`
        mt-2
        text-3xl
        font-bold
        ${color}
      `}>
        {value}
      </p>

    </div>
  )
}
