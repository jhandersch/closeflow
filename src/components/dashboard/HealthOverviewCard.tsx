type HealthOverviewCardProps = {
  healthyCount: number
  watchlistCount: number
  atRiskCount: number
}

export default function HealthOverviewCard({
  healthyCount,
  watchlistCount,
  atRiskCount,
}: HealthOverviewCardProps) {


  const total =
    healthyCount +
    watchlistCount +
    atRiskCount


  const healthPercentage =
    total > 0
      ? Math.round((healthyCount / total) * 100)
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


      <div className="flex items-center justify-between">


        <div>

          <p className="text-sm text-foreground/65">
            Health Overview
          </p>


          <h2 className="text-lg font-semibold text-foreground">
            AI-powered deal health monitoring
          </h2>

          <p className="mt-1 text-xs text-foreground/50">
            Based on active pipeline deals only (excludes won/lost)
          </p>

        </div>



        <div
          className="
          rounded-full
          border
          border-cyan-500/20
          bg-cyan-500/10
          px-3
          py-1
          text-sm
          font-semibold
          text-cyan-300
          "
        >

          {healthPercentage}% of active deals healthy

        </div>


      </div>




      <div className="mt-5">


        <div className="
          h-3
          overflow-hidden
          rounded-full
          bg-surface-2
        ">


          <div
            className="
            h-full
            rounded-full
            bg-gradient-to-r
            from-emerald-400
            to-cyan-400
            "
            style={{
              width:`${healthPercentage}%`
            }}
          />


        </div>


      </div>




      <div className="mt-5 space-y-3">


        <div className="
          flex
          items-center
          justify-between
          rounded-xl
          border
          border-emerald-500/20
          bg-emerald-500/10
          px-3
          py-2
        ">

          <span className="text-emerald-300">
            Healthy Deals
          </span>

          <span className="font-semibold text-foreground">
            {healthyCount}
          </span>

        </div>



        <div className="
          flex
          items-center
          justify-between
          rounded-xl
          border
          border-amber-500/20
          bg-amber-500/10
          px-3
          py-2
        ">

          <span className="text-amber-300">
            Watchlist
          </span>

          <span className="font-semibold text-foreground">
            {watchlistCount}
          </span>

        </div>




        <div className="
          flex
          items-center
          justify-between
          rounded-xl
          border
          border-rose-500/20
          bg-rose-500/10
          px-3
          py-2
        ">

          <span className="text-rose-300">
            At Risk
          </span>


          <span className="font-semibold text-foreground">
            {atRiskCount}
          </span>

        </div>


      </div>


    </section>

  )
}