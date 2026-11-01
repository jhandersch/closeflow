import { NextResponse } from "next/server";

import { isEncryptionConfigured } from "@/lib/integrations/crypto";
import { isValidSlackWebhookUrl, postSlackMessage } from "@/lib/integrations/slack";
import { deleteIntegration, saveIntegration } from "@/lib/integrations/store";
import { getRouteUser } from "@/lib/supabase/route";

export async function POST(request: Request) {
  const { user, error } = await getRouteUser(request);
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isEncryptionConfigured()) {
    return NextResponse.json({ error: "Integrations are not configured." }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const webhookUrl = typeof body?.webhookUrl === "string" ? body.webhookUrl.trim() : "";
  if (!isValidSlackWebhookUrl(webhookUrl)) {
    return NextResponse.json(
      { error: "Enter a valid Slack webhook URL (https://hooks.slack.com/services/...)." },
      { status: 400 },
    );
  }

  try {
    await postSlackMessage(webhookUrl, "✅ CloseFlow ist jetzt mit diesem Slack-Channel verbunden.");
  } catch (slackError) {
    console.error("Slack test message failed:", slackError);
    return NextResponse.json(
      { error: "Slack did not accept the test message. Check the webhook URL." },
      { status: 502 },
    );
  }

  try {
    await saveIntegration(user.id, "slack", { webhookUrl }, "Slack webhook");
  } catch (saveError) {
    console.error("Slack integration save failed:", saveError);
    return NextResponse.json({ error: "Could not save the Slack connection." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const { user, error } = await getRouteUser(request);
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    await deleteIntegration(user.id, "slack");
  } catch (deleteError) {
    console.error("Slack integration delete failed:", deleteError);
    return NextResponse.json({ error: "Could not disconnect Slack." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
