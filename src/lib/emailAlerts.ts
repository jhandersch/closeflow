import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "./supabase/admin";
import { sendNotificationEmail } from "./email";
import { normalizeLanguage } from "./i18n";

export const hasEmailConsent = (user: User) =>
  (user.user_metadata?.notifications as { emailAlerts?: unknown } | undefined)?.emailAlerts === true;

export const publicBaseUrl = () => {
  const configured = (process.env.NEXT_PUBLIC_SITE_URL || "").trim().replace(/\/$/, "");
  return configured && !/localhost|127\.0\.0\.1/i.test(configured)
    ? configured
    : "https://www.closeflowapp.de";
};

/*
 * Emails a notification to the user's own account address, but only if the
 * user consented (user_metadata.notifications.emailAlerts). Never throws:
 * an email problem must not break the automation that triggered it.
 */
export async function sendEmailAlert(userId: string, item: { title: string; message: string }) {
  try {
    const { data, error } = await createAdminClient().auth.admin.getUserById(userId);
    const user = data?.user;
    if (error || !user?.email || !hasEmailConsent(user)) return "skipped";

    await sendNotificationEmail({
      to: user.email,
      items: [item],
      language: normalizeLanguage(user.user_metadata?.language),
      baseUrl: publicBaseUrl(),
    });
    return "sent";
  } catch (alertError) {
    console.error(
      "Email alert failed:",
      alertError instanceof Error ? alertError.message : alertError,
    );
    return "failed";
  }
}
