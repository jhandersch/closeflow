import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugifyWorkspaceName, loadWorkspaceForUser, } from "@/lib/supabase/route";
type QuickStartMode = "lead" | "demo";
export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user }, error: userError, } = await supabase.auth.getUser();
    if (userError || !user) {
        console.error("ONBOARDING AUTH ERROR:", userError);
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.log("ONBOARDING USER:", user.id);
    try {
        const body = await request.json();
        const companyName = typeof body.companyName === "string"
            ? body.companyName.trim()
            : "";
        const industry = typeof body.industry === "string"
            ? body.industry.trim()
            : "";
        const teamSize = typeof body.teamSize === "string"
            ? body.teamSize.trim()
            : "";
        const quickStartMode: QuickStartMode = body.quickStartMode === "demo"
            ? "demo"
            : "lead";
        const leadName = typeof body.leadName === "string"
            ? body.leadName.trim()
            : "";
        const leadCompany = typeof body.leadCompany === "string"
            ? body.leadCompany.trim()
            : "";
        const leadValueRaw = typeof body.leadValue === "string"
            ? body.leadValue.trim()
            : "";
        const leadStatus = typeof body.leadStatus === "string"
            ? body.leadStatus.trim()
            : "new";
        if (!companyName) {
            return NextResponse.json({ error: "Company name required" }, { status: 400 });
        }
        if (quickStartMode === "lead") {
            if (!leadName || !leadCompany) {
                return NextResponse.json({
                    error: "Lead name and company are required",
                }, { status: 400 });
            }
            if (leadValueRaw &&
                Number.isNaN(Number(leadValueRaw))) {
                return NextResponse.json({
                    error: "Lead value must be a valid number",
                }, { status: 400 });
            }
        }
        // --------------------------------------------------
        // Workspace bereits vorhanden?
        // --------------------------------------------------
        const { workspace: existingWorkspace, } = await loadWorkspaceForUser(supabase, user.id);
        if (existingWorkspace?.id) {
            console.log("EXISTING WORKSPACE:", existingWorkspace.id);
            // A previous attempt may have failed after the workspace was created; finish onboarding on retry.
            if (user.user_metadata?.onboarding_completed !== true) {
                const { error: retryMetadataError } = await supabase.auth.updateUser({
                    data: {
                        onboarding_completed: true,
                        workspace_id: existingWorkspace.id,
                    },
                });
                if (retryMetadataError) {
                    console.error("ONBOARDING METADATA RETRY ERROR:", retryMetadataError);
                    throw retryMetadataError;
                }
            }
            return NextResponse.json({
                ok: true,
                workspace_id: existingWorkspace.id,
                quick_start_mode: quickStartMode,
            });
        }
        const slug = slugifyWorkspaceName(companyName);
        // --------------------------------------------------
        // Create workspace.
        // --------------------------------------------------
        const { data: createdWorkspaces, error: workspaceError } = await supabase.rpc(
            "create_workspace_with_limit",
            {
                p_name: companyName,
                p_slug: slug,
                p_industry: industry || null,
                p_size: teamSize || null,
            },
        );
        if (workspaceError) {
            console.error("ONBOARDING WORKSPACE ERROR:", workspaceError);
            if (workspaceError.code === "23514") {
                return NextResponse.json({ error: workspaceError.message }, { status: 409 });
            }
            if (workspaceError.code === "22023") {
                return NextResponse.json({ error: workspaceError.message }, { status: 400 });
            }
            throw workspaceError;
        }
        const createdWorkspace = Array.isArray(createdWorkspaces)
            ? createdWorkspaces[0]
            : null;
        if (!createdWorkspace?.workspace_id) {
            throw new Error("Workspace creation returned no workspace");
        }
        const workspace = {
            id: createdWorkspace.workspace_id,
            slug: createdWorkspace.slug,
        };
        // --------------------------------------------------
        // Admin Client for privileged onboarding records.
        // --------------------------------------------------
        const admin = createAdminClient();
        console.log("WORKSPACE CREATED:", workspace.id);
        // --------------------------------------------------
        // Profil
        // --------------------------------------------------
        const { error: profileError, } = await admin
            .from("profiles")
            .upsert({
            id: user.id,
            company_name: companyName,
        });
        if (profileError) {
            console.error("ONBOARDING PROFILE ERROR:", profileError);
            throw profileError;
        }
        // --------------------------------------------------
        // Quick Start: erster Lead
        // --------------------------------------------------
        if (quickStartMode === "lead") {
            const parsedLeadValue = leadValueRaw
                ? Number(leadValueRaw)
                : 0;
            const { error: leadError, } = await admin
                .from("leads")
                .insert({
                workspace_id: workspace.id,
                user_id: user.id,
                name: leadName,
                company: leadCompany,
                status: leadStatus,
                value: parsedLeadValue,
                notes: null,
                stage_changed_at: new Date().toISOString(),
                last_activity_at: new Date().toISOString(),
            });
            if (leadError) {
                console.error("ONBOARDING LEAD ERROR:", leadError);
                throw leadError;
            }
            console.log("FIRST LEAD CREATED:", leadName);
        }
        // --------------------------------------------------
        // Quick Start: Demo-Daten
        // --------------------------------------------------
        if (quickStartMode === "demo") {
            const authorization = request.headers.get("authorization") ??
                request.headers.get("Authorization");
            if (!authorization) {
                throw new Error("Authorization header missing for demo seed");
            }
            const origin = new URL(request.url).origin;
            const demoResponse = await fetch(`${origin}/api/demo/seed`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: authorization,
                },
                body: JSON.stringify({
                    mode: "load",
                }),
                cache: "no-store",
            });
            const demoResult = await demoResponse
                .json()
                .catch(() => null);
            if (!demoResponse.ok) {
                console.error("ONBOARDING DEMO ERROR:", demoResult);
                throw new Error(demoResult?.error ||
                    "Failed to load demo data");
            }
            console.log("DEMO DATA LOADED:", demoResult);
        }
        // --------------------------------------------------
        // Complete onboarding.
        // --------------------------------------------------
        const { error: metadataError, } = await supabase.auth.updateUser({
            data: {
                onboarding_completed: true,
                workspace_id: workspace.id,
            },
        });
        if (metadataError) {
            console.error("ONBOARDING METADATA ERROR:", metadataError);
            throw metadataError;
        }
        console.log("ONBOARDING COMPLETED:", workspace.id);
        return NextResponse.json({
            ok: true,
            workspace_id: workspace.id,
            quick_start_mode: quickStartMode,
        });
    }
    catch (err) {
        console.error("ONBOARDING FAILED:", err);
        return NextResponse.json({
            error: err instanceof Error
                ? err.message
                : "Onboarding failed",
        }, { status: 500 });
    }
}
