import { NextResponse } from "next/server";
import Stripe from "stripe";
import {
    getRouteUser,
    loadWorkspaceForUser,
    requireAal2,
} from "@/lib/supabase/route";
import { getWorkspaceUserRole } from "@/lib/supabase/workspaceAuth";

export async function POST(request: Request) {
    const {
        supabase,
        user,
        error,
    } = await getRouteUser(request);

    if (error || !user) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 },
        );
    }

    const authz = await requireAal2(
        request,
        supabase,
    );

    if (!authz.ok) {
        return NextResponse.json(
            { error: authz.message },
            { status: authz.status },
        );
    }

    const preferredWorkspaceId =
        request.headers.get(
            "x-closeflow-workspace-id",
        );

    const {
        workspace,
        error: workspaceError,
    } = await loadWorkspaceForUser(
        supabase,
        user.id,
        preferredWorkspaceId,
    );

    if (workspaceError) {
        return NextResponse.json(
            { error: workspaceError.message },
            { status: 500 },
        );
    }

    if (!workspace) {
        return NextResponse.json(
            { error: "Workspace not found" },
            { status: 400 },
        );
    }

    /*
     * Only the workspace owner may manage billing.
     */
    const workspaceRole =
        await getWorkspaceUserRole(
            supabase,
            workspace.id,
            user.id,
        );

    if (!workspaceRole.ok) {
        return NextResponse.json(
            { error: workspaceRole.message },
            { status: workspaceRole.status },
        );
    }

    if (workspaceRole.role !== "owner") {
        return NextResponse.json(
            {
                error:
                    "Only the workspace owner can manage billing.",
            },
            { status: 403 },
        );
    }

    const stripeSecretKey =
        process.env.STRIPE_SECRET_KEY;

    if (!stripeSecretKey) {
        return NextResponse.json(
            {
                error:
                    "Stripe is not configured",
            },
            { status: 500 },
        );
    }

    const {
        data: subscription,
        error: subscriptionError,
    } = await supabase
        .from("subscriptions")
        .select(
            "stripe_customer_id",
        )
        .eq(
            "workspace_id",
            workspace.id,
        )
        .maybeSingle();

    if (subscriptionError) {
        return NextResponse.json(
            {
                error:
                    subscriptionError.message,
            },
            { status: 500 },
        );
    }

    if (!subscription?.stripe_customer_id) {
        return NextResponse.json(
            {
                error:
                    "No Stripe customer is associated with this workspace",
            },
            { status: 400 },
        );
    }

    const stripe = new Stripe(
        stripeSecretKey,
        {},
    );

    const returnUrl =
        process.env.STRIPE_PORTAL_RETURN_URL ||
        `${
            process.env.NEXT_PUBLIC_SITE_URL ||
            "http://localhost:3000"
        }/settings/billing`;

    try {
        const session =
            await stripe.billingPortal.sessions.create(
                {
                    customer:
                        subscription.stripe_customer_id,
                    return_url: returnUrl,
                },
            );

        return NextResponse.json({
            portalUrl: session.url,
        });
    } catch (error) {
        console.error(
            "Stripe billing portal error:",
            error,
        );

        return NextResponse.json(
            {
                error:
                    "Could not create Stripe billing portal session",
            },
            { status: 500 },
        );
    }
}
