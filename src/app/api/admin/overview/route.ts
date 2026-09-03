import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getRouteUser, requireAal2 } from "@/lib/supabase/route";
const isAdminEmail = (email: string | null | undefined) => {
    if (!email)
        return false;
    const raw = process.env.CLOSEFLOW_ADMIN_EMAILS || "";
    const list = raw
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean);
    return list.includes(email.toLowerCase());
};
export async function GET(request: Request) {
    const { supabase, user, error } = await getRouteUser(request);
    if (error || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isAdminEmail(user.email)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const authz = await requireAal2(request, supabase);
    if (!authz.ok) {
        return NextResponse.json({ error: authz.message }, { status: authz.status });
    }
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceRole) {
        return NextResponse.json({ error: "Admin backend not configured" }, { status: 500 });
    }
    const admin = createClient(url, serviceRole, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const [workspacesRes, usersRes, leadsRes, subsRes, usageRes, errors24hRes, aiUsage30dRes] = await Promise.all([
        admin.from("workspaces").select("id", { count: "exact", head: true }),
        admin.from("profiles").select("id", { count: "exact", head: true }),
        admin.from("leads").select("id", { count: "exact", head: true }),
        admin.from("subscriptions").select("id, plan, status"),
        admin.from("usage").select("ai_requests"),
        admin
            .from("audit_logs")
            .select("id", { count: "exact", head: true })
            .ilike("event_type", "error.%")
            .gte("created_at", since24h),
        admin
            .from("audit_logs")
            .select("payload")
            .eq("event_type", "ai.usage")
            .gte("created_at", since30d),
    ]);
    const monthlyRevenue = (subsRes.data || []).reduce((sum, row) => {
        const plan = String(row.plan || "free");
        const status = String(row.status || "");
        if (status !== "active")
            return sum;
        if (plan === "business")
            return sum + 149;
        if (plan === "pro")
            return sum + 49;
        return sum;
    }, 0);
    const aiRequests = (usageRes.data || []).reduce((sum, row) => sum + Number(row.ai_requests || 0), 0);
    const aiCost30d = (aiUsage30dRes.data || []).reduce((sum, row) => {
        const payload = (row.payload || {}) as Record<string, unknown>;
        return sum + Number(payload.cost_usd || 0);
    }, 0);
    const aiTokens30d = (aiUsage30dRes.data || []).reduce((sum, row) => {
        const payload = (row.payload || {}) as Record<string, unknown>;
        return sum + Number(payload.total_tokens || 0);
    }, 0);
    return NextResponse.json({
        users: usersRes.count || 0,
        workspaces: workspacesRes.count || 0,
        leads: leadsRes.count || 0,
        mrr: monthlyRevenue,
        ai_requests: aiRequests,
        errors_24h: errors24hRes.count || 0,
        ai_cost_30d_usd: Math.round(aiCost30d * 100) / 100,
        ai_tokens_30d: aiTokens30d,
    });
}
