import { NextResponse } from "next/server";
import { getRouteUser, loadWorkspaceForUser } from "@/lib/supabase/route";

export async function POST(request: Request) {
  const { supabase, user, error } = await getRouteUser(request);
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
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
    return NextResponse.json({ error: restoreError.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Deleted event not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, restored: id });
}
