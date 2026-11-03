import { createAdminClient } from "./supabase/admin";
import { GOOGLE_SCOPES, sendGmail } from "./integrations/google";
import { getGoogleAccessForUser } from "./integrations/store";

type AlertInput = { subject: string; body: string };

/*
 * Sends an alert to the user's own address through the user's own Gmail
 * connection. Only runs if the user opted in (notifications.emailAlerts)
 * and granted the gmail.send scope. Never throws: an alert must not break
 * the automation that triggered it.
 */
export async function sendEmailAlert(userId: string, input: AlertInput) {
  try {
    const { data, error } = await createAdminClient().auth.admin.getUserById(userId);
    if (error || !data.user?.email) return "skipped";

    const notifications = data.user.user_metadata?.notifications as
      | { emailAlerts?: unknown }
      | undefined;
    if (notifications?.emailAlerts !== true) return "skipped";

    const accessToken = await getGoogleAccessForUser(userId, GOOGLE_SCOPES.gmail);
    if (!accessToken) return "skipped";

    await sendGmail(accessToken, {
      to: data.user.email,
      subject: input.subject.slice(0, 200),
      body: input.body.slice(0, 2000),
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
