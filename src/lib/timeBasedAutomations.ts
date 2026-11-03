import type { SupabaseClient } from "@supabase/supabase-js";
import type { Lead } from "@/types";
import { runWorkflowAutomations } from "./workflowAutomations";

export const IDLE_EVENTS: Record<string, number> = {
  "lead.idle_7d": 7,
  "lead.idle_14d": 14,
};
export const TIME_BASED_EVENTS = [...Object.keys(IDLE_EVENTS), "task.overdue"];

const BATCH_LIMIT = 200;

/*
 * Runs one time-based trigger for a workspace. Every (automation, lead/task,
 * event) is recorded once via the dedupe key, so calling this repeatedly
 * (daily cron plus on-demand while the app is open) never duplicates actions.
 * Returns the number of automation runs executed.
 */
export async function runTimeBasedEvent(
  client: SupabaseClient,
  workspaceId: string,
  event: string,
  fallbackUserId: string | null = null
) {
  let runs = 0;

  if (event in IDLE_EVENTS) {
    const cutoff = new Date(Date.now() - IDLE_EVENTS[event] * 86400000).toISOString();

    const { data: leads, error } = await client
      .from("leads")
      .select("*")
      .eq("workspace_id", workspaceId)
      .in("status", ["new", "contacted", "proposal"])
      .is("deleted_at", null)
      .lt("last_activity_at", cutoff)
      .limit(BATCH_LIMIT);
    if (error) throw error;

    for (const lead of leads || []) {
      const results = await runWorkflowAutomations(
        client,
        lead.user_id,
        workspaceId,
        lead as Lead,
        event,
        { dedupeKey: `${event}:${lead.id}:${lead.last_activity_at}` }
      );
      runs += results.length;
    }
  } else if (event === "task.overdue") {
    const today = new Date().toISOString().slice(0, 10);

    const { data: tasks, error } = await client
      .from("tasks")
      .select("id, user_id, lead_id, title, due_date")
      .eq("workspace_id", workspaceId)
      .eq("completed", false)
      .is("deleted_at", null)
      .lt("due_date", today)
      .limit(BATCH_LIMIT);
    if (error) throw error;

    for (const task of tasks || []) {
      let lead: Lead | null = null;

      if (task.lead_id) {
        const { data, error: leadError } = await client
          .from("leads")
          .select("*")
          .eq("id", task.lead_id)
          .eq("workspace_id", workspaceId)
          .is("deleted_at", null)
          .maybeSingle();
        if (leadError) throw leadError;
        lead = (data as Lead | null) ?? null;
        if (!lead) continue;
      } else {
        // Task without a lead: notify using the task title as context.
        lead = { id: null, name: task.title || "" } as unknown as Lead;
      }

      const userId = task.user_id || (lead as { user_id?: string }).user_id || fallbackUserId;
      if (!userId) continue;

      const results = await runWorkflowAutomations(
        client,
        userId,
        workspaceId,
        lead,
        event,
        { dedupeKey: `${event}:${task.id}:${task.due_date}` }
      );
      runs += results.length;
    }
  }

  return runs;
}

/* On-demand pass for one workspace; used when the user opens the app. */
export async function runTimeBasedAutomationsForWorkspace(
  client: SupabaseClient,
  workspaceId: string,
  userId: string
) {
  const { data: automations, error } = await client
    .from("automations")
    .select("trigger_event")
    .eq("workspace_id", workspaceId)
    .eq("enabled", true)
    .in("trigger_event", TIME_BASED_EVENTS);
  if (error) throw error;

  const events = new Set((automations || []).map((item) => item.trigger_event as string));
  for (const event of events) {
    await runTimeBasedEvent(client, workspaceId, event, userId);
  }
}
