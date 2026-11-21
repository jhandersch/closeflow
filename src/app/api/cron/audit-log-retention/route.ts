import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { purgeExpiredAuditLogs } from "@/lib/auditLogRetention";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

const isAuthorized = (request: Request) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(request.headers.get("authorization") || "");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
};

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await purgeExpiredAuditLogs(createAdminClient());
    return NextResponse.json({ ok: true, retentionMonths: 12, ...result });
  } catch (error) {
    console.error(
      "Audit log retention cron failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return NextResponse.json(
      { error: "Audit log retention failed." },
      { status: 500 },
    );
  }
}
