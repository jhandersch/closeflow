import KpiCard from "@/components/dashboard/KpiCard"

type KPIGridProps = {
  total: number
  openPipeline: number
  revenue: number
  winRate: string
  conversionRate: number
  wonLostLabel: string
}

export default function KPIGrid({ total, openPipeline, revenue, winRate, conversionRate, wonLostLabel }: KPIGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <KpiCard label="Total leads" value={total.toString()} hint="All active opportunities" />
      <KpiCard label="Open pipeline" value={openPipeline.toString()} hint="Deals still in motion" accent="amber" />
      <KpiCard label="Revenue closed" value={`â‚¬${revenue}`} hint="Won business to date" accent="emerald" />
      <KpiCard label="Win rate" value={`${winRate}%`} hint={`Conversion ${conversionRate}% | Won/Lost ${wonLostLabel}`} accent="cyan" />
    </div>
  )
}

