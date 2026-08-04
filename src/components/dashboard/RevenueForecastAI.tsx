import type { RevenueForecastInsight } from "@/types"

type Props = {
  insight: RevenueForecastInsight | null
  isDe?: boolean
  loading?: boolean
}


export default function RevenueForecastAI({
  insight,
  isDe = false,
  loading = false,
}: Props) {


  if (loading) {
    return (
      <div
        className="
        rounded-2xl
        border
        border-border-subtle
        bg-surface-1
        p-6
        animate-pulse
        "
      >
        <div className="h-6 w-64 rounded bg-white/10" />
        <div className="mt-5 h-4 w-full rounded bg-white/10" />
        <div className="mt-2 h-4 w-5/6 rounded bg-white/10" />
      </div>
    )
  }


  if (!insight) return null



  const confidence =
    insight.confidence > 1
      ? Math.round(insight.confidence)
      : Math.round(insight.confidence * 100)



  const healthColor =
    insight.health === "Excellent"
      ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
      : insight.health === "Healthy"
      ? "text-green-400 bg-green-500/10 border-green-500/20"
      : insight.health === "Warning"
      ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
      : "text-red-400 bg-red-500/10 border-red-500/20"



  return (

    <section
      className="
      rounded-2xl
      border
      border-cyan-500/20
      bg-surface-1
      p-6
      "
    >


      {/* HEADER */}

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
            text-xs
            uppercase
            tracking-[0.2em]
            text-cyan-400
            "
          >
            AI Revenue Intelligence
          </p>


          <h2
            className="
            mt-2
            text-2xl
            font-bold
            text-foreground
            "
          >
            {insight.headline}
          </h2>

        </div>



        <div className="flex gap-3">


          <div
            className={`
            rounded-full
            border
            px-3
            py-1
            text-sm
            font-semibold
            ${healthColor}
            `}
          >
            {insight.health}
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
            {confidence}% confidence
          </div>


        </div>

      </div>




      {/* SUMMARY */}

      <div
        className="
        mt-6
        rounded-xl
        bg-surface-2/60
        p-4
        "
      >

        <p
          className="
          text-sm
          leading-7
          text-foreground/80
          "
        >
          {insight.summary}
        </p>

      </div>





      {/* DRIVERS + RISKS */}

      <div
        className="
        mt-6
        grid
        gap-6
        lg:grid-cols-2
        "
      >


        <InsightList
          title="Revenue Drivers"
          items={insight.topDrivers}
          color="emerald"
        />



        <InsightList
          title="Risks"
          items={insight.risks}
          color="amber"
        />


      </div>






      {/* PIPELINE COMMENT */}

      <div
        className="
        mt-6
        rounded-xl
        border
        border-cyan-500/20
        bg-cyan-500/10
        p-4
        "
      >

        <p
          className="
          text-sm
          font-semibold
          text-cyan-300
          "
        >
          Pipeline Analysis
        </p>


        <p
          className="
          mt-2
          text-sm
          leading-7
          text-foreground
          "
        >
          {insight.pipelineComment}
        </p>

      </div>







      {/* RECOMMENDATIONS */}

      <div
        className="
        mt-6
        rounded-xl
        border
        border-border-subtle
        bg-surface-2/60
        p-4
        "
      >

        <p
          className="
          text-sm
          font-semibold
          text-foreground
          "
        >
          Recommended Actions
        </p>


        <ul
          className="
          mt-3
          space-y-2
          "
        >

          {insight.recommendations.map(
            (item) => (

              <li
                key={item}
                className="
                rounded-lg
                border
                border-border-subtle
                bg-surface-1
                px-3
                py-2
                text-sm
                text-foreground/80
                "
              >
                → {item}
              </li>

            )
          )}

        </ul>


      </div>






      {/* DEAL CONCENTRATION */}

      <div
        className="
        mt-6
        text-sm
        text-foreground/60
        "
      >

        Single deal concentration risk:

        <span
          className="
          ml-2
          font-semibold
          text-foreground
          "
        >
          {Math.round(insight.singleDealRisk)}%
        </span>

      </div>



    </section>

  )
}




function InsightList({
  title,
  items,
  color,
}: {
  title:string
  items:string[]
  color:"emerald"|"amber"
}) {


  const styles =
    color === "emerald"
      ? {
          title:"text-emerald-400",
          box:"border-emerald-500/10 bg-emerald-500/5",
        }
      : {
          title:"text-amber-400",
          box:"border-amber-500/10 bg-amber-500/5",
        }



  return (

    <div>

      <h3
        className={`
        font-semibold
        ${styles.title}
        `}
      >
        {title}
      </h3>


      <ul
        className="
        mt-3
        space-y-2
        "
      >

        {
          items.length > 0
            ? items.map(
              item => (

                <li
                  key={item}
                  className={`
                  rounded-lg
                  border
                  px-3
                  py-2
                  text-sm
                  text-foreground/80
                  ${styles.box}
                  `}
                >
                  {item}
                </li>

              )
            )
            :
            (
              <li
                className="
                rounded-lg
                border
                border-border-subtle
                bg-surface-2/60
                px-3
                py-2
                text-sm
                text-foreground/60
                "
              >
                No data available.
              </li>
            )
        }

      </ul>

    </div>

  )
}