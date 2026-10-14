import { NextResponse } from "next/server";
import { getRouteUser } from "@/lib/supabase/route";
export async function POST(request: Request) {
    try {
        const { supabase, user, error: authError, } = await getRouteUser(request);
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const body = await request.json();
        const token = typeof body.token === "string"
            ? body.token.trim()
            : "";
        if (!token) {
            return NextResponse.json({ error: "Invite token is required" }, { status: 400 });
        }
        /*
         * Load the invitation by token.
         */
        const { data: invite, error: inviteError, } = await supabase
            .from("workspace_invites")
            .select("*")
            .eq("token", token)
            .maybeSingle();
        if (inviteError) {
            console.error("LOAD INVITE ERROR:", inviteError);
            return NextResponse.json({ error: inviteError.message }, { status: 500 });
        }
        if (!invite) {
            return NextResponse.json({
                error: "Invitation not found or invalid",
            }, { status: 404 });
        }
        /*
         * Check the expiration date.
         */
        if (invite.expires_at &&
            new Date(invite.expires_at).getTime() <
                Date.now()) {
            return NextResponse.json({ error: "Invitation has expired" }, { status: 410 });
        }
        /*
         * Einladung muss an die aktuell
         * signed-in email address.
         */
        const userEmail = user.email?.trim().toLowerCase();
        const inviteEmail = typeof invite.email === "string"
            ? invite.email.trim().toLowerCase()
            : "";
        if (!userEmail ||
            !inviteEmail ||
            userEmail !== inviteEmail) {
            return NextResponse.json({
                error: "This invitation was sent to a different email address.",
            }, { status: 403 });
        }
        const { data: acceptance, error: acceptanceError } = await supabase.rpc(
            "accept_workspace_invite_with_limit",
            { p_token: token },
        );
        if (acceptanceError) {
            console.error("ACCEPT WORKSPACE INVITE ERROR:", acceptanceError.message);
            const isSeatLimit = acceptanceError.code === "23514";
            return NextResponse.json(
                {
                    error: isSeatLimit
                        ? "The workspace has reached its team seat limit."
                        : "The invitation could not be accepted.",
                },
                { status: isSeatLimit ? 429 : acceptanceError.code === "42501" ? 403 : 500 },
            );
        }
        const accepted = Array.isArray(acceptance) ? acceptance[0] : acceptance;
        if (!accepted || accepted.workspace_id !== invite.workspace_id) {
            console.error("Accept workspace invite RPC returned an invalid response.");
            return NextResponse.json(
                { error: "The invitation could not be accepted." },
                { status: 503 },
            );
        }
        return NextResponse.json({
            ok: true,
            alreadyMember: accepted.already_member === true,
            workspaceId: accepted.workspace_id,
        });
    }
    catch (error) {
        console.error("ACCEPT INVITE CRASH:", error);
        return NextResponse.json({
            error: error instanceof Error
                ? error.message
                : "Internal Server Error",
        }, { status: 500 });
    }
}
