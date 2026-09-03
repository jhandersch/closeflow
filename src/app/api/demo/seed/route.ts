import { NextResponse } from "next/server";
import { getRouteUser, loadWorkspaceForUser } from "@/lib/supabase/route";
import { runLeadAutomation } from "@/lib/automation";
import type { Lead } from "@/types";
type DemoLeadSeed = {
    name: string;
    company: string;
    status: "new" | "contacted" | "proposal" | "won" | "lost";
    value: number;
    notes: string;
    activities: Array<{
        action: string;
        type?: string;
    }>;
    tasks: Array<{
        title: string;
        priority: "low" | "medium" | "high";
        dueInDays: number;
    }>;
};
const DEMO_MARKER = "[DEMO_SEED_V1]";
const demoLeads: DemoLeadSeed[] = [
    {
        name: "Maya Chen",
        company: "Northstar Labs",
        status: "proposal",
        value: 18500,
        notes: "Executive sponsor requested a follow-up before Friday.",
        activities: [
            { action: "Demo completed with VP of Revenue", type: "ai" },
            { action: "Proposal sent and awaiting sign-off", type: "note_added" },
        ],
        tasks: [
            { title: "Follow up with VP by Friday", priority: "high", dueInDays: 2 },
            { title: "Prepare revised proposal", priority: "medium", dueInDays: 4 },
        ],
    },
    {
        name: "Darius Bell",
        company: "Helio Cloud",
        status: "contacted",
        value: 9200,
        notes: "Interested in automation and forecasting.",
        activities: [
            { action: "Discovery call completed", type: "created" },
            { action: "Shared pricing overview", type: "note_added" },
        ],
        tasks: [
            { title: "Send ROI one-pager", priority: "medium", dueInDays: 1 },
            { title: "Book solution workshop", priority: "high", dueInDays: 3 },
        ],
    },
    {
        name: "Nina Alvarez",
        company: "Foundry AI",
        status: "new",
        value: 6400,
        notes: "New inbound inquiry from PLG team.",
        activities: [
            { action: "Inbound lead captured via website", type: "created" },
            { action: "Sent welcome email", type: "email_sent" },
        ],
        tasks: [
            { title: "Qualify inbound requirements", priority: "medium", dueInDays: 2 },
        ],
    },
    {
        name: "Marcus Reed",
        company: "Crestline Health",
        status: "won",
        value: 24300,
        notes: "Signed contract and onboarding started.",
        activities: [
            { action: "Signed contract", type: "status_changed" },
            { action: "Onboarding kickoff completed", type: "ai" },
        ],
        tasks: [
            { title: "Collect onboarding checklist", priority: "low", dueInDays: 5 },
        ],
    },
    {
        name: "Sofia Patel",
        company: "Lumen Dynamics",
        status: "contacted",
        value: 11100,
        notes: "Asked for expanded trial for three teams.",
        activities: [
            { action: "Follow-up call booked", type: "call_completed" },
            { action: "Product tour delivered", type: "ai" },
        ],
        tasks: [
            { title: "Send trial expansion terms", priority: "high", dueInDays: 2 },
            { title: "Gather procurement timeline", priority: "medium", dueInDays: 4 },
        ],
    },
];
const isMissingSchemaError = (message: string) => /column .* does not exist|relation .* does not exist|schema cache/i.test(message);
export async function POST(request: Request) {
    const { supabase, user, error } = await getRouteUser(request);
    if (error || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const warnings: string[] = [];
    let mode: "load" | "reload" = "load";
    try {
        const body = await request.json();
        if (body?.mode === "reload") {
            mode = "reload";
        }
    }
    catch {
        mode = "load";
    }
    let workspaceId: string | null = null;
    try {
        const { workspace } = await loadWorkspaceForUser(supabase, user.id);
        workspaceId = workspace?.id || null;
    }
    catch {
        workspaceId = null;
    }
    const existingDemoLeadsResult = await supabase
        .from("leads")
        .select("id")
        .eq(workspaceId ? "workspace_id" : "user_id", workspaceId || user.id)
        .is("deleted_at", null)
        .in("status", ["new", "contacted", "proposal"])
        .ilike("notes", `${DEMO_MARKER}%`);
    if (existingDemoLeadsResult.error) {
        return NextResponse.json({ error: existingDemoLeadsResult.error.message }, { status: 500 });
    }
    const existingDemoLeads = existingDemoLeadsResult.data || [];
    if (mode === "load" && existingDemoLeads.length > 0) {
        return NextResponse.json({
            mode,
            inserted_leads: 0,
            inserted_activities: 0,
            inserted_tasks: 0,
            skipped: existingDemoLeads.length,
            message: "Demo data already exists. Use reload to refresh the demo workspace.",
            warnings,
        });
    }
    if (mode === "reload" && existingDemoLeads.length > 0) {
        const leadIds = existingDemoLeads.map((lead) => lead.id);
        const deleteActivities = await supabase.from("activities").delete().in("lead_id", leadIds);
        if (deleteActivities.error && !isMissingSchemaError(deleteActivities.error.message || "")) {
            return NextResponse.json({ error: deleteActivities.error.message }, { status: 500 });
        }
        const deleteTasks = await supabase
            .from("tasks")
            .delete()
            .eq(workspaceId ? "workspace_id" : "user_id", workspaceId || user.id)
            .ilike("title", `${DEMO_MARKER}%`);
        if (deleteTasks.error && !isMissingSchemaError(deleteTasks.error.message || "")) {
            return NextResponse.json({ error: deleteTasks.error.message }, { status: 500 });
        }
        if (deleteTasks.error && isMissingSchemaError(deleteTasks.error.message || "")) {
            warnings.push("Tasks table not available in this environment, demo tasks were skipped.");
        }
        const deleteLeads = await supabase.from("leads").delete().in("id", leadIds);
        if (deleteLeads.error) {
            return NextResponse.json({ error: deleteLeads.error.message }, { status: 500 });
        }
    }
    let insertedLeads = 0;
    let insertedActivities = 0;
    let insertedTasks = 0;
    for (const leadSeed of demoLeads) {
        const leadInsert = await supabase
            .from("leads")
            .insert({
            workspace_id: workspaceId,
            user_id: user.id,
            name: leadSeed.name,
            company: leadSeed.company,
            status: leadSeed.status,
            value: leadSeed.value,
            notes: `${DEMO_MARKER} ${leadSeed.notes}`,
            stage_changed_at: new Date().toISOString(),
            last_activity_at: new Date().toISOString(),
        })
            .select("id")
            .single();
        if (leadInsert.error || !leadInsert.data?.id) {
            return NextResponse.json({ error: leadInsert.error?.message || "Failed to insert demo lead" }, { status: 500 });
        }
        insertedLeads += 1;
        if (leadSeed.status === "contacted" ||
            leadSeed.status === "proposal") {
            const automatedLead = {
                id: leadInsert.data.id,
                name: leadSeed.name,
                company: leadSeed.company,
                status: leadSeed.status,
                value: leadSeed.value,
            } as Lead;
            const previousStatus = leadSeed.status === "contacted"
                ? "new"
                : "contacted";
            await runLeadAutomation(supabase, user.id, workspaceId || "", automatedLead, previousStatus);
        }
        const activityRows = leadSeed.activities.map((activity, index) => ({
            workspace_id: workspaceId,
            lead_id: leadInsert.data.id,
            user_id: user.id,
            title: `${DEMO_MARKER} ${activity.action}`,
            description: `${DEMO_MARKER} ${activity.action}`,
            action: `${DEMO_MARKER} ${activity.action}`,
            type: activity.type || "created",
            metadata: { seed: "demo" },
            created_at: new Date(Date.now() - (leadSeed.activities.length - index) * 1000 * 60 * 60 * 4).toISOString(),
        }));
        if (activityRows.length > 0) {
            const activityInsert = await supabase.from("activities").insert(activityRows);
            if (activityInsert.error) {
                return NextResponse.json({ error: activityInsert.error.message }, { status: 500 });
            }
            insertedActivities += activityRows.length;
        }
        const taskRows = leadSeed.status === "won" || leadSeed.status === "lost"
            ? []
            : leadSeed.tasks.map((task) => ({
                workspace_id: workspaceId,
                lead_id: leadInsert.data.id,
                user_id: user.id,
                title: `${DEMO_MARKER} ${task.title}`,
                description: "Demo task generated by CloseFlow seed.",
                completed: false,
                priority: task.priority,
                due_date: new Date(Date.now() + task.dueInDays * 24 * 60 * 60 * 1000).toISOString(),
                created_at: new Date().toISOString(),
            }));
        if (taskRows.length > 0) {
            const taskInsert = await supabase.from("tasks").insert(taskRows);
            if (taskInsert.error && !isMissingSchemaError(taskInsert.error.message || "")) {
                return NextResponse.json({ error: taskInsert.error.message }, { status: 500 });
            }
            if (taskInsert.error && isMissingSchemaError(taskInsert.error.message || "")) {
                warnings.push("Tasks table not available in this environment, demo tasks were skipped.");
            }
            else {
                insertedTasks += taskRows.length;
            }
        }
    }
    return NextResponse.json({
        mode,
        inserted_leads: insertedLeads,
        inserted_activities: insertedActivities,
        inserted_tasks: insertedTasks,
        skipped: 0,
        message: mode === "reload"
            ? "Demo workspace reloaded successfully."
            : "Demo workspace loaded successfully.",
        warnings,
    });
}
