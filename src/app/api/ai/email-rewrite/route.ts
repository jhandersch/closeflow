import { NextResponse } from "next/server";
import OpenAI from "openai";
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const text = typeof body.text === "string" ? body.text.trim() : "";
        const tone = typeof body.tone === "string" ? body.tone.trim() : "professional";
        if (!text) {
            return NextResponse.json({ text: "" }, { status: 400 });
        }
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ text: text });
        }
        const openai = new OpenAI({ apiKey });
        const completion = await openai.chat.completions.create({
            model: "gpt-4.1-mini",
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "system",
                    content: `Rewrite the email text in a ${tone} tone. Return JSON only with a single key called text.`,
                },
                {
                    role: "user",
                    content: text,
                },
            ],
        });
        const result = JSON.parse(completion.choices[0].message.content || "{}");
        return NextResponse.json({
            text: typeof result.text === "string" ? result.text : text,
        });
    }
    catch (error) {
        console.error(error);
        return NextResponse.json({ text: "" }, { status: 500 });
    }
}
