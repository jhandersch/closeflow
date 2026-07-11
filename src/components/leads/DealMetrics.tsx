type DealMetricsProps = {
  dealAge: number
  priorityScore: number
  healthScore: number
  value: number
  stageAge: number
}

export default function DealMetrics({
  dealAge,
  priorityScore,
  healthScore,
  value,
  stageAge,
}: DealMetricsProps) {
  return (
    <div className="rounded-xl bg-[#111] p-6">
      <h2 className="mb-4 text-xl font-semibold">
        Deal Information
      </h2>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">

        <div className="rounded-xl border border-white/10 bg-black/30 p-4">
          <p className="text-2xl">📅</p>
          <p className="mt-3 text-sm text-zinc-500">Deal Age</p>
          <p className="mt-1 text-2xl font-bold text-white">
            {dealAge} days
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/30 p-4">
          <p className="text-2xl">⚡</p>
          <p className="mt-3 text-sm text-zinc-500">Priority</p>
          <p className="mt-1 text-2xl font-bold text-emerald-400">
            {priorityScore}/100
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/30 p-4">
          <p className="text-2xl">❤️</p>
          <p className="mt-3 text-sm text-zinc-500">Health</p>
          <p className="mt-1 text-2xl font-bold text-cyan-400">
            {healthScore}/100
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/30 p-4">
          <p className="text-2xl">💶</p>
          <p className="mt-3 text-sm text-zinc-500">Deal Value</p>
          <p className="mt-1 text-2xl font-bold text-purple-400">
            €{value.toLocaleString("de-DE")}
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/30 p-4">
          <p className="text-2xl">⏳</p>
          <p className="mt-3 text-sm text-zinc-500">
            Time in Stage
          </p>
          <p className="mt-1 text-2xl font-bold text-yellow-400">
            {stageAge} days
          </p>
        </div>

      </div>
    </div>
  )
}