import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getRouteUser } from "@/lib/supabase/route";
export async function POST(request: Request) {
    try {
        const { user, error } = await getRouteUser(request);
        if (error || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const body = await request.json();
        const lead = body.lead || {};
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({
                customer_summary: `${lead.name || "Lead"} at ${lead.company || "Unknown company"}`,
                important_points: ["Review the current pipeline stage", "Clarify decision makers", "Confirm budget and timeline"],
                questions: ["What changed since the last conversation?", "Who owns the decision?"],
                risks: ["Limited activity", "No clear next step"],
                next_steps: ["Set a clear follow-up date", "Send a recap email"],
            });
        }
        const openai = new OpenAI({ apiKey });
        const completion = await openai.chat.completions.create({
            model: "gpt-4.1-mini",
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "system",
                    content: "Prepare a concise meeting brief for a sales rep. Return JSON with customer_summary, important_points, questions, risks, next_steps.",
                },
                {
                    role: "user",
                    content: JSON.stringify(lead),
                },
            ],
        });
        const result = JSON.parse(completion.choices[0].message.content || "{}");
        return NextResponse.json({
            customer_summary: result.customer_summary || "",
            important_points: Array.isArray(result.important_points) ? result.important_points : [],
            questions: Array.isArray(result.questions) ? result.questions : [],
            risks: Array.isArray(result.risks) ? result.risks : [],
            next_steps: Array.isArray(result.next_steps) ? result.next_steps : [],
        });
    }
    catch (error) {
        console.error(error);
        return NextResponse.json({ error: "AI failed" }, { status: 500 });
    }
}
