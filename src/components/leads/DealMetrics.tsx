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
    <div className="rounded-xl bg-surface-1 p-6">
      <h2 className="mb-4 text-xl font-semibold">
        Deal Information
      </h2>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">

        <div className="rounded-xl border border-border-subtle bg-surface-2/70 p-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-foreground/55">Age</p>
          <p className="mt-3 text-sm text-foreground/55">Deal Age</p>
          <p className="mt-1 text-2xl font-bold text-foreground">
            {dealAge} days
          </p>
        </div>

        <div className="rounded-xl border border-border-subtle bg-surface-2/70 p-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-foreground/55">Score</p>
          <p className="mt-3 text-sm text-foreground/55">Priority</p>
          <p className="mt-1 text-2xl font-bold text-emerald-400">
            {priorityScore}/100
          </p>
        </div>

        <div className="rounded-xl border border-border-subtle bg-surface-2/70 p-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-foreground/55">Health</p>
          <p className="mt-3 text-sm text-foreground/55">Health</p>
          <p className="mt-1 text-2xl font-bold text-cyan-400">
            {healthScore}/100
          </p>
        </div>

        <div className="rounded-xl border border-border-subtle bg-surface-2/70 p-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-foreground/55">Value</p>
          <p className="mt-3 text-sm text-foreground/55">Deal Value</p>
          <p className="mt-1 text-2xl font-bold text-purple-400">
            â‚¬{value.toLocaleString("de-DE")}
          </p>
        </div>

        <div className="rounded-xl border border-border-subtle bg-surface-2/70 p-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-foreground/55">Stage</p>
          <p className="mt-3 text-sm text-foreground/55">
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
