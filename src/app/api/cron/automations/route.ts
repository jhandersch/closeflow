import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { runWorkflowAutomations } from "@/lib/workflowAutomations";
import type { Lead } from "@/types";

export const maxDuration = 60;

const IDLE_EVENTS: Record<string, number> = {
  "lead.idle_7d": 7,
  "lead.idle_14d": 14,
};
const BATCH_LIMIT = 200;

const isAuthorized = (request: Request) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header = request.headers.get("authorization") || "";
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(header);

  return (
    actual.length === expected.length && timingSafeEqual(actual, expected)
  );
};

/*
 * Scheduled executor for time-based workflow triggers.
 * Uses the service role, but every query and action is scoped to the
 * workspace_id of the automation that matched.
 */
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const summary = { automations: 0, runs: 0, errors: 0 };

  const { data: automations, error } = await admin
    .from("automations")
    .select("id, workspace_id, trigger_event")
    .eq("enabled", true)
    .in("trigger_event", [...Object.keys(IDLE_EVENTS), "task.overdue"]);

  if (error) {
    console.error("Cron automation load failed:", error);
    return NextResponse.json({ error: "Load failed" }, { status: 500 });
  }

  const pairs = new Set<string>();
  for (const automation of automations || []) {
    pairs.add(`${automation.workspace_id}|${automation.trigger_event}`);
  }
  summary.automations = automations?.length || 0;

  const today = new Date().toISOString().slice(0, 10);

  for (const pair of pairs) {
    const [workspaceId, event] = pair.split("|");

    try {
      if (event in IDLE_EVENTS) {
        const cutoff = new Date(
          Date.now() - IDLE_EVENTS[event] * 86400000
        ).toISOString();

        const { data: leads } = await admin
          .from("leads")
          .select("*")
          .eq("workspace_id", workspaceId)
          .in("status", ["new", "contacted", "proposal"])
          .is("deleted_at", null)
          .lt("last_activity_at", cutoff)
          .limit(BATCH_LIMIT);

        for (const lead of leads || []) {
          const results = await runWorkflowAutomations(
            admin,
            lead.user_id,
            workspaceId,
            lead as Lead,
            event,
            { dedupeKey: `${event}:${lead.id}:${lead.last_activity_at}` }
          );
          summary.runs += results.length;
        }
      } else if (event === "task.overdue") {
        const { data: tasks } = await admin
          .from("tasks")
          .select("id, user_id, lead_id, due_date")
          .eq("workspace_id", workspaceId)
          .eq("completed", false)
          .is("deleted_at", null)
          .not("lead_id", "is", null)
          .lt("due_date", today)
          .limit(BATCH_LIMIT);

        for (const task of tasks || []) {
          const { data: lead } = await admin
            .from("leads")
            .select("*")
            .eq("id", task.lead_id)
            .eq("workspace_id", workspaceId)
            .is("deleted_at", null)
            .maybeSingle();

          if (!lead) continue;

          const results = await runWorkflowAutomations(
            admin,
            task.user_id || lead.user_id,
            workspaceId,
            lead as Lead,
            event,
            { dedupeKey: `${event}:${task.id}:${task.due_date}` }
          );
          summary.runs += results.length;
        }
      }
    } catch (cronError) {
      summary.errors += 1;
      console.error("Cron workflow pass failed:", workspaceId, event, cronError);
    }
  }

  return NextResponse.json({ ok: summary.errors === 0, ...summary });
}
