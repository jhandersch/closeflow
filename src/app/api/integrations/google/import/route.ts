import { NextResponse } from "next/server";

import { GOOGLE_SCOPES, listGoogleCalendarEvents } from "@/lib/integrations/google";
import { getGoogleAccessForUser } from "@/lib/integrations/store";
import {
  denyReadOnlyWrite,
  getRouteUser,
  loadWorkspaceForUser,
} from "@/lib/supabase/route";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function POST(request: Request) {
  const denied = await denyReadOnlyWrite(request);
  if (denied) return denied;

  const { supabase, user, error } = await getRouteUser(request);
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspace } = await loadWorkspaceForUser(supabase, user.id);
  if (!workspace?.id) {
    return NextResponse.json({ error: "Workspace required" }, { status: 403 });
  }

  let items;
  try {
    const accessToken = await getGoogleAccessForUser(user.id, GOOGLE_SCOPES.calendar);
    if (!accessToken) {
      return NextResponse.json(
        { error: "Google Calendar is not connected. Reconnect Google in Settings." },
        { status: 409 },
      );
    }
    const now = Date.now();
    items = await listGoogleCalendarEvents(accessToken, {
      from: new Date(now - 30 * DAY_MS),
      to: new Date(now + 365 * DAY_MS),
    });
  } catch (importError) {
    console.error("Google Calendar import failed:", importError instanceof Error ? importError.message : importError);
    return NextResponse.json(
      { error: "Google Calendar could not be read. Reconnect Google in Settings and try again." },
      { status: 502 },
    );
  }

  if (items.length === 0) {
    return NextResponse.json({ imported: 0, skipped: 0 });
  }

  const { data, error: insertError } = await supabase
    .from("calendar_events")
    .upsert(
      items.map((item) => ({
        workspace_id: workspace.id,
        user_id: user.id,
        title: item.title,
        description: item.description,
        scheduled_at: item.scheduledAt,
        status: "scheduled",
        google_event_id: item.googleEventId,
      })),
      { onConflict: "user_id,google_event_id", ignoreDuplicates: true },
    )
    .select("id");

  if (insertError) {
    console.error("Google Calendar import insert failed:", insertError.message);
    return NextResponse.json({ error: "Could not save the imported events." }, { status: 500 });
  }

  const imported = data?.length ?? 0;
  return NextResponse.json({ imported, skipped: items.length - imported });
}
