"use client"

import { useAppPreferences } from "@/components/AppPreferencesProvider"

type Props = {
  pipelineValue: number
  weightedRevenue: number
  revenueAtRisk: number
}

export default function RevenueForecast({
  pipelineValue,
  weightedRevenue,
  revenueAtRisk,
}: Props) {

  const { t, language } = useAppPreferences()
  const locale = language === "de" ? "de-DE" : "en-US"

  const confidence =
    pipelineValue > 0
      ? Math.round((weightedRevenue / pipelineValue) * 100)
      : 0


  return (
    <section
      className="
      rounded-2xl
      border
      border-border-subtle
      bg-surface-1
      p-6
      "
    >

      <div
        className="
        flex
        flex-col
        gap-4
        md:flex-row
        md:items-center
        md:justify-between
        "
      >

        <div>

          <p className="
            text-sm
            uppercase
            tracking-widest
            text-cyan-400
          ">
            {t(
              "dashboard.revenueIntelligence",
              "Revenue Intelligence"
            )}
          </p>


          <h2 className="
            mt-2
            text-2xl
            font-bold
            text-foreground
          ">
            Sales {t(
              "dashboard.forecast",
              "Forecast"
            )}
          </h2>


          <p className="
            mt-1
            text-sm
            text-foreground/60
          ">
            {t(
              "dashboard.aiWeightedPrediction",
              "AI-weighted prediction based on your current pipeline."
            )}
          </p>

        </div>



        <div
          className="
          rounded-xl
          border
          border-emerald-500/20
          bg-emerald-500/10
          px-4
          py-2
          text-sm
          font-semibold
          text-emerald-300
          "
        >
          {confidence}% {t(
            "dashboard.confidence",
            "confidence"
          )}
        </div>


      </div>



      <div
        className="
        mt-6
        grid
        gap-4
        md:grid-cols-3
        "
      >

        <ForecastCard
          label={t(
            "dashboard.pipelineValue",
            "Pipeline Value"
          )}
          value={pipelineValue}
          color="text-foreground"
          locale={locale}
        />


        <ForecastCard
          label={t(
            "dashboard.expectedRevenue",
            "Expected Revenue"
          )}
          value={weightedRevenue}
          color="text-emerald-400"
          locale={locale}
        />


        <ForecastCard
          label={t(
            "dashboard.revenueAtRisk",
            "Revenue At Risk"
          )}
          value={revenueAtRisk}
          color="text-red-400"
          locale={locale}
        />


      </div>


    </section>
  )
}



function ForecastCard({
  label,
  value,
  color,
  locale,
}: {
  label:string
  value:number
  color:string
  locale:string
}) {


  return (

    <div
      className="
      rounded-xl
      bg-surface-2/70
      p-4
      "
    >

      <p
        className="
        text-sm
        text-foreground/55
        "
      >
        {label}
      </p>


      <p
        className={`
          mt-2
          text-3xl
          font-bold
          ${color}
        `}
      >
        €{Math.round(value).toLocaleString(locale)}
      </p>


    </div>

  )

}