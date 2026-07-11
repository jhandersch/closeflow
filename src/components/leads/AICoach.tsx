type AICoachProps = {
  title: string
  message: string
  reasons: string[]
  action: string
  confidence: number
}

export default function AICoach({
  title,
  message,
  reasons,
  action,
  confidence,
}: AICoachProps) {
  return (
    <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-transparent p-6">

      <div className="flex items-start gap-4">

        <div className="text-4xl">
          🤖
        </div>

        <div className="flex-1">

          <p className="text-sm uppercase tracking-widest text-cyan-400">
            AI Coach
          </p>

          <h2 className="mt-2 text-2xl font-bold text-white">
            {title}
          </h2>

          <p className="mt-3 text-zinc-300">
            {message}
          </p>


          <div className="mt-4 space-y-2">

            {reasons.map((reason) => (
              <div
                key={reason}
                className="rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-zinc-300"
              >
                ✓ {reason}
              </div>
            ))}

          </div>


          <div className="mt-5 flex items-center justify-between">

            <div>
              <p className="text-xs text-zinc-500">
                Recommended action
              </p>

              <p className="mt-1 font-semibold text-white">
                {action}
              </p>
            </div>


            <div className="rounded-full bg-green-500/20 px-4 py-2 text-sm font-semibold text-green-400">
              {confidence}% confidence
            </div>

          </div>

        </div>

      </div>

    </div>
  )
}