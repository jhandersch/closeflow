type PipelineJourneyProps = {
  status: string
}

const stages = ["new", "contacted", "proposal", "won"]

export default function PipelineJourney({
  status,
}: PipelineJourneyProps) {
  const currentIndex = stages.indexOf(status)

  return (
    <div className="rounded-2xl border border-white/10 bg-[#111] p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">
          Pipeline Journey
        </h2>

        <span className="font-semibold text-cyan-400">
          {status.toUpperCase()}
        </span>
      </div>

      <div className="flex items-center justify-between">
        {stages.map((stage, index) => {
          const completed = index <= currentIndex

          return (
            <div
              key={stage}
              className="flex flex-1 flex-col items-center"
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full font-bold transition ${
                  completed
                    ? "bg-cyan-500 text-black"
                    : "bg-zinc-800 text-zinc-500"
                }`}
              >
                {index + 1}
              </div>

              <p
                className={`mt-3 text-xs ${
                  completed
                    ? "text-cyan-400"
                    : "text-zinc-500"
                }`}
              >
                {stage}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}