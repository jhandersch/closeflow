import { useAppPreferences } from "@/components/AppPreferencesProvider";
import type { LeadSortBy } from "@/types/lead";
type LeadFiltersProps = {
    search: string;
    status: string;
    priority: string;
    source: string;
    dateRange: string;
    owner: string;
    sortBy: LeadSortBy;
    onSearchChange: (value: string) => void;
    onStatusChange: (value: string) => void;
    onPriorityChange: (value: string) => void;
    onSourceChange: (value: string) => void;
    onDateRangeChange: (value: string) => void;
    onOwnerChange: (value: string) => void;
    onSortChange: (value: LeadSortBy) => void;
};
export default function LeadFilters({ search, status, priority, source, dateRange, owner, sortBy, onSearchChange, onStatusChange, onPriorityChange, onSourceChange, onDateRangeChange, onOwnerChange, onSortChange, }: LeadFiltersProps) {
    const { language } = useAppPreferences();
    return (<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr]">
      <input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder={"Name, company, email, or phone"} className="w-full rounded-xl border border-border-subtle bg-surface-2/90 px-4 py-2 text-sm text-foreground outline-none"/>

      <select value={status} onChange={(event) => onStatusChange(event.target.value)} className="w-full rounded-xl border border-border-subtle bg-surface-2/90 px-4 py-2 text-sm text-foreground outline-none">
        <option value="all">{"All status"}</option>
        <option value="new">{"New"}</option>
        <option value="contacted">{"Contacted"}</option>
        <option value="proposal">{"Proposal"}</option>
        <option value="won">{"Won"}</option>
        <option value="lost">{"Lost"}</option>
      </select>

      <select value={priority} onChange={(event) => onPriorityChange(event.target.value)} className="w-full rounded-xl border border-border-subtle bg-surface-2/90 px-4 py-2 text-sm text-foreground outline-none">
        <option value="all">{"All priority"}</option>
        <option value="hot">{"Hot"}</option>
        <option value="warm">{"Warm"}</option>
        <option value="cold">{"Cold"}</option>
      </select>

      <select value={source} onChange={(event) => onSourceChange(event.target.value)} className="w-full rounded-xl border border-border-subtle bg-surface-2/90 px-4 py-2 text-sm text-foreground outline-none">
        <option value="all">
          {"All sources"}
        </option>

        <option value="website">
          Website
        </option>

        <option value="recommendation">
          {"Recommendation"}
        </option>

        <option value="phone">
          {"Phone"}
        </option>

        <option value="advertising">
          {"Advertising"}
        </option>

        <option value="other">
          {"Other"}
        </option>
      </select>


      <select value={dateRange} onChange={(event) => onDateRangeChange(event.target.value)} className="w-full rounded-xl border border-border-subtle bg-surface-2/90 px-4 py-2 text-sm text-foreground outline-none">
        <option value="all">{"All dates"}</option>
        <option value="today">{"Today"}</option>
        <option value="last7">{"Last 7 days"}</option>
        <option value="last30">{"Last 30 days"}</option>
        <option value="older30">
          {"Older than 30 days"}
        </option>
      </select>

      <select value={owner} onChange={(event) => onOwnerChange(event.target.value)} className="w-full rounded-xl border border-border-subtle bg-surface-2/90 px-4 py-2 text-sm text-foreground outline-none">
        <option value="all">{"All owners"}</option>
        <option value="mine">{"My leads"}</option>
        <option value="unassigned">
          {"Unassigned"}
        </option>
      </select>

      <select value={sortBy} onChange={(event) => onSortChange(event.target.value as LeadSortBy)} className="w-full rounded-xl border border-border-subtle bg-surface-2/90 px-4 py-2 text-sm text-foreground outline-none">
        <option value="created_at">
          {"Newest"}
        </option>

        <option value="value">
          {"Highest Value"}
        </option>

        <option value="priority">
          {"Highest Priority Score"}
        </option>

        <option value="health">
          {"Highest Health Score"}
        </option>

        <option value="probability">
          {"Highest Close Chance"}
        </option>
      </select>
    </div>);
}
