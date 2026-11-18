import { NextResponse } from "next/server";
import { denyReadOnlyWrite, getRouteUser, loadWorkspaceForUser } from "@/lib/supabase/route";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { isUuid } from "@/lib/requestValidation";

export async function POST(request: Request) {
  const denied = await denyReadOnlyWrite(request);
  if (denied) return denied;
  const { supabase, user, error } = await getRouteUser(request);
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = await checkRateLimit(`calendar:write:${user.id}`, {
    limit: 60,
    windowMs: 10 * 60 * 1000,
  });
  if (!limited.success) return rateLimitResponse(limited);

  const id = new URL(request.url).searchParams.get("id");
  if (!id || !isUuid(id)) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const { workspace } = await loadWorkspaceForUser(supabase, user.id);
  if (!workspace?.id) {
    return NextResponse.json({ error: "Workspace required" }, { status: 403 });
  }

  const { data, error: restoreError } = await supabase
    .from("calendar_events")
    .update({ deleted_at: null, deleted_with_lead: false, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("workspace_id", workspace.id)
    .eq("user_id", user.id)
    .not("deleted_at", "is", null)
    .select("id")
    .maybeSingle();

  if (restoreError) {
    console.error("CALENDAR EVENT RESTORE ERROR:", restoreError.message);
    return NextResponse.json({ error: "Could not restore calendar event." }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Deleted event not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, restored: id });
}
