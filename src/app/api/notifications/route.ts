import { NextResponse } from "next/server";
import { getRouteUser, loadWorkspaceForUser } from "@/lib/supabase/route";
import { normalizeLanguage } from "@/lib/i18n";
import { buildAutomationNotifications, buildIdleLeadNotifications } from "@/lib/leadNotifications";
import { runTimeBasedAutomationsForWorkspace } from "@/lib/timeBasedAutomations";

export async function GET(request: Request) {
    const { supabase, user, error } = await getRouteUser(request);
    if (error || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { workspace } = await loadWorkspaceForUser(supabase, user.id);
    if (!workspace?.id) {
        return NextResponse.json([]);
    }
    const { data: profile } = await supabase
        .from("profiles")
        .select("language")
        .eq("id", user.id)
        .maybeSingle();
    const language = normalizeLanguage(profile?.language ?? user.user_metadata?.language);
    try {
        // Time-based triggers (overdue, idle) also run while the user is active.
        // Failures here must never hide the notification list.
        await runTimeBasedAutomationsForWorkspace(supabase, workspace.id, user.id).catch((runError) => {
            console.error("On-demand automations failed:", runError instanceof Error ? runError.message : runError);
        });
        const lang = language === "de" ? "de" : "en";
        const [idle, automation] = await Promise.all([
            buildIdleLeadNotifications(supabase, workspace.id, lang),
            buildAutomationNotifications(supabase, workspace.id, lang),
        ]);
        return NextResponse.json([...idle, ...automation]);
    }
    catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : "Could not load notifications";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
