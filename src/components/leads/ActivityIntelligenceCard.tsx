"use client"

type Props = {
  insight: {
    health: string
    risk: string
    summary: string
    recommendation: string
    confidence: number
  } | null

  loading: boolean
}


export default function ActivityIntelligenceCard({
  insight,
  loading,
}: Props) {


  if (loading) {
    return (
      <div className="
        rounded-2xl
        border
        border-white/10
        bg-[#111]
        p-6
        animate-pulse
      ">
        <div className="h-5 w-48 rounded bg-white/10" />
        <div className="mt-4 h-20 rounded bg-white/10" />
      </div>
    )
  }


  if (!insight) {
    return null
  }


  return (

    <div className="
      rounded-2xl
      border
      border-blue-500/20
      bg-gradient-to-br
      from-blue-500/10
      via-cyan-500/5
      to-transparent
      p-6
    ">


      <div className="flex items-center justify-between">

        <div>

          <p className="
            text-xs
            uppercase
            tracking-widest
            text-cyan-400
          ">
            Activity Intelligence
          </p>


          <h2 className="
            mt-2
            text-2xl
            font-bold
            text-white
          ">
            Sales Activity Analysis
          </h2>

        </div>


        <div className="text-4xl">
          📊
        </div>

      </div>



      <div className="
        mt-6
        grid
        gap-4
        md:grid-cols-2
      ">


        <div className="
          rounded-xl
          bg-black/30
          p-4
        ">

          <p className="text-sm text-zinc-500">
            Health
          </p>

          <p className="
            mt-2
            text-xl
            font-bold
            text-emerald-400
          ">
            {insight.health}
          </p>

        </div>



        <div className="
          rounded-xl
          bg-black/30
          p-4
        ">

          <p className="text-sm text-zinc-500">
            Risk
          </p>

          <p className="
            mt-2
            text-xl
            font-bold
            text-yellow-400
          ">
            {insight.risk}
          </p>

        </div>


      </div>



      <div className="
        mt-5
        rounded-xl
        border
        border-white/10
        bg-black/30
        p-4
      ">

        <p className="text-sm text-zinc-500">
          AI Summary
        </p>


        <p className="
          mt-2
          text-white
        ">
          {insight.summary}
        </p>


      </div>



      <div className="
        mt-4
        rounded-xl
        border
        border-cyan-500/20
        bg-cyan-500/10
        p-4
      ">

        <p className="
          text-sm
          text-cyan-300
        ">
          Recommended Action
        </p>


        <p className="
          mt-2
          font-semibold
          text-white
        ">
          {insight.recommendation}
        </p>


      </div>



      <div className="
        mt-5
        text-sm
        text-zinc-400
      ">

        AI Confidence:

        <span className="
          ml-2
          font-bold
          text-cyan-400
        ">
          {Math.round(insight.confidence * 100)}%
        </span>

      </div>


    </div>

  )

}