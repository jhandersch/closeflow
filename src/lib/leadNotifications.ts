import type { SupabaseClient } from "@supabase/supabase-js";

export type LeadNotification = {
  id: string;
  title: string;
  message: string;
  level: "info" | "warning" | "critical";
  leadId: string;
  createdAt: string;
};

/* Automation events of the last 14 days, shown as info notifications. */
export async function buildAutomationNotifications(
  supabase: SupabaseClient,
  workspaceId: string,
  language: "de" | "en",
): Promise<LeadNotification[]> {
  const since = new Date(Date.now() - 14 * 86400000).toISOString();
  const { data, error } = await supabase
    .from("activities")
    .select("id, lead_id, title, description, created_at")
    .eq("workspace_id", workspaceId)
    .eq("action", "automation_notice")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;

  return (data || []).map((row) => {
    const description = row.description || "";
    const taskTitle = description.startsWith("Task created: ")
      ? description.slice("Task created: ".length)
      : null;
    const newStatus = description.startsWith("Status changed to ")
      ? description.slice("Status changed to ".length)
      : null;
    const statusDe: Record<string, string> = {
      new: "Neu", contacted: "Kontaktiert", proposal: "Angebot", won: "Gewonnen", lost: "Verloren",
    };
    return {
      id: `automation-${row.id}`,
      title: row.title || "Automation",
      message:
        language === "de" && taskTitle !== null
          ? `Aufgabe erstellt: ${taskTitle}`
          : language === "de" && newStatus !== null
            ? `Status geändert auf ${statusDe[newStatus] ?? newStatus}`
            : description,
      level: "info" as const,
      leadId: row.lead_id || "",
      createdAt: row.created_at,
    };
  });
}

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
