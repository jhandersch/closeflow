import { NextResponse } from "next/server";
import { getRouteUser, loadWorkspaceForUser } from "@/lib/supabase/route";
type LeadSearchResult = {
    id: string;
    name: string | null;
    company: string | null;
    email: string | null;
    phone: string | null;
    status: string | null;
    value: number | null;
    created_at: string;
    stage_changed_at: string | null;
};
export async function GET(request: Request) {
    const { supabase, user, error } = await getRouteUser(request);
    if (error || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { workspace } = await loadWorkspaceForUser(supabase, user.id);
    if (!workspace?.id) {
        return NextResponse.json([]);
    }
    const url = new URL(request.url);
    const query = (url.searchParams.get("q") || "").trim();
    if (!query) {
        return NextResponse.json([]);
    }
    const likeQuery = `%${query}%`;
    const [nameResult, companyResult, emailResult, phoneResult] = await Promise.all([
        supabase.from("leads").select("id, name, company, email, phone, status, value, created_at, stage_changed_at").eq("workspace_id", workspace.id).is("deleted_at", null).in("status", ["new", "contacted", "proposal"]).ilike("name", likeQuery).limit(10),
        supabase.from("leads").select("id, name, company, email, phone, status, value, created_at, stage_changed_at").eq("workspace_id", workspace.id).is("deleted_at", null).in("status", ["new", "contacted", "proposal"]).ilike("company", likeQuery).limit(10),
        supabase.from("leads").select("id, name, company, email, phone, status, value, created_at, stage_changed_at").eq("workspace_id", workspace.id).is("deleted_at", null).in("status", ["new", "contacted", "proposal"]).ilike("email", likeQuery).limit(10),
        supabase.from("leads").select("id, name, company, email, phone, status, value, created_at, stage_changed_at").eq("workspace_id", workspace.id).is("deleted_at", null).in("status", ["new", "contacted", "proposal"]).ilike("phone", likeQuery).limit(10),
    ]);
    const errorMessage = nameResult.error?.message || companyResult.error?.message || emailResult.error?.message || phoneResult.error?.message;
    if (errorMessage) {
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
    const byId = new Map<string, LeadSearchResult>();
    for (const row of [...(nameResult.data || []), ...(companyResult.data || []), ...(emailResult.data || []), ...(phoneResult.data || [])] as LeadSearchResult[]) {
        byId.set(row.id, row);
    }
    return NextResponse.json(Array.from(byId.values()));
}
