import { translateText, normalizeLanguage } from "@/lib/i18n";
import { NextResponse } from "next/server";
import { denyReadOnlyWrite, getRouteUser, loadWorkspaceForUser } from "@/lib/supabase/route";
import { enforceLeadCapacityLimit } from "@/lib/usageLimits";
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
const germanDemoLeads: DemoLeadSeed[] = [
    { name: "Maya Chen", company: "Nordstern Labs", status: "proposal", value: 18500, notes: "Die Geschäftsführung bittet um Rückmeldung bis Freitag.", activities: [{ action: "Produktvorführung mit der Vertriebsleitung abgeschlossen", type: "ai" }, { action: "Angebot versendet; Freigabe steht noch aus", type: "note_added" }], tasks: [{ title: "Bis Freitag bei der Vertriebsleitung nachfassen", priority: "high", dueInDays: 2 }, { title: "Überarbeitetes Angebot vorbereiten", priority: "medium", dueInDays: 4 }] },
    { name: "Darius Bell", company: "Helio Cloud", status: "contacted", value: 9200, notes: "Interessiert an Automatisierung und Umsatzprognosen.", activities: [{ action: "Erstgespräch abgeschlossen", type: "created" }, { action: "Preisübersicht geteilt", type: "note_added" }], tasks: [{ title: "Übersicht zum möglichen Einsparpotenzial senden", priority: "medium", dueInDays: 1 }, { title: "Lösungsworkshop vereinbaren", priority: "high", dueInDays: 3 }] },
    { name: "Nina Alvarez", company: "Foundry KI", status: "new", value: 6400, notes: "Neue Anfrage über das Webformular des Produktteams.", activities: [{ action: "Neue Anfrage über die Website erfasst", type: "created" }, { action: "Begrüßungs-E-Mail gesendet", type: "email_sent" }], tasks: [{ title: "Anforderungen der Anfrage klären", priority: "medium", dueInDays: 2 }] },
    { name: "Marcus Reed", company: "Crestline Gesundheit", status: "won", value: 24300, notes: "Vertrag unterzeichnet; die Einführung hat begonnen.", activities: [{ action: "Vertrag unterzeichnet", type: "status_changed" }, { action: "Auftakt zur Einführung abgeschlossen", type: "ai" }], tasks: [{ title: "Checkliste für die Einführung zusammenstellen", priority: "low", dueInDays: 5 }] },
    { name: "Sofia Patel", company: "Lumen Technik", status: "contacted", value: 11100, notes: "Wünscht eine erweiterte Testphase für drei Teams.", activities: [{ action: "Rückruf vereinbart", type: "call_completed" }, { action: "Produktvorführung durchgeführt", type: "ai" }], tasks: [{ title: "Bedingungen für die erweiterte Testphase senden", priority: "high", dueInDays: 2 }, { title: "Zeitplan für die Beschaffung erfragen", priority: "medium", dueInDays: 4 }] },
];
const isMissingSchemaError = (message: string) => /column .* does not exist|relation .* does not exist|schema cache/i.test(message);
export async function POST(request: Request) {
    const readOnlyDenied = await denyReadOnlyWrite(request);
    if (readOnlyDenied) {
        return readOnlyDenied;
    }
    const { supabase, user, error } = await getRouteUser(request);
    if (error || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    let body: { mode?: unknown; language?: unknown } = {};
    try {
        body = await request.json();
    }
    catch {
        body = {};
    }
    const { data: profile } = await supabase.from("profiles").select("language").eq("id", user.id).maybeSingle();
    const language = normalizeLanguage(body.language ?? profile?.language ?? user.user_metadata?.language);
    const localizedDemoLeads = language === "de" ? germanDemoLeads : demoLeads;
    const demoError = (detail: unknown, status = 500) => {
        console.error("Demo seed failed", detail);
        return NextResponse.json({ error: translateText("Could not load demo data.", language) }, { status });
    };
    const warnings: string[] = [];
    const mode: "load" | "reload" = body.mode === "reload" ? "reload" : "load";
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
        .select("id,name,company")
        .eq(workspaceId ? "workspace_id" : "user_id", workspaceId || user.id)
        .is("deleted_at", null)
        .ilike("notes", `${DEMO_MARKER}%`);
    if (existingDemoLeadsResult.error) {
        return demoError(existingDemoLeadsResult.error);
    }
    const existingDemoLeads = existingDemoLeadsResult.data || [];
    const existingDemoDataUsesAnotherLanguage = existingDemoLeads.some((existingLead) => {
        const expectedLead = localizedDemoLeads.find((lead) => lead.name === existingLead.name);
        return expectedLead && expectedLead.company !== existingLead.company;
    });
    if (mode === "load" && existingDemoLeads.length > 0 && !existingDemoDataUsesAnotherLanguage) {
        return NextResponse.json({
            mode,
            inserted_leads: 0,
            inserted_activities: 0,
            inserted_tasks: 0,
            skipped: existingDemoLeads.length,
            message: translateText("Demo data already exists. Use reload to refresh the demo workspace.", language),
            warnings,
        });
    }
    if ((mode === "reload" || existingDemoDataUsesAnotherLanguage) && existingDemoLeads.length > 0) {
        const leadIds = existingDemoLeads.map((lead) => lead.id);
        const deleteActivities = await supabase.from("activities").delete().in("lead_id", leadIds);
        if (deleteActivities.error && !isMissingSchemaError(deleteActivities.error.message || "")) {
            return demoError(deleteActivities.error);
        }
        const deleteTasks = await supabase
            .from("tasks")
            .delete()
            .in("lead_id", leadIds);
        if (deleteTasks.error && !isMissingSchemaError(deleteTasks.error.message || "")) {
            return demoError(deleteTasks.error);
        }
        if (deleteTasks.error && isMissingSchemaError(deleteTasks.error.message || "")) {
            const taskWarning = translateText("Tasks table not available in this environment, demo tasks were skipped.", language);
            if (!warnings.includes(taskWarning)) {
                warnings.push(taskWarning);
            }
        }
        const deleteLeads = await supabase.from("leads").delete().in("id", leadIds);
        if (deleteLeads.error) {
            return demoError(deleteLeads.error);
        }
    }
    let insertedLeads = 0;
    let insertedActivities = 0;
    let insertedTasks = 0;
    for (const leadSeed of localizedDemoLeads) {
        const leadCapacity = await enforceLeadCapacityLimit(supabase, user.id, workspaceId || "");
        if (!leadCapacity.ok) {
            return NextResponse.json({ error: translateText(leadCapacity.message, language) }, { status: leadCapacity.status });
        }
        const firstTask = leadSeed.status === "won" || leadSeed.status === "lost"
            ? undefined
            : leadSeed.tasks[0];
        const leadInsert = await supabase
            .from("leads")
            .insert({
            workspace_id: workspaceId,
            user_id: user.id,
            name: leadSeed.name,
            company: leadSeed.company,
            status: leadSeed.status,
            value: leadSeed.value,
            next_action: firstTask?.title || null,
            next_action_date: firstTask
                ? new Date(Date.now() + firstTask.dueInDays * 24 * 60 * 60 * 1000).toISOString()
                : null,
            notes: `${DEMO_MARKER} ${leadSeed.notes}`,
            stage_changed_at: new Date().toISOString(),
            last_activity_at: new Date().toISOString(),
        })
            .select("id")
            .single();
        if (leadInsert.error || !leadInsert.data?.id) {
            return demoError(leadInsert.error || "Failed to insert demo lead");
        }
        insertedLeads += 1;
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
                return demoError(activityInsert.error);
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
                description: translateText("Demo task generated by CloseFlow seed.", language),
                completed: false,
                priority: task.priority,
                due_date: new Date(Date.now() + task.dueInDays * 24 * 60 * 60 * 1000).toISOString(),
                created_at: new Date().toISOString(),
            }));
        if (taskRows.length > 0) {
            const taskInsert = await supabase.from("tasks").insert(taskRows);
            if (taskInsert.error && !isMissingSchemaError(taskInsert.error.message || "")) {
                return demoError(taskInsert.error);
            }
            if (taskInsert.error && isMissingSchemaError(taskInsert.error.message || "")) {
                const taskWarning = translateText("Tasks table not available in this environment, demo tasks were skipped.", language);
                if (!warnings.includes(taskWarning)) {
                warnings.push(taskWarning);
            }
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
            ? translateText("Demo workspace reloaded successfully.", language)
            : translateText("Demo workspace loaded successfully.", language),
        warnings,
    });
}
