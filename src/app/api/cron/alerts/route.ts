import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendOperatorAlertEmail } from "@/lib/email";
import { detectErrorSpike, parseThreshold } from "@/lib/alerting";
import { publicBaseUrl } from "@/lib/emailAlerts";

export const maxDuration = 60;

const WINDOW_HOURS = 24;
const MAX_ROWS = 5000;

const isAuthorized = (request: Request) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(request.headers.get("authorization") || "");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
};

/*
 * Daily operator alert: emails CLOSEFLOW_ALERT_EMAIL when the number of
 * captured errors in the last 24 hours reaches CLOSEFLOW_ALERT_ERROR_THRESHOLD
 * (default 25). The mail contains counts only, no user data or messages.
 */
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const since = new Date(Date.now() - WINDOW_HOURS * 60 * 60 * 1000).toISOString();
  const { data, error } = await createAdminClient()
    .from("audit_logs")
    .select("event_type, created_at")
    .like("event_type", "error.%")
    .gte("created_at", since)
    .limit(MAX_ROWS);

  if (error) {
    console.error("Alert cron load failed:", error.message);
    return NextResponse.json({ error: "Load failed" }, { status: 500 });
  }

  const spike = detectErrorSpike(data || [], parseThreshold(process.env.CLOSEFLOW_ALERT_ERROR_THRESHOLD), WINDOW_HOURS);
  if (!spike) {
    return NextResponse.json({ ok: true, alert: false, errors: (data || []).length });
  }

  const to = process.env.CLOSEFLOW_ALERT_EMAIL;
  if (!to) {
    console.error("Error spike detected but CLOSEFLOW_ALERT_EMAIL is not set.", spike);
    return NextResponse.json({ ok: true, alert: true, sent: false });
  }

  try {
    await sendOperatorAlertEmail({
      to,
      subject: `CloseFlow: ${spike.total} errors in the last ${spike.windowHours} hours`,
      lines: [
        `${spike.total} errors were captured in the last ${spike.windowHours} hours (threshold ${spike.threshold}).`,
        ...Object.entries(spike.byType).map(([type, count]) => `${type}: ${count}`),
        `Details: ${publicBaseUrl()}/settings/monitoring`,
      ],
    });
  } catch (sendError) {
    console.error("Alert email failed:", sendError instanceof Error ? sendError.message : sendError);
    return NextResponse.json({ ok: true, alert: true, sent: false });
  }
  return NextResponse.json({ ok: true, alert: true, sent: true });
}
