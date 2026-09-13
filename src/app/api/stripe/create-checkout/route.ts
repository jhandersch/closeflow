import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getRouteUser, loadWorkspaceForUser, requireAal2 } from "@/lib/supabase/route";
import { getWorkspaceUserRole } from "@/lib/supabase/workspaceAuth";
export async function POST(request: Request) {
    const { supabase, user, error } = await getRouteUser(request);
    if (error || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const authz = await requireAal2(request, supabase);
    if (!authz.ok) {
        return NextResponse.json({ error: authz.message }, { status: authz.status });
    }
    const { workspace } = await loadWorkspaceForUser(supabase, user.id);
    if (!workspace) {
        return NextResponse.json({ error: "Workspace not found" }, { status: 400 });
    }
    /*
     * Only the workspace owner may manage billing/checkout.
     */
    const workspaceRole = await getWorkspaceUserRole(supabase, workspace.id, user.id);
    if (!workspaceRole.ok) {
        return NextResponse.json({ error: workspaceRole.message }, { status: workspaceRole.status });
    }
    if (workspaceRole.role !== "owner") {
        return NextResponse.json({ error: "Only the workspace owner can manage billing." }, { status: 403 });
    }
    let selectedPlan: "pro" | "business" = "pro";
    try {
        const body = await request.json();
        if (body?.plan === "business") {
            selectedPlan = "business";
        }
    }
    catch {
        selectedPlan = "pro";
    }
    const apiKey = process.env.STRIPE_SECRET_KEY;
    const priceByPlan = {
        pro: process.env.STRIPE_PRO_PRICE_ID,
        business: process.env.STRIPE_BUSINESS_PRICE_ID,
    } as const;
    const priceId = priceByPlan[selectedPlan];
    const successUrl = process.env.STRIPE_SUCCESS_URL || `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/settings/billing?success=1`;
    const cancelUrl = process.env.STRIPE_CANCEL_URL || `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/settings/billing?canceled=1`;
    if (!apiKey || !priceId) {
        return NextResponse.json({
            checkoutUrl: null,
            message: selectedPlan === "business"
                ? "Stripe Business plan is not configured yet."
                : "Stripe Pro plan is not configured yet.",
        });
    }
    const stripe = new Stripe(apiKey, {});
    const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        success_url: successUrl,
        cancel_url: cancelUrl,
        line_items: [{ price: priceId, quantity: 1 }],
        customer_email: user.email || undefined,
        metadata: {
            user_id: user.id,
            workspace_id: workspace.id,
            plan: selectedPlan,
        },
    });
    return NextResponse.json({
        checkoutUrl: session.url,
    });
}
