import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
const resolvePlanFromPrice = (priceId: string | null | undefined) => {
    const proPrice = process.env.STRIPE_PRO_PRICE_ID;
    if (priceId && proPrice && priceId === proPrice)
        return "pro";
    return "free";
};
export async function POST(request: Request) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret || !process.env.STRIPE_SECRET_KEY) {
        return NextResponse.json({ received: true });
    }
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceRoleKey) {
        return NextResponse.json({ error: "Supabase service role not configured" }, { status: 500 });
    }
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {});
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
    const signature = request.headers.get("stripe-signature");
    if (!signature) {
        return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }
    const body = await request.text();
    try {
        const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
        if (event.type === "checkout.session.completed") {
            const session = event.data.object as Stripe.Checkout.Session;
            const workspaceId = typeof session.metadata?.workspace_id === "string" ? session.metadata.workspace_id : null;
            const plan = typeof session.metadata?.plan === "string" ? session.metadata.plan : "pro";
            const stripeCustomerId = typeof session.customer === "string" ? session.customer : null;
            const stripeSubscriptionId = typeof session.subscription === "string" ? session.subscription : null;
            if (workspaceId) {
                let status = "active";
                let currentPeriodEnd: string | null = null;
                if (stripeSubscriptionId) {
                    const stripeSubscription = (await stripe.subscriptions.retrieve(stripeSubscriptionId)) as unknown as Stripe.Subscription;
                    const subscriptionPeriodEnd = Number((stripeSubscription as unknown as {
                        current_period_end?: number;
                    }).current_period_end || 0);
                    status = stripeSubscription.status;
                    currentPeriodEnd = subscriptionPeriodEnd
                        ? new Date(subscriptionPeriodEnd * 1000).toISOString()
                        : null;
                }
                await supabase.from("subscriptions").upsert({
                    workspace_id: workspaceId,
                    stripe_customer_id: stripeCustomerId,
                    stripe_subscription_id: stripeSubscriptionId,
                    plan,
                    status,
                    current_period_end: currentPeriodEnd,
                    updated_at: new Date().toISOString(),
                });
            }
        }
        if (event.type === "customer.subscription.updated" ||
            event.type === "customer.subscription.created" ||
            event.type === "customer.subscription.deleted") {
            const subscription = event.data.object as Stripe.Subscription;
            const stripeSubscriptionId = subscription.id;
            const stripeCustomerId = typeof subscription.customer === "string" ? subscription.customer : null;
            const firstItemPriceId = subscription.items.data[0]?.price?.id || null;
            const updatePayload = {
                stripe_customer_id: stripeCustomerId,
                stripe_subscription_id: stripeSubscriptionId,
                plan: resolvePlanFromPrice(firstItemPriceId),
                status: subscription.status,
                current_period_end: Number((subscription as unknown as {
                    current_period_end?: number;
                }).current_period_end || 0)
                    ? new Date(Number((subscription as unknown as {
                        current_period_end?: number;
                    }).current_period_end) * 1000).toISOString()
                    : null,
                updated_at: new Date().toISOString(),
            };
            const { error: updateBySubscriptionError } = await supabase
                .from("subscriptions")
                .update(updatePayload)
                .eq("stripe_subscription_id", stripeSubscriptionId);
            if (updateBySubscriptionError && stripeCustomerId) {
                await supabase
                    .from("subscriptions")
                    .update(updatePayload)
                    .eq("stripe_customer_id", stripeCustomerId);
            }
        }
        return NextResponse.json({ received: true });
    }
    catch (error) {
        console.error("Stripe webhook error:", error);
        return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
    }
}
