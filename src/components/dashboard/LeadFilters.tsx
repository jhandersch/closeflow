import { useAppPreferences } from "@/components/AppPreferencesProvider"

type LeadFiltersProps = {
  search: string
  status: string
  priority: string
  source: string
  dateRange: string
  owner: string
  sortBy: "created_at" | "value" | "priority"
  onSearchChange: (value: string) => void
  onStatusChange: (value: string) => void
  onPriorityChange: (value: string) => void
  onSourceChange: (value: string) => void
  onDateRangeChange: (value: string) => void
  onOwnerChange: (value: string) => void
  onSortChange: (value: "created_at" | "value" | "priority") => void
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
        placeholder={isDe ? "Name, Firma, E-Mail oder Telefon" : "Name, company, email, or phone"}
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
        <option value="all">{isDe ? "Alle Quellen" : "All sources"}</option>
        <option value="website">{isDe ? "Website" : "Website"}</option>
        <option value="recommendation">{isDe ? "Empfehlung" : "Referral"}</option>
        <option value="advertising">{isDe ? "Werbung" : "Ads"}</option>
        <option value="other">{isDe ? "Manuell" : "Manual"}</option>
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
        <option value="older30">{isDe ? "Aelter als 30 Tage" : "Older than 30 days"}</option>
      </select>

      <select
        value={owner}
        onChange={(event) => onOwnerChange(event.target.value)}
        className="w-full rounded-xl border border-border-subtle bg-surface-2/90 px-4 py-2 text-sm text-foreground outline-none"
      >
        <option value="all">{isDe ? "Alle Besitzer" : "All owners"}</option>
        <option value="mine">{isDe ? "Meine Leads" : "My leads"}</option>
        <option value="unassigned">{isDe ? "Ohne Besitzer" : "Unassigned"}</option>
      </select>

      <select
        value={sortBy}
        onChange={(event) => onSortChange(event.target.value as "created_at" | "value" | "priority")}
        className="w-full rounded-xl border border-border-subtle bg-surface-2/90 px-4 py-2 text-sm text-foreground outline-none"
      >
        <option value="created_at">{isDe ? "Neueste" : "Newest"}</option>
        <option value="value">{isDe ? "Höchster Wert" : "Highest Value"}</option>
        <option value="priority">{isDe ? "Höchster Score" : "Highest Score"}</option>
      </select>
    </div>
  )
}

