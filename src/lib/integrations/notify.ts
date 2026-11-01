import { loadIntegration } from "./store";
import { isEncryptionConfigured } from "./crypto";
import { postSlackMessage } from "./slack";

/** Best-effort Slack notification; never throws so CRM writes are not affected. */
export async function notifySlack(userId: string, text: string) {
  if (!isEncryptionConfigured()) return;
  try {
    const integration = await loadIntegration<{ webhookUrl: string }>(userId, "slack");
    if (!integration) return;
    await postSlackMessage(integration.credentials.webhookUrl, text);
  } catch (error) {
    console.error("Slack notification failed:", error instanceof Error ? error.message : error);
  }
}
