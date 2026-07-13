"use client"

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


  return (
    <div className="
      rounded-2xl
      border
      border-border-subtle
      bg-surface-1
      p-6
    ">

      <div className="flex items-center justify-between">

        <div>
          <p className="text-sm uppercase tracking-widest text-cyan-400">
            Revenue Intelligence
          </p>

          <h2 className="mt-2 text-2xl font-bold text-foreground">
            Forecast
          </h2>
        </div>

        <div className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
          Forecast
        </div>

      </div>


      <div className="mt-6 grid gap-4 md:grid-cols-3">


        <div className="rounded-xl bg-surface-2/70 p-4">

          <p className="text-sm text-foreground/55">
            Pipeline Value
          </p>

          <p className="mt-2 text-3xl font-bold text-foreground">
            â‚¬
            {pipelineValue.toLocaleString("de-DE")}
          </p>

        </div>



        <div className="rounded-xl bg-surface-2/70 p-4">

          <p className="text-sm text-foreground/55">
            Expected Revenue
          </p>

          <p className="mt-2 text-3xl font-bold text-emerald-400">
            â‚¬
            {Math.round(weightedRevenue).toLocaleString("de-DE")}
          </p>

        </div>



        <div className="rounded-xl bg-surface-2/70 p-4">

          <p className="text-sm text-foreground/55">
            Revenue At Risk
          </p>

          <p className="mt-2 text-3xl font-bold text-red-400">
            â‚¬
            {revenueAtRisk.toLocaleString("de-DE")}
          </p>

        </div>


      </div>


    </div>
  )
}
