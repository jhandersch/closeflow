import { NextResponse } from "next/server";
import {
  getRouteUser,
  loadWorkspaceForUser,
} from "@/lib/supabase/route";
import { enforceAndTrackUsageLimit } from "@/lib/usageLimits";
import { captureWorkspaceError } from "@/lib/errorMonitoring";
import { createTrackedAzureOpenAIClient } from "@/lib/aiCost";
import { formatPersonalDealCostsForLead } from "@/lib/personalDealCosts";
import {
  getRetryableStatus,
  getUserFacingErrorMessage,
} from "@/lib/errorRecovery";
import { normalizeLanguage } from "@/lib/i18n";
import { aiTerminologyRules } from "@/lib/aiLanguage";

const isSalesCopilotResponse = (value: unknown): value is {
  strategy: string;
  dealSummary: string;
  nextBestAction: string;
} => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const result = value as Record<string, unknown>;
  return (
    typeof result.strategy === "string" &&
    typeof result.dealSummary === "string" &&
    typeof result.nextBestAction === "string" &&
    result.strategy.length <= 4000 &&
    result.dealSummary.length <= 4000 &&
    result.nextBestAction.length <= 2000
  );
};

export async function POST(req: Request) {
  let userId: string | null = null;

  try {
    const { supabase, user, error } =
      await getRouteUser(req);

    if (error || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    userId = user.id;

    const { workspace } =
      await loadWorkspaceForUser(
        supabase,
        user.id,
        req.headers.get("x-closeflow-workspace-id"),
      );

    const limitCheck =
      await enforceAndTrackUsageLimit(
        supabase,
        user.id,
        "ai",
        workspace?.id,
      );

    if (!limitCheck.ok) {
      return NextResponse.json(
        { error: limitCheck.message },
        { status: limitCheck.status },
      );
    }
    if (!workspace?.id) {
      return NextResponse.json(
        { error: "A workspace is required to use the sales copilot." },
        { status: 403 },
      );
    }

    const requestBody: unknown = await req.json();
    if (!requestBody || typeof requestBody !== "object" || Array.isArray(requestBody)) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    const {
      lead,
      activities,
      memory,
      risk,
      status,
      question,
      mode,
      pipeline,
      language: requestedLanguage,
    } = requestBody as Record<string, unknown>;
    const language = normalizeLanguage(requestedLanguage ?? user.user_metadata?.language);
    const responseLanguage = language === "de" ? "German" : "English";

    const activityList = Array.isArray(activities) ? activities : [];
    const activityHistory = activityList
      .map(
        (activity: unknown) => {
          if (!activity || typeof activity !== "object" || Array.isArray(activity)) return "";
          const item = activity as Record<string, unknown>;
          return `${typeof item.created_at === "string" ? item.created_at : ""}: ${typeof item.action === "string" ? item.action : ""}`;
        },
      )
      .join("\n");
    const leadRecord =
      lead && typeof lead === "object" && !Array.isArray(lead)
        ? lead as Record<string, unknown>
        : {};

    const memoryJson =
      JSON.stringify(memory || {}).slice(0, 2000);

    const riskJson =
      JSON.stringify(risk || {}).slice(0, 1000);

    const pipelineJson =
      JSON.stringify(pipeline || {}).slice(0, 2000);
    const personalCosts = formatPersonalDealCostsForLead(
      user.user_metadata?.personal_deal_costs,
      String(leadRecord.id || ""),
      Number(leadRecord.value || 0),
    );

    const prompt = `
You are an AI sales copilot inside a CRM.

Analyze this sales opportunity and answer the user query.

Lead:
  Name: ${leadRecord.name || "n/a"}
  Company: ${leadRecord.company || "n/a"}
  Deal Value: €${leadRecord.value || 0}
  Current Stage: ${status || leadRecord.status || "n/a"}

User-entered costs for this deal:
  ${personalCosts}

Notes:
  ${leadRecord.notes || "No notes"}

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
- Account for the listed user-entered deal costs when evaluating profitability, pricing flexibility, and recommended next steps. Clearly distinguish the estimated net amount from gross deal value.
- Treat user-entered costs as estimates and do not invent additional costs.
- Do not expose internal costs or margins in customer-facing email drafts.
- Write all free-text values in ${responseLanguage}
- Write every user-visible value entirely in ${responseLanguage}; never switch languages mid-response.
`;

    const openai = createTrackedAzureOpenAIClient(
      supabase,
      workspace.id,
      user.id,
      "sales_copilot",
      "gpt-4.1-mini",
    );
    const completion =
      await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content:
              `You are an expert B2B sales strategist. Return valid JSON only. Keep schema keys in English and write every text value entirely in ${responseLanguage}, without mixing languages.${aiTerminologyRules(language)}`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: {
          type: "json_object",
        },
      });

    const result: unknown = JSON.parse(
      completion.choices[0].message.content || "{}",
    );
    if (!isSalesCopilotResponse(result)) {
      throw new Error("Sales copilot returned an invalid response.");
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);

    if (userId) {
      const { supabase } =
        await getRouteUser(req);

      await captureWorkspaceError(
        supabase,
        userId,
        {
          source: "api",
          level: "error",
          message: "Sales copilot route failed",
          details: {
            error:
              error instanceof Error
                ? error.message
                : String(error),
          },
          pathname: "/api/sales-copilot",
        },
      );
    }

    return NextResponse.json(
      {
        error: getUserFacingErrorMessage(
          error,
          "AI is temporarily unavailable. Please try again in a moment.",
        ),
      },
      {
        status: getRetryableStatus(error),
      },
    );
  }
}
