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
            AI Sales Intelligence
          </p>


          <h2 className="
            mt-2
            text-2xl
            font-bold
            text-white
          ">
            Lead Analysis
          </h2>

        </div>


        <div className="text-4xl">
          🧠
        </div>

      </div>


      <div className="
        mt-6
        grid
        gap-4
        md:grid-cols-4
      ">


        <ScoreBox
          title="Lead Score"
          value={`${score}`}
          color="text-cyan-400"
        />


        <ScoreBox
          title="Health"
          value={`${health}`}
          color="text-green-400"
        />


        <ScoreBox
          title="Win Chance"
          value={`${probability}%`}
          color="text-purple-400"
        />


        <ScoreBox
          title="Risk"
          value={risk}
          color="text-yellow-400"
        />


      </div>


      <div className="
        mt-6
        rounded-xl
        border
        border-white/10
        bg-black/30
        p-4
      ">

        <p className="text-sm text-zinc-500">
          Recommended Action
        </p>


        <p className="
          mt-2
          text-lg
          font-semibold
          text-white
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
      bg-black/30
      p-4
    ">

      <p className="text-sm text-zinc-500">
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