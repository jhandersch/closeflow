import type { SupabaseClient } from "@supabase/supabase-js";
import type { Lead } from "@/types";

type WorkflowAction = {
  type?: string;
  payload?: Record<string, unknown>;
};

export const SUPPORTED_WORKFLOW_TRIGGERS = [
  "lead.created",
  "lead.stage.proposal",
  "lead.stage.won",
  "lead.stage.lost",
] as const;

const text = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

export const workflowEventForStatus = (status: string) =>
  `lead.stage.${status}`;

async function runAction(
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string,
  lead: Lead,
  automationName: string,
  action: WorkflowAction
) {
  const payload = action.payload || {};

  if (action.type === "task.create") {
    const title = text(payload.title, 200);
    if (!title) return "skipped";

    const { data: existing } = await supabase
      .from("tasks")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("lead_id", lead.id)
      .eq("title", title)
      .eq("completed", false)
      .limit(1);

    if (existing && existing.length > 0) return "skipped";

    const { error } = await supabase.from("tasks").insert({
      workspace_id: workspaceId,
      user_id: userId,
      lead_id: lead.id,
      title,
      priority: "medium",
      due_date: new Date(Date.now() + 86400000)
        .toISOString()
        .slice(0, 10),
      completed: false,
    });
    if (error) throw error;
    return "success";
  }

  if (action.type === "notify.user") {
    const message = text(payload.message, 500);
    if (!message) return "skipped";

    const { error } = await supabase.from("activities").insert({
      workspace_id: workspaceId,
      lead_id: lead.id,
      user_id: userId,
      type: "other",
      action: "automation_notice",
      title: `Automation: ${automationName}`.slice(0, 200),
      description: message,
      metadata: { automation: true },
    });
    if (error) throw error;
    return "success";
  }

  // lead.status.update is intentionally not executed to avoid trigger loops.
  return "unsupported";
}

/*
 * Executes enabled, user-defined workflows for a lead event.
 * Each (automation, lead, event, lead.updated_at) is recorded once, so a
 * retry of the same request does not duplicate actions.
 */
export async function runWorkflowAutomations(
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string,
  lead: Lead,
  event: string
) {
  const { data: automations, error } = await supabase
    .from("automations")
    .select("id, name, actions")
    .eq("workspace_id", workspaceId)
    .eq("trigger_event", event)
    .eq("enabled", true);

  if (error || !automations) {
    if (error) console.error("Workflow load failed:", error);
    return [];
  }

  const results: { automationId: string; status: string }[] = [];

  for (const automation of automations) {
    const dedupeKey = `${event}:${lead.id}:${
      (lead as { updated_at?: string }).updated_at || "na"
    }`;

    const { error: claimError } = await supabase
      .from("automation_runs")
      .insert({
        workspace_id: workspaceId,
        automation_id: automation.id,
        status: "running",
        dedupe_key: dedupeKey,
        payload: { event, lead_id: lead.id },
      });

    if (claimError) {
      // 23505 = already executed for this event.
      if (claimError.code !== "23505") {
        console.error("Workflow run claim failed:", claimError);
      }
      continue;
    }

    let status = "success";
    let failure: string | null = null;
    const actions: WorkflowAction[] = Array.isArray(automation.actions)
      ? automation.actions
      : [];

    for (const action of actions) {
      try {
        const outcome = await runAction(
          supabase,
          userId,
          workspaceId,
          lead,
          automation.name,
          action
        );
        if (outcome === "unsupported") status = "partial";
      } catch (actionError) {
        status = "failed";
        failure =
          actionError instanceof Error
            ? actionError.message
            : "Action failed";
        break;
      }
    }

    await supabase
      .from("automation_runs")
      .update({
        status,
        payload: { event, lead_id: lead.id, error: failure },
      })
      .eq("automation_id", automation.id)
      .eq("dedupe_key", dedupeKey);

    results.push({ automationId: automation.id, status });
  }

  return results;
}
