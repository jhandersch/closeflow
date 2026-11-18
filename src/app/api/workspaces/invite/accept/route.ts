import { NextResponse } from "next/server";
import { getRouteUser } from "@/lib/supabase/route";
import { recordAuditEvent } from "@/lib/auditLog";
import { readJsonObject } from "@/lib/requestValidation";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
export async function POST(request: Request) {
    try {
        const { supabase, user, error: authError, } = await getRouteUser(request);
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const limited = await checkRateLimit(`workspace:invite-accept:${user.id}`, { limit: 10, windowMs: 15 * 60 * 1000 });
        if (!limited.success) return rateLimitResponse(limited);
        const body = await readJsonObject(request);
        if (!body) {
            return NextResponse.json({ error: "Invalid request." }, { status: 400 });
        }
        const token = typeof body.token === "string"
            ? body.token.trim()
            : "";
        if (!token) {
            return NextResponse.json({ error: "Invite token is required" }, { status: 400 });
        }
        /*
         * The RPC validates token, expiry, confirmed invited email, and seat
         * capacity atomically. Invitees are not workspace members yet, so RLS
         * would hide the invite row from a direct select.
         */
        const { data: acceptance, error: acceptanceError } = await supabase.rpc(
            "accept_workspace_invite_with_limit",
            { p_token: token },
        );
        if (acceptanceError) {
            console.error("ACCEPT WORKSPACE INVITE ERROR:", acceptanceError.message);
            const code = acceptanceError.code;
            const expired = /expired/i.test(acceptanceError.message);
            const confirmationRequired = /confirmation required/i.test(acceptanceError.message);
            const [status, message] = code === "P0002"
                ? [404, "Invitation not found or invalid"]
                : expired
                    ? [410, "Invitation has expired"]
                    : confirmationRequired
                        ? [403, "Confirm your email address before accepting an invitation."]
                    : code === "22023"
                        ? [404, "Invitation not found or invalid"]
                        : code === "42501"
                            ? [403, "This invitation was sent to a different email address."]
                            : code === "23514"
                                ? [429, "The workspace has reached its team seat limit."]
                                : [500, "The invitation could not be accepted."];
            return NextResponse.json({ error: message }, { status });
        }
        const accepted = Array.isArray(acceptance) ? acceptance[0] : acceptance;
        if (!accepted?.workspace_id) {
            console.error("Accept workspace invite RPC returned an invalid response.");
            return NextResponse.json(
                { error: "The invitation could not be accepted." },
                { status: 503 },
            );
        }
        if (accepted.already_member !== true) {
            await recordAuditEvent({
                workspaceId: accepted.workspace_id,
                actorUserId: user.id,
                eventType: "invite.accepted",
            });
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
            error: "The invitation could not be accepted.",
        }, { status: 500 });
    }
}
