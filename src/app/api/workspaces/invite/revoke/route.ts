import { NextResponse } from "next/server";
import { getRouteUser, requireAal2 } from "@/lib/supabase/route";
import { getWorkspaceUserRole } from "@/lib/supabase/workspaceAuth";

export async function POST(request: Request) {
  const { supabase, user, error } = await getRouteUser(request);

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const workspaceId =
    typeof body.workspace_id === "string" ? body.workspace_id.trim() : "";
  const inviteId =
    typeof body.invite_id === "string" ? body.invite_id.trim() : "";

  if (!workspaceId || !inviteId) {
    return NextResponse.json(
      { error: "workspace_id and invite_id are required" },
      { status: 400 },
    );
  }

  const authz = await requireAal2(request, supabase);

  if (!authz.ok) {
    return NextResponse.json(
      { error: authz.message },
      { status: authz.status },
    );
  }

  const workspaceRole = await getWorkspaceUserRole(
    supabase,
    workspaceId,
    user.id,
  );

  if (!workspaceRole.ok) {
    return NextResponse.json(
      { error: workspaceRole.message },
      { status: workspaceRole.status },
    );
  }

  if (
    workspaceRole.role !== "owner" &&
    workspaceRole.role !== "admin" &&
    workspaceRole.role !== "sales_manager"
  ) {
    return NextResponse.json(
      {
        error: "Only workspace owners, admins, and sales managers can revoke invites.",
      },
      { status: 403 },
    );
  }

  const { data: deleted, error: deleteError } = await supabase
    .from("workspace_invites")
    .delete()
    .eq("id", inviteId)
    .eq("workspace_id", workspaceId)
    .select("id");

  if (deleteError) {
    console.error("REVOKE WORKSPACE INVITE ERROR:", deleteError.message);
    return NextResponse.json(
      { error: "The invitation could not be revoked." },
      { status: 500 },
    );
  }

  if (!deleted || deleted.length === 0) {
    return NextResponse.json({ error: "Invite not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
