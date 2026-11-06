import { NextResponse } from "next/server";
import { getRouteUser, loadWorkspaceForUser } from "@/lib/supabase/route";
import { captureWorkspaceError } from "@/lib/errorMonitoring";
import { getUserFacingErrorMessage, getRetryableStatus } from "@/lib/errorRecovery";
import { enforceAndTrackUsageLimit } from "@/lib/usageLimits";
import { createTrackedAzureOpenAIClient } from "@/lib/aiCost";
import { formatPersonalDealCostsForLead } from "@/lib/personalDealCosts";
import { normalizeLanguage } from "@/lib/i18n";
import { aiTerminologyRules } from "@/lib/aiLanguage";

const MAX_MESSAGE_LENGTH = 12_000;
const ALLOWED_MODES = new Set([
    "lead-analysis",
    "pipeline-analysis",
    "sales-coach",
    "email-generator",
    "risk-detection",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

export async function POST(request: Request) {
    let userId: string | null = null;
    try {
        const { supabase, user, error } = await getRouteUser(request);
        if (error || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        userId = user.id;
        const preferredWorkspaceId = request.headers.get("x-closeflow-workspace-id");
        const limitCheck = await enforceAndTrackUsageLimit(
            supabase,
            user.id,
            "ai",
            preferredWorkspaceId,
        );
        if (!limitCheck.ok) {
            return NextResponse.json({ error: limitCheck.message }, { status: limitCheck.status });
        }
        const body: unknown = await request.json();
        if (!isRecord(body)) {
            return NextResponse.json({ error: "A JSON object is required." }, { status: 400 });
        }
        const language = normalizeLanguage(body.language ?? user.user_metadata?.language);
        const responseLanguage = language === "de" ? "German" : "English";
        const message = typeof body.message === "string" ? body.message.trim() : "";
        const mode = typeof body.mode === "string" ? body.mode.trim() : "sales-coach";
        const leadId = typeof body.leadId === "string" ? body.leadId.trim() : null;
        if (!message) {
            return NextResponse.json({ error: "message is required" }, { status: 400 });
        }
        if (message.length > MAX_MESSAGE_LENGTH) {
            return NextResponse.json({ error: `message must be ${MAX_MESSAGE_LENGTH} characters or fewer` }, { status: 413 });
        }
        if (!ALLOWED_MODES.has(mode)) {
            return NextResponse.json({ error: "Unsupported AI chat mode." }, { status: 400 });
        }
        const { workspace } = await loadWorkspaceForUser(
            supabase,
            user.id,
            preferredWorkspaceId,
        );
        if (!workspace?.id) {
            return NextResponse.json({ error: "A workspace is required to use AI chat." }, { status: 403 });
        }
        if (leadId) {
            if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(leadId)) {
                return NextResponse.json({ error: "Invalid lead id." }, { status: 400 });
            }
            const { data: lead, error: leadError } = await supabase
                .from("leads")
                .select("id")
                .eq("id", leadId)
                .eq("workspace_id", workspace.id)
                .maybeSingle();
            if (leadError) {
                console.error("AI chat lead authorization failed:", leadError.message);
                return NextResponse.json({ error: "Could not verify lead access." }, { status: 503 });
            }
            if (!lead) {
                return NextResponse.json({ error: "Lead not found." }, { status: 404 });
            }
        }
        const openai = createTrackedAzureOpenAIClient(
            supabase,
            workspace.id,
            user.id,
            "ai_chat",
            "gpt-4.1-mini",
        );
        const dealCostContext = leadId
            ? ` For lead ${leadId}, user-entered deal costs are: ${formatPersonalDealCostsForLead(user.user_metadata?.personal_deal_costs, leadId)} Use them when answering about this deal, and distinguish gross from estimated net value.`
            : "";
        const completion = await openai.chat.completions.create({
            model: "gpt-4.1-mini",
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "system",
                    content: `You are CloseFlow AI. Return JSON with answer and sources. Mode: ${mode}. Write concise, practical sales guidance in ${responseLanguage}.${aiTerminologyRules(language)}${dealCostContext}`,
                },
                {
                    role: "user",
                    content: message,
                },
            ],
        });
        const content = completion.choices[0]?.message?.content;
        if (!content) {
            throw new Error("Azure OpenAI returned an empty chat response.");
        }
        const result = JSON.parse(content);
        if (typeof result.answer !== "string" || !result.answer.trim()) {
            throw new Error("Azure OpenAI returned an invalid chat response.");
        }
        const payload = {
            answer: result.answer,
            sources: Array.isArray(result.sources) ? result.sources : [],
        };
        return NextResponse.json(payload);
    }
    catch (error) {
        console.error(error);
        if (userId) {
            const { supabase } = await getRouteUser(request);
            await captureWorkspaceError(supabase, userId, {
                source: "api",
                level: "error",
                message: "AI chat route failed",
                details: {
                    error: error instanceof Error ? error.message : String(error),
                },
                pathname: "/api/ai/chat",
            });
        }
        return NextResponse.json(
            { error: getUserFacingErrorMessage(error, "AI is temporarily unavailable. Please try again in a moment.") },
            { status: getRetryableStatus(error, 500) },
        );
    }
}
