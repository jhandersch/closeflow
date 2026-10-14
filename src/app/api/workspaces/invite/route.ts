import { NextResponse } from "next/server";
import { getRouteUser, requireAal2 } from "@/lib/supabase/route";
import { sendWorkspaceInviteEmail } from "@/lib/email";
import { getWorkspaceUserRole } from "@/lib/supabase/workspaceAuth";

const rolePattern = /^(owner|admin|member|viewer)$/i;

export async function POST(request: Request) {
  const { supabase, user, error } = await getRouteUser(request);

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  const workspaceId =
    typeof body.workspace_id === "string" ? body.workspace_id.trim() : "";

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  const role =
    typeof body.role === "string" && rolePattern.test(body.role)
      ? body.role.toLowerCase()
      : "member";

  if (!workspaceId || !email) {
    return NextResponse.json(
      {
        error: "email is required",
      },
      { status: 400 },
    );
  }

  /*
   * Sensible Workspace-Aktion:
   * AAL2 erforderlich.
   */
  const authz = await requireAal2(request, supabase);

  if (!authz.ok) {
    return NextResponse.json(
      { error: authz.message },
      { status: authz.status },
    );
  }

  /*
   * Check whether the signed-in user
   * is a member of this workspace
   * and which role they have.
   */
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
        error: "Only workspace owners, admins, and sales managers can invite members.",
      },
      { status: 403 },
    );
  }

  const token = crypto.randomUUID();

  const expiresAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data: inviteId, error: inviteError } = await supabase.rpc(
    "create_workspace_invite_with_limit",
    {
      p_workspace_id: workspaceId,
      p_email: email,
      p_role: role,
      p_token: token,
      p_expires_at: expiresAt,
    },
  );

  if (inviteError) {
    console.error("CREATE WORKSPACE INVITE ERROR:", inviteError.message);

    return NextResponse.json(
      {
        error: inviteError.code === "23514"
          ? "The workspace has reached its team seat limit."
          : "The invitation could not be created.",
      },
      { status: inviteError.code === "23514" ? 429 : 500 },
    );
  }
  if (typeof inviteId !== "string") {
    console.error("Create workspace invite RPC returned an invalid identifier.");
    return NextResponse.json(
      { error: "The invitation could not be created." },
      { status: 503 },
    );
  }

  /*
   * Generate invitation link.
   */
  const inviteUrl = `${new URL(request.url).origin}/team?invite=${encodeURIComponent(token)}`;

  /*
   * Send invitation by email.
   */
  try {
    await sendWorkspaceInviteEmail({
      to: email,
      inviteUrl,
      workspaceName: "CloseFlow",
    });
  } catch (emailError) {
    console.error("INVITE EMAIL ERROR:", emailError);

    /*
     * The invitation was already inserted.
     * Remove it again if email delivery fails,
     * so a retry does not hit the unique
     * workspace/email constraint.
     */
    const { error: cleanupError } = await supabase
      .from("workspace_invites")
      .delete()
      .eq("id", inviteId)
      .eq("workspace_id", workspaceId)
      .eq("email", email)
      .eq("token", token);

    if (cleanupError) {
      console.error("INVITE CLEANUP ERROR:", cleanupError);
    }

    return NextResponse.json(
      {
        error: "The invitation could not be sent.",
      },
      {
        status: 500,
      },
    );
  }

  return NextResponse.json({
    ok: true,
    inviteUrl,
  });
}
