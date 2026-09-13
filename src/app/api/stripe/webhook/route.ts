import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const resolvePlanFromPrice = (
    priceId: string | null | undefined,
): "free" | "pro" | "business" => {
    if (priceId === process.env.STRIPE_PRO_PRICE_ID) {
        return "pro";
    }

    if (priceId === process.env.STRIPE_BUSINESS_PRICE_ID) {
        return "business";
    }

    return "free";
};

const getPeriodEnd = (
    subscription: Stripe.Subscription,
): string | null => {
    const periodEnd = Number(
        (subscription as unknown as {
            current_period_end?: number;
        }).current_period_end || 0,
    );

    return periodEnd
        ? new Date(periodEnd * 1000).toISOString()
        : null;
};

export async function POST(request: Request) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

    if (!webhookSecret || !stripeSecretKey) {
        console.error("Stripe webhook is not configured.");

        return NextResponse.json(
            { error: "Stripe webhook is not configured" },
            { status: 500 },
        );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
        return NextResponse.json(
            { error: "Supabase service role not configured" },
            { status: 500 },
        );
    }

    const signature = request.headers.get("stripe-signature");

    if (!signature) {
        return NextResponse.json(
            { error: "Missing Stripe signature" },
            { status: 400 },
        );
    }

    const body = await request.text();

    const stripe = new Stripe(stripeSecretKey, {});

    const supabase = createClient(
        supabaseUrl,
        supabaseServiceRoleKey,
        {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            },
        },
    );

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            webhookSecret,
        );
    } catch (error) {
        console.error("Stripe webhook signature error:", error);

        return NextResponse.json(
            { error: "Invalid webhook signature" },
            { status: 400 },
        );
    }

    try {
        if (event.type === "checkout.session.completed") {
            const session =
                event.data.object as Stripe.Checkout.Session;

            const workspaceId =
                typeof session.metadata?.workspace_id === "string"
                    ? session.metadata.workspace_id
                    : null;

            const plan =
                session.metadata?.plan === "business"
                    ? "business"
                    : "pro";

            const stripeCustomerId =
                typeof session.customer === "string"
                    ? session.customer
                    : null;

            const stripeSubscriptionId =
                typeof session.subscription === "string"
                    ? session.subscription
                    : null;

            if (workspaceId) {
                let status = "active";
                let currentPeriodEnd: string | null = null;

                if (stripeSubscriptionId) {
                    const subscription =
                        await stripe.subscriptions.retrieve(
                            stripeSubscriptionId,
                        );

                    status = subscription.status;
                    currentPeriodEnd =
                        getPeriodEnd(subscription);
                }

                const { error } = await supabase
                    .from("subscriptions")
                    .upsert(
                        {
                            workspace_id: workspaceId,
                            stripe_customer_id:
                                stripeCustomerId,
                            stripe_subscription_id:
                                stripeSubscriptionId,
                            plan,
                            status,
                            current_period_end:
                                currentPeriodEnd,
                            updated_at:
                                new Date().toISOString(),
                        },
                        {
                            onConflict: "workspace_id",
                        },
                    );

                if (error) {
                    throw error;
                }
            }
        }

        if (
            event.type ===
                "customer.subscription.created" ||
            event.type ===
                "customer.subscription.updated" ||
            event.type ===
                "customer.subscription.deleted"
        ) {
            const subscription =
                event.data.object as Stripe.Subscription;

            const stripeSubscriptionId =
                subscription.id;

            const stripeCustomerId =
                typeof subscription.customer === "string"
                    ? subscription.customer
                    : null;

            const priceId =
                subscription.items.data[0]?.price?.id ||
                null;

            const plan =
                resolvePlanFromPrice(priceId);

            if (plan === "free" && priceId) {
                console.warn(
                    `Unknown Stripe price received: ${priceId}`,
                );
            }

            const updatePayload = {
                stripe_customer_id:
                    stripeCustomerId,
                stripe_subscription_id:
                    stripeSubscriptionId,
                plan,
                status: subscription.status,
                current_period_end:
                    getPeriodEnd(subscription),
                updated_at:
                    new Date().toISOString(),
            };

            const { data, error } = await supabase
                .from("subscriptions")
                .update(updatePayload)
                .eq(
                    "stripe_subscription_id",
                    stripeSubscriptionId,
                )
                .select("id");

            if (error) {
                throw error;
            }

            if ((!data || data.length === 0) && stripeCustomerId) {
                const { error: customerError } =
                    await supabase
                        .from("subscriptions")
                        .update(updatePayload)
                        .eq(
                            "stripe_customer_id",
                            stripeCustomerId,
                        );

                if (customerError) {
                    throw customerError;
                }
            }
        }

        if (event.type === "invoice.payment_failed") {
            const invoice =
                event.data.object as Stripe.Invoice;

            console.warn(
                "Stripe invoice payment failed:",
                invoice.id,
            );
        }

        return NextResponse.json({
            received: true,
        });
    } catch (error) {
        console.error(
            "Stripe webhook processing error:",
            error,
        );

        return NextResponse.json(
            { error: "Webhook processing failed" },
            { status: 500 },
        );
    }
}