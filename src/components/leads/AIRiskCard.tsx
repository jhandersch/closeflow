type AIRiskCardProps = {
  risk: {
    level: string
    title: string
    message: string
    icon: string
  }
}

export default function AIRiskCard({
  risk,
}: AIRiskCardProps) {

  return (
    <div className="rounded-2xl border border-white/10 bg-[#111] p-6">

      <div className="flex items-start gap-4">

        <div className="text-4xl">
          {risk.icon}
        </div>


        <div>

          <p className="
            text-sm
            uppercase
            tracking-widest
            text-zinc-500
          ">
            AI Risk Detection
          </p>


          <h2 className="
            mt-2
            text-xl
            font-bold
            text-white
          ">
            {risk.title}
          </h2>


          <p className="
            mt-2
            text-zinc-400
          ">
            {risk.message}
          </p>


        </div>


        <div
          className={`
            ml-auto
            rounded-full
            px-4
            py-2
            text-sm
            font-semibold

            ${
              risk.level === "high"
                ? "bg-red-500/20 text-red-400"
                : risk.level === "medium"
                ? "bg-yellow-500/20 text-yellow-400"
                : "bg-green-500/20 text-green-400"
            }
          `}
        >
          {risk.level.toUpperCase()}
        </div>


      </div>

    </div>
  )
}