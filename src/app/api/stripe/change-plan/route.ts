import { NextResponse } from "next/server";
import Stripe from "stripe";
import {
    getRouteUser,
    loadWorkspaceForUser,
    requireAal2,
} from "@/lib/supabase/route";
import { getWorkspaceUserRole } from "@/lib/supabase/workspaceAuth";

type Plan = "pro" | "business" | "free";

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

    const body = (await request.json().catch(() => null)) as {
        plan?: Plan;
    } | null;

    const plan = body?.plan;

    if (
        plan !== "pro" &&
        plan !== "business" &&
        plan !== "free"
    ) {
        return NextResponse.json(
            { error: "Invalid plan." },
            { status: 400 },
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
            { error: "Workspace not found." },
            { status: 400 },
        );
    }

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
                    "Stripe is not configured.",
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
            "stripe_subscription_id, stripe_customer_id, plan, status",
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

    if (!subscription?.stripe_subscription_id) {
        return NextResponse.json(
            {
                error:
                    "No active Stripe subscription is associated with this workspace.",
            },
            { status: 400 },
        );
    }

    if (
        subscription.plan?.toLowerCase() ===
        plan
    ) {
        return NextResponse.json(
            {
                error:
                    `Workspace is already on the ${plan} plan.`,
            },
            { status: 400 },
        );
    }

    const stripe = new Stripe(
        stripeSecretKey,
        {},
    );

    try {
        const stripeSubscription =
            await stripe.subscriptions.retrieve(
                subscription.stripe_subscription_id,
            );

        if (
            stripeSubscription.status ===
                "canceled" ||
            stripeSubscription.status ===
                "incomplete_expired"
        ) {
            return NextResponse.json(
                {
                    error:
                        "The current Stripe subscription is no longer active.",
                },
                { status: 400 },
            );
        }

        

        // Free has no Stripe price.
        // Schedule cancellation at the end of the
        // current paid billing period.
        if (plan === "free") {
            const updatedSubscription =
                await stripe.subscriptions.update(
                    stripeSubscription.id,
                    {
                        cancel_at_period_end: true,
                    },
                );

            return NextResponse.json({
                success: true,
                plan: "free",
                subscriptionId:
                    updatedSubscription.id,
                status:
                    updatedSubscription.status,
                cancelAt:
                    updatedSubscription.cancel_at,
            });
        }

        const priceId =
            plan === "pro"
                ? process.env
                      .STRIPE_PRO_PRICE_ID
                : process.env
                      .STRIPE_BUSINESS_PRICE_ID;

        if (!priceId) {
            return NextResponse.json(
                {
                    error:
                        `Stripe price for ${plan} is not configured.`,
                },
                { status: 500 },
            );
        }

        const subscriptionItem =
            stripeSubscription.items.data[0];

        if (!subscriptionItem) {
            return NextResponse.json(
                {
                    error:
                        "No subscription item was found.",
                },
                { status: 400 },
            );
        }

        const updatedSubscription =
            await stripe.subscriptions.update(
                stripeSubscription.id,
                {
                    items: [
                        {
                            id:
                                subscriptionItem.id,
                            price: priceId,
                        },
                    ],
                    proration_behavior:
                        "create_prorations",
                    cancel_at_period_end: false,
                },
            );

        return NextResponse.json({
            success: true,
            plan,
            subscriptionId:
                updatedSubscription.id,
            status:
                updatedSubscription.status,
        });
    } catch (error) {
        console.error(
            "Stripe plan change error:",
            error,
        );

        return NextResponse.json(
            {
                error:
                    "Could not change the Stripe subscription plan.",
            },
            { status: 500 },
        );
    }
}