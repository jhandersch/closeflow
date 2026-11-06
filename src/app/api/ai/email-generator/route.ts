import { NextResponse } from "next/server";
import { getRouteUser } from "@/lib/supabase/route";
import { requireAiWorkspaceQuota } from "@/lib/aiAccess";
import { createTrackedAzureOpenAIClient } from "@/lib/aiCost";
import { normalizeLanguage } from "@/lib/i18n";
import { aiTerminologyRules } from "@/lib/aiLanguage";

const MAX_LEAD_TEXT_LENGTH = 4_000;
const MAX_OUTPUT_LENGTH = 12_000;
const ALLOWED_GOALS = new Set(["First Contact", "Follow Up", "Closing", "Reactivation"]);
const ALLOWED_TONES = new Set(["professional", "friendly", "formal", "concise", "persuasive", "direct"]);
const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

export async function POST(request: Request) {
    const access = await requireAiWorkspaceQuota(request);
    if (!access.ok) return access.response;
    let language = normalizeLanguage(undefined);
    try {
        const { user, error } = await getRouteUser(request);
        if (error || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const body: unknown = await request.json();
        if (!isRecord(body) || !isRecord(body.lead)) {
            return NextResponse.json({ error: "A lead object is required." }, { status: 400 });
        }
        language = normalizeLanguage(body.language ?? user.user_metadata?.language);
        const isGerman = language === "de";
        const sourceLead = body.lead;
        const textField = (value: unknown, maxLength: number) =>
            typeof value === "string" ? value.trim().slice(0, maxLength) : "";
        const lead = {
            name: textField(sourceLead.name, 200),
            company: textField(sourceLead.company, 200),
            status: textField(sourceLead.status, 80),
            value: typeof sourceLead.value === "number" && Number.isFinite(sourceLead.value)
                ? sourceLead.value
                : 0,
            notes: textField(sourceLead.notes, MAX_LEAD_TEXT_LENGTH),
        };
        const goal = typeof body.goal === "string" ? body.goal.trim() : "Follow Up";
        const tone = typeof body.tone === "string" ? body.tone.trim() : "professional";
        if (!ALLOWED_GOALS.has(goal)) {
            return NextResponse.json({ error: "Unsupported email goal." }, { status: 400 });
        }
        if (!ALLOWED_TONES.has(tone)) {
            return NextResponse.json({ error: "Unsupported email tone." }, { status: 400 });
        }
        const openai = createTrackedAzureOpenAIClient(
            access.supabase,
            access.workspaceId,
            access.userId,
            "ai_email_generator",
            "gpt-4.1-mini",
        );
        const completion = await openai.chat.completions.create({
            model: "gpt-4.1-mini",
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "system",
                    content: `Create a sales email. Return JSON with subject and body. Write the email in ${isGerman ? "German" : "English"}. Tone: ${tone}. Goal: ${goal}. Use any provided deal-cost context only to guide commercially sound wording; do not disclose the user's internal costs or margins to the customer.${aiTerminologyRules(language)}`,
                },
                {
                    role: "user",
                    content: JSON.stringify(lead),
                },
            ],
        });
        const content = completion.choices[0]?.message?.content;
        if (!content) throw new Error("Azure OpenAI returned an empty email response.");
        const result = JSON.parse(content);
        if (
            typeof result.subject !== "string" ||
            !result.subject.trim() ||
            result.subject.length > 300 ||
            typeof result.body !== "string" ||
            !result.body.trim() ||
            result.body.length > MAX_OUTPUT_LENGTH
        ) {
            throw new Error("Azure OpenAI returned an invalid email response.");
        }
        return NextResponse.json({
            subject: result.subject,
            body: result.body,
        });
    }
    catch (error) {
        console.error(error);
        return NextResponse.json({ error: language === "de" ? "Die KI-Anfrage ist fehlgeschlagen." : "AI failed" }, { status: 500 });
    }
}
