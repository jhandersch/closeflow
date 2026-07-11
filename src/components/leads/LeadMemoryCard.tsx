type LeadMemory = {
  summary: string
  risk: string
  nextAction: string
  confidence: number
}

type Props = {
  memory: LeadMemory | null
  loading: boolean
}

export default function LeadMemoryCard({
  memory,
  loading,
}: Props) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#111] p-6 animate-pulse">
        <div className="h-5 w-40 rounded bg-white/10" />
        <div className="mt-4 h-4 w-full rounded bg-white/10" />
        <div className="mt-2 h-4 w-5/6 rounded bg-white/10" />
      </div>
    )
  }

  if (!memory) return null

  return (
    <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-transparent p-6">

      <div className="flex items-center gap-3">
        <span className="text-3xl">🧠</span>

        <div>
          <p className="text-sm uppercase tracking-widest text-cyan-400">
            AI Memory
          </p>

          <h2 className="text-2xl font-bold text-white">
            Lead History Analysis
          </h2>
        </div>
      </div>

      <div className="mt-6 space-y-5">

        <div>
          <p className="text-sm text-zinc-500">Summary</p>

          <p className="mt-1 text-white">
            {memory.summary}
          </p>
        </div>

        <div>
          <p className="text-sm text-zinc-500">Risk</p>

          <p className="mt-1 text-yellow-300">
            {memory.risk}
          </p>
        </div>

        <div>
          <p className="text-sm text-zinc-500">Next Action</p>

          <p className="mt-1 text-cyan-300 font-semibold">
            {memory.nextAction}
          </p>
        </div>

        <div className="flex justify-between items-center border-t border-white/10 pt-4">
          <span className="text-zinc-500">
            Confidence
          </span>

          <span className="text-emerald-400 font-bold">
            {Math.round(memory.confidence * 100)}%
          </span>
        </div>

      </div>

    </div>
  )
}