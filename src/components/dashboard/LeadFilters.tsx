type LeadFiltersProps = {
  search: string
  status: string
  sortBy: "created_at" | "value" | "priority"
  onSearchChange: (value: string) => void
  onStatusChange: (value: string) => void
  onSortChange: (value: "created_at" | "value" | "priority") => void
}

export default function LeadFilters({
  search,
  status,
  sortBy,
  onSearchChange,
  onStatusChange,
  onSortChange,
}: LeadFiltersProps) {
  return (
    <div className="grid gap-3 md:grid-cols-[1.3fr_0.7fr_0.7fr]">
      <input
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Search by name or company"
        className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-2 text-sm text-white outline-none"
      />

      <select
        value={status}
        onChange={(event) => onStatusChange(event.target.value)}
        className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-2 text-sm text-white outline-none"
      >
        <option value="all">All stages</option>
        <option value="new">New</option>
        <option value="contacted">Contacted</option>
        <option value="proposal">Proposal</option>
        <option value="won">Won</option>
      </select>

      <select
        value={sortBy}
        onChange={(event) => onSortChange(event.target.value as "created_at" | "value" | "priority")}
        className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-2 text-sm text-white outline-none"
      >
        <option value="priority">Priority</option>
        <option value="value">Value</option>
        <option value="created_at">Newest</option>
      </select>
    </div>
  )
}
