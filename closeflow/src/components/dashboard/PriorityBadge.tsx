type PriorityBadgeProps = {
  score: number
}

export default function PriorityBadge({
  score,
}: PriorityBadgeProps) {
  const color =
    score >= 80
      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
      : score >= 50
      ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      : "bg-red-500/20 text-red-400 border-red-500/30"

  const label =
    score >= 80
      ? "High"
      : score >= 50
      ? "Medium"
      : "Low"

  return (
    <div className="flex flex-col items-center">
      <span
        className={`rounded-full border px-4 py-2 text-sm font-semibold ${color}`}
      >
        {label}
      </span>

      <p className="mt-2 text-2xl font-bold text-white">
        {score}
      </p>

      <p className="text-xs text-zinc-500">
        Priority
      </p>
    </div>
  )
}