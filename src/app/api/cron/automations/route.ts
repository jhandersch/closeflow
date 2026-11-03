import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { TIME_BASED_EVENTS, runTimeBasedEvent } from "@/lib/timeBasedAutomations";

export const maxDuration = 60;

const isAuthorized = (request: Request) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(request.headers.get("authorization") || "");

  return actual.length === expected.length && timingSafeEqual(actual, expected);
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
    .in("trigger_event", TIME_BASED_EVENTS);

  if (error) {
    console.error("Cron automation load failed:", error);
    return NextResponse.json({ error: "Load failed" }, { status: 500 });
  }

  const pairs = new Set<string>();
  for (const automation of automations || []) {
    pairs.add(`${automation.workspace_id}|${automation.trigger_event}`);
  }
  summary.automations = automations?.length || 0;

  for (const pair of pairs) {
    const [workspaceId, event] = pair.split("|");

    try {
      summary.runs += await runTimeBasedEvent(admin, workspaceId, event);
    } catch (cronError) {
      summary.errors += 1;
      console.error("Cron workflow pass failed:", workspaceId, event, cronError);
    }
  }

  return NextResponse.json({ ok: summary.errors === 0, ...summary });
}
