"use client"

type TaskFiltersProps = {
  value: string
  onChange: (value: string) => void
}

const filters = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "completed", label: "Completed" },
  { value: "overdue", label: "Overdue" },
]

export default function TaskFilters({ value, onChange }: TaskFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((filter) => (
        <button
          key={filter.value}
          type="button"
          onClick={() => onChange(filter.value)}
          className={`rounded-full border px-4 py-2 text-sm transition ${
            value === filter.value
              ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
              : "border-border-subtle bg-surface-1 text-foreground/70 hover:bg-foreground/5"
          }`}
        >
          {filter.label}
        </button>
      ))}
    </div>
  )
}
