import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getRouteUser, loadWorkspaceForUser } from "@/lib/supabase/route";
import { enforceAndTrackUsageLimit } from "@/lib/usageLimits";
import { captureWorkspaceError } from "@/lib/errorMonitoring";
import { recordAiUsageEvent } from "@/lib/aiCost";
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});
export async function POST(req: Request) {
    let locale: "en" = "en";
    let userId: string | null = null;
    try {
        const { supabase, user, error } = await getRouteUser(req);
        if (error || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        userId = user.id;
        const { workspace } = await loadWorkspaceForUser(supabase, user.id);
        const limitCheck = await enforceAndTrackUsageLimit(supabase, user.id, "ai");
        if (!limitCheck.ok) {
            return NextResponse.json({ error: limitCheck.message }, { status: limitCheck.status });
        }
        const { lead, activities, memory, risk, status, question, mode, pipeline, language, } = await req.json();
        locale = "en";
        const activityHistory = activities
            ?.map((activity: any) => `${activity.created_at}: ${activity.action}`)
            .join("\n");
        const memoryJson = JSON.stringify(memory || {}).slice(0, 2000);
        const riskJson = JSON.stringify(risk || {}).slice(0, 1000);
        const pipelineJson = JSON.stringify(pipeline || {}).slice(0, 2000);
        const prompt = `
  You are an AI sales copilot inside a CRM.

  Analyze this sales opportunity and answer the user query.

Lead:
  Name: ${lead?.name || "n/a"}
  Company: ${lead?.company || "n/a"}
  Deal Value: €${lead?.value || 0}
  Current Stage: ${status || lead?.status || "n/a"}

Notes:
  ${lead?.notes || "No notes"}

Activity History:
${activityHistory || "No activity"}

AI Memory:
  ${memoryJson}

Current Risk:
  ${riskJson}

  Pipeline Snapshot:
  ${pipelineJson}

  Mode:
  ${mode || "lead-analysis"}

  User Question:
  ${question || "Generate a complete lead plan."}


Create sales assistance.

Return JSON only:

{
 "strategy": "",

 "dealSummary": "",

 "callPreparation": {
   "goal": "",
   "talkingPoints": [],
   "questions": []
 },

 "emailDraft": "",

 "objections": [
   {
    "objection": "",
    "response": ""
   }
 ],

 "nextBestAction": "",

 "meetingSummary": ""
}


Focus on:

- Think like an experienced B2B sales manager
- Identify why this deal will close or fail
- Create a clear strategy to win this opportunity
- Detect buying signals from activities and notes
- Suggest the next best action
- Prepare the salesperson for the next conversation
- Write emails that move the deal forward
- Avoid generic advice
- Use the available lead context
- Output language for all free-text values: ${"English"}
`;
        const completion = await openai.chat.completions.create({
            model: "gpt-4.1-mini",
            messages: [
                {
                    role: "system",
                    content: `You are an expert B2B sales strategist. Return valid JSON only. Keep schema keys in English, but write all text values in ${"English"}.`
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            response_format: {
                type: "json_object"
            }
        });
        if (workspace?.id) {
            await recordAiUsageEvent(supabase, workspace.id, user.id, "sales_copilot", "gpt-4.1-mini", completion.usage?.prompt_tokens || 0, completion.usage?.completion_tokens || 0);
        }
        const result = JSON.parse(completion.choices[0].message.content || "{}");
        return NextResponse.json(result);
    }
    catch (error) {
        console.error(error);
        if (userId) {
            const { supabase } = await getRouteUser(req);
            await captureWorkspaceError(supabase, userId, {
                source: "api",
                level: "error",
                message: "Sales copilot route failed",
                details: {
                    error: error instanceof Error ? error.message : String(error),
                },
                pathname: "/api/sales-copilot",
            });
        }
        return NextResponse.json({
            error: "Sales copilot failed"
        }, {
            status: 500
        });
    }
}
