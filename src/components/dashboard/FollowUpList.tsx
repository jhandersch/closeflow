import { getHealthScore, getPriorityScore } from "@/lib/scoring";
import { leadDisplayName, leadCompany } from "@/lib/utils";
import type { Lead } from "@/types";
type FollowUpLead = Pick<Lead, "id" | "name" | "company" | "status" | "value" | "created_at" | "stage_changed_at">;
type FollowUpListProps = {
    leads: FollowUpLead[];
};
export default function FollowUpList({ leads }: FollowUpListProps) {
    const reminders = leads
        .filter((lead) => lead.status !== "won")
        .map((lead) => {
        const health = getHealthScore(lead);
        const priority = getPriorityScore(lead);
        const days = Math.max(0, Math.floor((Date.now() - new Date(lead.stage_changed_at || lead.created_at).getTime()) / (1000 * 60 * 60 * 24)));
        return {
            ...lead,
            health,
            priority,
            days,
        };
    })
        .sort((a, b) => b.priority - a.priority)
        .slice(0, 4);
    if (reminders.length === 0) {
        return <p className="text-sm text-foreground/55">No follow-up reminders right now.</p>;
    }
    return (<div className="space-y-3">
      {reminders.map((lead) => (<div key={lead.id} className="rounded-xl border border-border-subtle bg-surface-2/70 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">{leadDisplayName(lead)}</p>
              <p className="text-xs text-foreground/55">{leadCompany(lead)}</p>
            </div>
            <span className="rounded-full bg-amber-500/10 px-2 py-1 text-xs text-amber-300">
              {lead.days}d idle
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-foreground/65">
            <span>Priority {lead.priority}/100</span>
            <span>Health {lead.health}/100</span>
          </div>
        </div>))}
    </div>);
}
