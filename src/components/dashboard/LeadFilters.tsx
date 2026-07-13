type LeadFiltersProps = {
  search: string
  status: string
  priority: string
  source: string
  sortBy: "created_at" | "value" | "priority"
  onSearchChange: (value: string) => void
  onStatusChange: (value: string) => void
  onPriorityChange: (value: string) => void
  onSourceChange: (value: string) => void
  onSortChange: (value: "created_at" | "value" | "priority") => void
}

export default function LeadFilters({
  search,
  status,
  priority,
  source,
  sortBy,
  onSearchChange,
  onStatusChange,
  onPriorityChange,
  onSourceChange,
  onSortChange,
}: LeadFiltersProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_0.8fr]">
      <input
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Search leads..."
        className="w-full rounded-xl border border-border-subtle bg-surface-2/90 px-4 py-2 text-sm text-foreground outline-none"
      />

      <select
        value={status}
        onChange={(event) => onStatusChange(event.target.value)}
        className="w-full rounded-xl border border-border-subtle bg-surface-2/90 px-4 py-2 text-sm text-foreground outline-none"
      >
        <option value="all">All status</option>
        <option value="new">New</option>
        <option value="contacted">Contacted</option>
        <option value="qualified">Qualified</option>
        <option value="proposal">Proposal</option>
        <option value="won">Won</option>
        <option value="lost">Lost</option>
      </select>

      <select
        value={priority}
        onChange={(event) => onPriorityChange(event.target.value)}
        className="w-full rounded-xl border border-border-subtle bg-surface-2/90 px-4 py-2 text-sm text-foreground outline-none"
      >
        <option value="all">All priority</option>
        <option value="hot">Hot</option>
        <option value="warm">Warm</option>
        <option value="cold">Cold</option>
      </select>

      <select
        value={source}
        onChange={(event) => onSourceChange(event.target.value)}
        className="w-full rounded-xl border border-border-subtle bg-surface-2/90 px-4 py-2 text-sm text-foreground outline-none"
      >
        <option value="all">All sources</option>
        <option value="website">Website</option>
        <option value="recommendation">Referral</option>
        <option value="advertising">Ads</option>
        <option value="other">Manual</option>
      </select>

      <select
        value={sortBy}
        onChange={(event) => onSortChange(event.target.value as "created_at" | "value" | "priority")}
        className="w-full rounded-xl border border-border-subtle bg-surface-2/90 px-4 py-2 text-sm text-foreground outline-none"
      >
        <option value="created_at">Newest</option>
        <option value="value">Highest Value</option>
        <option value="priority">Highest Score</option>
      </select>
    </div>
  )
}

