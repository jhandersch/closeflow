"use client"

import { useAppPreferences } from "@/components/AppPreferencesProvider"


type Props = {
  pipelineValue: number
  weightedRevenue: number
  revenueAtRisk: number

  commitRevenue: number
  bestCaseRevenue: number

  confidence: number

  averageHealth: number
  averageProbability: number

  activeDeals: number
}



export default function RevenueForecast({
  pipelineValue,
  weightedRevenue,
  revenueAtRisk,
  commitRevenue,
  bestCaseRevenue,
  confidence,
  averageHealth,
  averageProbability,
  activeDeals,
}: Props) {


  const { t, language } = useAppPreferences()

  const locale =
    language === "de"
      ? "de-DE"
      : "en-US"



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

          <p
            className="
            text-sm
            uppercase
            tracking-widest
            text-cyan-400
            "
          >
            Revenue Intelligence
          </p>


          <h2
            className="
            mt-2
            text-2xl
            font-bold
            text-foreground
            "
          >
            Sales Forecast
          </h2>


          <p
            className="
            mt-1
            text-sm
            text-foreground/60
            "
          >
            AI-powered forecast based on pipeline health,
            activity and deal probability.
          </p>

        </div>



        <div
          className="
          rounded-full
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

          {confidence}% confidence

        </div>


      </div>





      <div
        className="
        mt-6
        grid
        gap-4
        md:grid-cols-5
        "
      >


        <Metric
          label="Pipeline"
          value={formatMoney(
            pipelineValue,
            locale
          )}
        />


        <Metric
          label="Commit"
          value={formatMoney(
            commitRevenue,
            locale
          )}
          highlight
        />


        <Metric
          label="Best Case"
          value={formatMoney(
            bestCaseRevenue,
            locale
          )}
        />


        <Metric
          label="Expected"
          value={formatMoney(
            weightedRevenue,
            locale
          )}
          highlight
        />


        <Metric
          label="At Risk"
          value={formatMoney(
            revenueAtRisk,
            locale
          )}
          danger
        />


      </div>





      <div
        className="
        mt-6
        grid
        gap-4
        md:grid-cols-3
        "
      >


        <InsightCard
          title="Pipeline Health"
          value={`${averageHealth}%`}
        />


        <InsightCard
          title="Close Probability"
          value={`${averageProbability}%`}
        />


        <InsightCard
          title="Active Deals"
          value={String(activeDeals)}
        />


      </div>


    </section>

  )

}





function Metric({
  label,
  value,
  highlight,
  danger,
}: {
  label:string
  value:string
  highlight?:boolean
  danger?:boolean
}) {


  return (

    <div
      className={`
      rounded-xl
      bg-surface-2/70
      p-4
      ${danger ? "border border-red-500/20" : ""}
      `}
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
        text-2xl
        font-bold
        ${
          highlight
          ? "text-emerald-400"
          : danger
          ? "text-red-400"
          : "text-foreground"
        }
        `}
      >

        {value}

      </p>


    </div>

  )

}





function InsightCard({
  title,
  value,
}:{
  title:string
  value:string
}) {


  return (

    <div
      className="
      rounded-xl
      border
      border-border-subtle
      bg-surface-2/50
      p-4
      "
    >

      <p
        className="
        text-sm
        text-foreground/55
        "
      >
        {title}
      </p>


      <p
        className="
        mt-2
        text-3xl
        font-bold
        text-foreground
        "
      >
        {value}
      </p>


    </div>

  )

}





function formatMoney(
  value:number,
  locale:string
){

  return (
    "€" +
    Math.round(value)
      .toLocaleString(locale)
  )

}