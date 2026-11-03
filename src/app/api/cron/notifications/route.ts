import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendNotificationEmail } from "@/lib/email";
import { hasEmailConsent, publicBaseUrl } from "@/lib/emailAlerts";
import { normalizeLanguage } from "@/lib/i18n";
import { buildIdleLeadNotifications } from "@/lib/leadNotifications";

export const maxDuration = 60;

const PAGE_SIZE = 200;
const MAX_PAGES = 10;
const MAX_WORKSPACES_PER_USER = 5;
const LEVEL_RANK: Record<string, number> = { info: 1, warning: 2, critical: 3 };
const rank = (level: string | undefined) => (level ? LEVEL_RANK[level] ?? 0 : 0);

const isAuthorized = (request: Request) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(request.headers.get("authorization") || "");

  return actual.length === expected.length && timingSafeEqual(actual, expected);
};

/*
 * Daily email digest of the notifications shown in the notifications tab,
 * sent only to users who opted in. A lead is emailed once per level
 * (warning, then critical), tracked in user_metadata.emailed_alerts.
 */
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const summary = { users: 0, emails: 0, errors: 0 };
  const baseUrl = publicBaseUrl();

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
    if (error) {
      console.error("Notification cron user load failed:", error.message);
      return NextResponse.json({ error: "Load failed" }, { status: 500 });
    }

    for (const user of data.users) {
      if (!user.email || !hasEmailConsent(user)) continue;
      summary.users += 1;

      try {
        const language = normalizeLanguage(user.user_metadata?.language) === "de" ? "de" : "en";
        const sent = (user.user_metadata?.emailed_alerts ?? {}) as Record<string, string>;

        const { data: memberships, error: membershipError } = await admin
          .from("workspace_members")
          .select("workspace_id")
          .eq("user_id", user.id)
          .limit(MAX_WORKSPACES_PER_USER);
        if (membershipError) throw membershipError;

        // Leads that are active again drop out of "next", so they can notify again later.
        const next: Record<string, string> = {};
        const fresh: { title: string; message: string }[] = [];

        for (const membership of memberships || []) {
          const notifications = await buildIdleLeadNotifications(admin, membership.workspace_id, language);
          for (const item of notifications) {
            const isNew = rank(item.level) > rank(sent[item.leadId]);
            next[item.leadId] = isNew ? item.level : sent[item.leadId];
            if (isNew) fresh.push({ title: item.title, message: item.message });
          }
        }

        if (fresh.length > 0) {
          await sendNotificationEmail({ to: user.email, items: fresh, language, baseUrl });
          summary.emails += 1;
        }

        if (JSON.stringify(next) !== JSON.stringify(sent)) {
          await admin.auth.admin.updateUserById(user.id, {
            user_metadata: { emailed_alerts: next },
          });
        }
      } catch (userError) {
        summary.errors += 1;
        console.error("Notification cron failed for a user:", userError instanceof Error ? userError.message : userError);
      }
    }

    if (data.users.length < PAGE_SIZE) break;
  }

  return NextResponse.json({ ok: summary.errors === 0, ...summary });
}
