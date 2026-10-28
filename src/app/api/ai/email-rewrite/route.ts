import { NextResponse } from "next/server";
import { getRouteUser } from "@/lib/supabase/route";
import { enforceAndTrackUsageLimit } from "@/lib/usageLimits";
import { createTrackedOpenAIClient } from "@/lib/aiCost";
import { normalizeLanguage } from "@/lib/i18n";

const MAX_TEXT_LENGTH = 12_000;
const ALLOWED_TONES = new Set([
    "professional",
    "friendly",
    "formal",
    "concise",
    "persuasive",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

export async function POST(request: Request) {
    const { supabase, user, error } = await getRouteUser(request);
    if (error || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
        body = await request.json();
    }
    catch {
        return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    if (!isRecord(body)) {
        return NextResponse.json({ error: "A JSON object is required." }, { status: 400 });
    }

    const text = typeof body.text === "string" ? body.text.trim() : "";
    const language = normalizeLanguage(body.language ?? user.user_metadata?.language);
    const responseLanguage = language === "de" ? "German" : "English";
    const tone = typeof body.tone === "string" ? body.tone.trim() : "professional";

    if (!text) {
        return NextResponse.json({ error: "Email text is required." }, { status: 400 });
    }
    if (text.length > MAX_TEXT_LENGTH) {
        return NextResponse.json({ error: `Email text must be ${MAX_TEXT_LENGTH} characters or fewer.` }, { status: 413 });
    }
    if (!ALLOWED_TONES.has(tone)) {
        return NextResponse.json({ error: "Unsupported rewrite tone." }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: "AI email rewriting is not configured." }, { status: 503 });
    }

    const limitCheck = await enforceAndTrackUsageLimit(
        supabase,
        user.id,
        "ai",
        request.headers.get("x-closeflow-workspace-id"),
    );
    if (!limitCheck.ok) {
        return NextResponse.json({ error: limitCheck.message }, { status: limitCheck.status });
    }
    if (!limitCheck.context) {
        return NextResponse.json({ error: "A workspace is required to use AI email rewriting." }, { status: 403 });
    }

    try {
        const openai = createTrackedOpenAIClient(
            apiKey,
            supabase,
            limitCheck.context.workspaceId,
            user.id,
            "ai_email_rewrite",
        );
        const completion = await openai.chat.completions.create({
            model: "gpt-4.1-mini",
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "system",
                    content: `Rewrite the email text in a ${tone} tone in ${responseLanguage}. Return JSON only with a single key called text.`,
                },
                {
                    role: "user",
                    content: text,
                },
            ],
        });
        const responseText = completion.choices[0]?.message.content;
        if (!responseText) {
            console.error("AI email rewrite returned an empty response.");
            return NextResponse.json({ error: "AI returned an empty response." }, { status: 502 });
        }

        const result: unknown = JSON.parse(responseText);
        if (!isRecord(result) || typeof result.text !== "string") {
            console.error("AI email rewrite returned an invalid response shape.");
            return NextResponse.json({ error: "AI returned an invalid response." }, { status: 502 });
        }

        return NextResponse.json({ text: result.text });
    }
    catch (error) {
        console.error(
            "AI email rewrite failed:",
            error instanceof Error ? error.message : "Unknown provider error",
        );
        return NextResponse.json({ error: "AI email rewriting is temporarily unavailable." }, { status: 502 });
    }
}
