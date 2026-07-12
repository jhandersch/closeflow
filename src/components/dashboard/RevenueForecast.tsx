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
      border-white/10
      bg-[#111]
      p-6
    ">

      <div className="flex items-center justify-between">

        <div>
          <p className="text-sm uppercase tracking-widest text-cyan-400">
            Revenue Intelligence
          </p>

          <h2 className="mt-2 text-2xl font-bold text-white">
            Forecast
          </h2>
        </div>

        <div className="text-4xl">
          📈
        </div>

      </div>


      <div className="mt-6 grid gap-4 md:grid-cols-3">


        <div className="rounded-xl bg-black/30 p-4">

          <p className="text-sm text-zinc-500">
            Pipeline Value
          </p>

          <p className="mt-2 text-3xl font-bold text-white">
            €
            {pipelineValue.toLocaleString("de-DE")}
          </p>

        </div>



        <div className="rounded-xl bg-black/30 p-4">

          <p className="text-sm text-zinc-500">
            Expected Revenue
          </p>

          <p className="mt-2 text-3xl font-bold text-emerald-400">
            €
            {Math.round(weightedRevenue).toLocaleString("de-DE")}
          </p>

        </div>



        <div className="rounded-xl bg-black/30 p-4">

          <p className="text-sm text-zinc-500">
            Revenue At Risk
          </p>

          <p className="mt-2 text-3xl font-bold text-red-400">
            €
            {revenueAtRisk.toLocaleString("de-DE")}
          </p>

        </div>


      </div>


    </div>
  )
}