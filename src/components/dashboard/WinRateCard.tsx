type WinRateCardProps = {
  winRate: number
}

export default function WinRateCard({ winRate }: WinRateCardProps) {
  return (
    <section className="rounded-2xl border border-border-subtle bg-surface-1 p-6">
      <p className="text-sm uppercase tracking-widest text-emerald-400">Win Rate</p>
      <h3 className="mt-2 text-sm text-foreground/60">Win Rate</h3>
      <p className="mt-3 text-3xl font-semibold text-foreground">{winRate}%</p>
    </section>
  )
}