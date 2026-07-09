type EngagementCardProps = {
  contactedCount: number
  proposalCount: number
  forecastDelta: number
}

export default function EngagementCard({ contactedCount, proposalCount, forecastDelta }: EngagementCardProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#111] p-6" aria-labelledby="engagement-heading">
      <p className="text-sm text-zinc-400">Engagement signals</p>
      <h2 id="engagement-heading" className="text-lg font-semibold text-white">Follow-up needs</h2>
      <div className="mt-4 space-y-3">
        <div className="rounded-xl border border-orange-500/20 bg-orange-500/10 p-3 text-sm text-orange-300">
          {contactedCount} contacted deals are still waiting for the next step.
        </div>
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-3 text-sm text-cyan-300">
          {proposalCount} proposals are carrying the strongest near-term revenue potential.
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300">
          Forecasted revenue currently exceeds closed revenue by €{forecastDelta}.
        </div>
      </div>
    </section>
  )
}
