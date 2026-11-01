const SLACK_WEBHOOK_PATTERN = /^https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+$/;

export const isValidSlackWebhookUrl = (value: unknown): value is string =>
  typeof value === "string" && SLACK_WEBHOOK_PATTERN.test(value.trim());

export async function postSlackMessage(webhookUrl: string, text: string, fetchImpl: typeof fetch = fetch) {
  if (!isValidSlackWebhookUrl(webhookUrl)) throw new Error("Invalid Slack webhook URL.");
  const response = await fetchImpl(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: text.slice(0, 3000) }),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`Slack rejected the message (${response.status}).`);
}
