import { NextResponse } from "next/server";
import { getRouteUser, loadWorkspaceForUser } from "@/lib/supabase/route";
import { getWorkspaceUserRole } from "@/lib/supabase/workspaceAuth";

export async function GET(request: Request) {
  const { supabase, user, error } = await getRouteUser(request);
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { workspace } = await loadWorkspaceForUser(supabase, user.id);
  if (!workspace?.id) {
    return NextResponse.json({ items: [] });
  }
  const role = await getWorkspaceUserRole(supabase, workspace.id, user.id);
  if (!role.ok || (role.role !== "owner" && role.role !== "admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const limit = Math.min(Math.max(Number(new URL(request.url).searchParams.get("limit")) || 50, 1), 200);
  const { data, error: queryError } = await supabase
    .from("audit_logs")
    .select("id, actor_user_id, event_type, payload, created_at")
    .eq("workspace_id", workspace.id)
    .not("event_type", "like", "error.%")
    .not("event_type", "like", "ai.%")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (queryError) {
    return NextResponse.json({ error: "Audit log could not be loaded." }, { status: 500 });
  }
  return NextResponse.json({ items: data || [] });
}
