import type { SupabaseClient } from "@supabase/supabase-js";

export type LeadNotification = {
  id: string;
  title: string;
  message: string;
  level: "info" | "warning" | "critical";
  leadId: string;
  createdAt: string;
};

/*
 * Leads without activity for 7+ days (14+ = critical). Shared by the
 * notifications tab and the email digest so both always show the same items.
 */
export async function buildIdleLeadNotifications(
  supabase: SupabaseClient,
  workspaceId: string,
  language: "de" | "en",
): Promise<LeadNotification[]> {
  const [leadsResult, activitiesResult] = await Promise.all([
    supabase
      .from("leads")
      .select("id, name, company, created_at, stage_changed_at")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .in("status", ["new", "contacted", "proposal"]),
    supabase
      .from("activities")
      .select("lead_id, created_at")
      .eq("workspace_id", workspaceId),
  ]);

  if (leadsResult.error) throw leadsResult.error;
  if (activitiesResult.error) throw activitiesResult.error;

  const latestActivityByLead = new Map<string, string>();
  for (const activity of activitiesResult.data || []) {
    const current = latestActivityByLead.get(activity.lead_id);
    if (!current || new Date(activity.created_at).getTime() > new Date(current).getTime()) {
      latestActivityByLead.set(activity.lead_id, activity.created_at);
    }
  }

  const notifications: LeadNotification[] = [];
  for (const lead of leadsResult.data || []) {
    const latest = latestActivityByLead.get(lead.id) || lead.stage_changed_at || lead.created_at;
    const idleDays = Math.floor((Date.now() - new Date(latest).getTime()) / 86400000);
    if (idleDays < 7) continue;

    const label = lead.name || lead.company;
    notifications.push({
      id: lead.id,
      title:
        language === "de"
          ? `Lead ${label || "Unbekannt"} benötigt Aufmerksamkeit`
          : `Lead ${label || "Unknown"} needs attention`,
      message:
        language === "de"
          ? `Seit ${idleDays} Tagen ohne Aktivität`
          : `${idleDays} days without activity`,
      level: idleDays >= 14 ? "critical" : "warning",
      leadId: lead.id,
      createdAt: new Date().toISOString(),
    });
  }
  return notifications;
}
