type KpiCardProps = {
  label: string
  value: string
  hint?: string
  accent?: "cyan" | "emerald" | "amber" | "rose"
}

const accentStyles = {
  cyan: "border-cyan-500/20 bg-cyan-500/10 text-cyan-300",
  emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
  amber: "border-amber-500/20 bg-amber-500/10 text-amber-300",
  rose: "border-rose-500/20 bg-rose-500/10 text-rose-300",
}

export default function KpiCard({ label, value, hint, accent = "cyan" }: KpiCardProps) {
  return (
    <div className="cf-card cf-enter p-5">
      <p className="cf-label">{label}</p>
      <p className="cf-kpi mt-2 text-3xl font-semibold text-foreground">{value}</p>
      {hint ? <p className={`mt-2 text-sm ${accentStyles[accent]}`}>{hint}</p> : null}
    </div>
  )
}

