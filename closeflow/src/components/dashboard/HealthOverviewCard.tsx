type HealthOverviewCardProps = {
  healthyCount: number
  watchlistCount: number
  atRiskCount: number
}

export default function HealthOverviewCard({ healthyCount, watchlistCount, atRiskCount }: HealthOverviewCardProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#111] p-6" aria-labelledby="health-overview-heading">
      <p className="text-sm text-zinc-400">Health overview</p>
      <h2 id="health-overview-heading" className="text-lg font-semibold text-white">Opportunity wellness</h2>
      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm">
          <span className="text-emerald-300">Healthy</span>
          <span className="font-semibold text-white">{healthyCount}</span>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm">
          <span className="text-amber-300">Watchlist</span>
          <span className="font-semibold text-white">{watchlistCount}</span>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm">
          <span className="text-rose-300">At risk</span>
          <span className="font-semibold text-white">{atRiskCount}</span>
        </div>
      </div>
    </section>
  )
}