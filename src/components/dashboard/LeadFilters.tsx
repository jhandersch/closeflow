import { useAppPreferences } from "@/components/AppPreferencesProvider"
import type { LeadSortBy } from "@/types"

type LeadSortBy =
  | "created_at"
  | "value"
  | "priority"
  | "health"
  | "probability"

type LeadFiltersProps = {
  search: string
  status: string
  priority: string
  source: string
  dateRange: string
  owner: string
  sortBy: LeadSortBy
  onSearchChange: (value: string) => void
  onStatusChange: (value: string) => void
  onPriorityChange: (value: string) => void
  onSourceChange: (value: string) => void
  onDateRangeChange: (value: string) => void
  onOwnerChange: (value: string) => void
  onSortChange: (value: LeadSortBy) => void
}

export default function LeadFilters({
  search,
  status,
  priority,
  source,
  dateRange,
  owner,
  sortBy,
  onSearchChange,
  onStatusChange,
  onPriorityChange,
  onSourceChange,
  onDateRangeChange,
  onOwnerChange,
  onSortChange,
}: LeadFiltersProps) {
  const { language } = useAppPreferences()
  const isDe = language === "de"

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr]">
      <input
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder={
          isDe
            ? "Name, Firma, E-Mail oder Telefon"
            : "Name, company, email, or phone"
        }
        className="w-full rounded-xl border border-border-subtle bg-surface-2/90 px-4 py-2 text-sm text-foreground outline-none"
      />

      <select
        value={status}
        onChange={(event) => onStatusChange(event.target.value)}
        className="w-full rounded-xl border border-border-subtle bg-surface-2/90 px-4 py-2 text-sm text-foreground outline-none"
      >
        <option value="all">{isDe ? "Alle Status" : "All status"}</option>
        <option value="new">{isDe ? "Neu" : "New"}</option>
        <option value="contacted">{isDe ? "Kontaktiert" : "Contacted"}</option>
        <option value="qualified">{isDe ? "Qualifiziert" : "Qualified"}</option>
        <option value="proposal">{isDe ? "Angebot" : "Proposal"}</option>
        <option value="won">{isDe ? "Gewonnen" : "Won"}</option>
        <option value="lost">{isDe ? "Verloren" : "Lost"}</option>
      </select>

      <select
        value={priority}
        onChange={(event) => onPriorityChange(event.target.value)}
        className="w-full rounded-xl border border-border-subtle bg-surface-2/90 px-4 py-2 text-sm text-foreground outline-none"
      >
        <option value="all">{isDe ? "Alle Prioritäten" : "All priority"}</option>
        <option value="hot">{isDe ? "Hoch" : "Hot"}</option>
        <option value="warm">{isDe ? "Mittel" : "Warm"}</option>
        <option value="cold">{isDe ? "Niedrig" : "Cold"}</option>
      </select>

      <select
        value={source}
        onChange={(event) => onSourceChange(event.target.value)}
        className="w-full rounded-xl border border-border-subtle bg-surface-2/90 px-4 py-2 text-sm text-foreground outline-none"
      >
        <option value="all">
          {isDe ? "Alle Quellen" : "All sources"}
        </option>

        <option value="website">
          Website
        </option>

        <option value="recommendation">
          {isDe ? "Empfehlung" : "Recommendation"}
        </option>

        <option value="phone">
          {isDe ? "Telefon" : "Phone"}
        </option>

        <option value="advertising">
          {isDe ? "Werbung" : "Advertising"}
        </option>

        <option value="other">
          {isDe ? "Sonstiges" : "Other"}
        </option>
      </select>


      <select
        value={dateRange}
        onChange={(event) => onDateRangeChange(event.target.value)}
        className="w-full rounded-xl border border-border-subtle bg-surface-2/90 px-4 py-2 text-sm text-foreground outline-none"
      >
        <option value="all">{isDe ? "Alle Daten" : "All dates"}</option>
        <option value="today">{isDe ? "Heute" : "Today"}</option>
        <option value="last7">{isDe ? "Letzte 7 Tage" : "Last 7 days"}</option>
        <option value="last30">{isDe ? "Letzte 30 Tage" : "Last 30 days"}</option>
        <option value="older30">
          {isDe ? "Älter als 30 Tage" : "Older than 30 days"}
        </option>
      </select>

      <select
        value={owner}
        onChange={(event) => onOwnerChange(event.target.value)}
        className="w-full rounded-xl border border-border-subtle bg-surface-2/90 px-4 py-2 text-sm text-foreground outline-none"
      >
        <option value="all">{isDe ? "Alle Besitzer" : "All owners"}</option>
        <option value="mine">{isDe ? "Meine Leads" : "My leads"}</option>
        <option value="unassigned">
          {isDe ? "Ohne Besitzer" : "Unassigned"}
        </option>
      </select>

      <select
        value={sortBy}
        onChange={(event) =>
          onSortChange(event.target.value as LeadSortBy)
        }
        className="w-full rounded-xl border border-border-subtle bg-surface-2/90 px-4 py-2 text-sm text-foreground outline-none"
      >
        <option value="created_at">
          {isDe ? "Neueste" : "Newest"}
        </option>

        <option value="value">
          {isDe ? "Höchster Wert" : "Highest Value"}
        </option>

        <option value="priority">
          {isDe ? "Höchster Priority Score" : "Highest Priority Score"}
        </option>

        <option value="health">
          {isDe ? "Höchster Health Score" : "Highest Health Score"}
        </option>

        <option value="probability">
          {isDe ? "Höchste Abschlusschance" : "Highest Close Chance"}
        </option>
      </select>
    </div>
  )
}
