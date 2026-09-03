import { NextResponse } from "next/server";
import { getRouteUser, loadWorkspaceForUser } from "@/lib/supabase/route";
export async function POST(request: Request, context: {
    params: Promise<{
        id: string;
    }>;
}) {
    const { supabase, user, error } = await getRouteUser(request);
    if (error || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { workspace } = await loadWorkspaceForUser(supabase, user.id);
    if (!workspace?.id) {
        return NextResponse.json({ error: "Workspace required" }, { status: 403 });
    }
    const { id } = await context.params;
    const { data: lead, error: leadError } = await supabase
        .from("leads")
        .select("*")
        .eq("id", id)
        .eq("workspace_id", workspace.id)
        .single();
    if (leadError || !lead) {
        return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }
    const ageDays = Math.max(0, Math.floor((Date.now() - new Date(lead.stage_changed_at || lead.created_at).getTime()) / (1000 * 60 * 60 * 24)));
    const action = lead.status === "proposal"
        ? "Call customer within 2 days"
        : lead.status === "contacted"
            ? "Send a short follow-up today"
            : lead.status === "new"
                ? "Reach out to qualify the lead"
                : lead.status === "won"
                    ? "Hand off to onboarding"
                    : "Review the deal and re-engage";
    const priority = lead.status === "proposal" || lead.value >= 20000 || ageDays >= 7 ? "high" : ageDays >= 3 ? "medium" : "low";
    return NextResponse.json({ action, priority });
}
