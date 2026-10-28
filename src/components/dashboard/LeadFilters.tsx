import { translateText } from "@/lib/i18n";
﻿import type { LeadSortBy } from "@/types/lead";

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
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr]">
      <input
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder={translateText("Name, company, email, or phone")}
        className="w-full rounded-xl border border-border-subtle bg-surface-2/90 px-4 py-2 text-sm text-foreground outline-none"
      />

      <select
        value={status}
        onChange={(event) => onStatusChange(event.target.value)}
        className="w-full rounded-xl border border-border-subtle bg-surface-2/90 px-4 py-2 text-sm text-foreground outline-none"
      >
        <option value="all">{translateText("All status")}</option>
        <option value="new">{translateText("New")}</option>
        <option value="contacted">{translateText("Contacted")}</option>
        <option value="proposal">{translateText("Proposal")}</option>
        <option value="won">{translateText("Won")}</option>
        <option value="lost">{translateText("Lost")}</option>
      </select>

      <select
        value={priority}
        onChange={(event) => onPriorityChange(event.target.value)}
        className="w-full rounded-xl border border-border-subtle bg-surface-2/90 px-4 py-2 text-sm text-foreground outline-none"
      >
        <option value="all">{translateText("All priority")}</option>
        <option value="hot">{translateText("Hot")}</option>
        <option value="warm">{translateText("Warm")}</option>
        <option value="cold">{translateText("Cold")}</option>
      </select>

      <select
        value={source}
        onChange={(event) => onSourceChange(event.target.value)}
        className="w-full rounded-xl border border-border-subtle bg-surface-2/90 px-4 py-2 text-sm text-foreground outline-none"
      >
        <option value="all">{translateText("All sources")}</option>
        <option value="website">{translateText("Website")}</option>
        <option value="recommendation">{translateText("Recommendation")}</option>
        <option value="phone">{translateText("Phone")}</option>
        <option value="advertising">{translateText("Advertising")}</option>
        <option value="other">{translateText("Other")}</option>
      </select>

      <select
        value={dateRange}
        onChange={(event) => onDateRangeChange(event.target.value)}
        className="w-full rounded-xl border border-border-subtle bg-surface-2/90 px-4 py-2 text-sm text-foreground outline-none"
      >
        <option value="all">{translateText("All dates")}</option>
        <option value="today">{translateText("Today")}</option>
        <option value="last7">{translateText("Last 7 days")}</option>
        <option value="last30">{translateText("Last 30 days")}</option>
        <option value="older30">{translateText("Older than 30 days")}</option>
      </select>

      <select
        value={owner}
        onChange={(event) => onOwnerChange(event.target.value)}
        className="w-full rounded-xl border border-border-subtle bg-surface-2/90 px-4 py-2 text-sm text-foreground outline-none"
      >
        <option value="all">{translateText("All owners")}</option>
        <option value="mine">{translateText("My leads")}</option>
        <option value="unassigned">{translateText("Unassigned")}</option>
      </select>

      <select
        value={sortBy}
        onChange={(event) =>
          onSortChange(event.target.value as LeadSortBy)
        }
        className="w-full rounded-xl border border-border-subtle bg-surface-2/90 px-4 py-2 text-sm text-foreground outline-none"
      >
        <option value="created_at">{translateText("Newest")}</option>
        <option value="value">{translateText("Highest Value")}</option>
        <option value="priority">{translateText("Highest Priority Score")}</option>
        <option value="health">{translateText("Highest Health Score")}</option>
        <option value="probability">{translateText("Highest Close Chance")}</option>
      </select>
    </div>
  );
}