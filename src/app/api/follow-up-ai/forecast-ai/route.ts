import { NextResponse } from "next/server";
import { getRouteUser } from "@/lib/supabase/route";
import { enforceAndTrackUsageLimit } from "@/lib/usageLimits";
import { createTrackedOpenAIClient } from "@/lib/aiCost";

const MAX_INPUT_LENGTH = 16_000;
const MAX_LEADS = 100;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export async function POST(req: Request) {
  const { supabase, user, error } = await getRouteUser(req);
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!isRecord(body) || !Array.isArray(body.leads)) {
    return NextResponse.json({ error: "A forecast and leads array are required." }, { status: 400 });
  }

  const { pipelineValue, weightedRevenue, revenueAtRisk, pipelineCoverage, leads } = body;
  if (leads.length > MAX_LEADS) {
    return NextResponse.json({ error: `A maximum of ${MAX_LEADS} leads may be analyzed at once.` }, { status: 413 });
  }

  if (
    typeof pipelineValue !== "number" ||
    !Number.isFinite(pipelineValue) ||
    typeof weightedRevenue !== "number" ||
    !Number.isFinite(weightedRevenue) ||
    typeof revenueAtRisk !== "number" ||
    !Number.isFinite(revenueAtRisk) ||
    typeof pipelineCoverage !== "number" ||
    !Number.isFinite(pipelineCoverage)
  ) {
    return NextResponse.json({ error: "Forecast values must be finite numbers." }, { status: 400 });
  }

  if (pipelineCoverage < 0 || pipelineCoverage > 100) {
    return NextResponse.json({ error: "Pipeline coverage must be between 0 and 100." }, { status: 400 });
  }

  if (JSON.stringify(body).length > MAX_INPUT_LENGTH) {
    return NextResponse.json({ error: `Forecast input must be ${MAX_INPUT_LENGTH} characters or fewer.` }, { status: 413 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI forecasting is not configured." }, { status: 503 });
  }

  const limitCheck = await enforceAndTrackUsageLimit(
    supabase,
    user.id,
    "ai",
    req.headers.get("x-closeflow-workspace-id"),
  );
  if (!limitCheck.ok) {
    return NextResponse.json({ error: limitCheck.message }, { status: limitCheck.status });
  }
  if (!limitCheck.context) {
    return NextResponse.json({ error: "A workspace is required to use AI forecasting." }, { status: 403 });
  }

  const prompt = `
Analyze this CRM revenue forecast.

Financial overview:

Pipeline value:
€${pipelineValue}

Expected weighted revenue:
€${weightedRevenue}

Revenue at risk:
€${revenueAtRisk}

Pipeline confidence:
${pipelineCoverage}%

Opportunity data:

${JSON.stringify(leads, null, 2)}

Analyze:

- pipeline quality
- revenue confidence
- deal health
- closing probability
- risks
- inactive opportunities
- next best actions

Important:

Focus on actionable sales decisions.

Identify:
- strongest positive signals
- biggest revenue risks
- recommended sales actions

Return ONLY valid JSON:

{
  "summary": "short forecast explanation",
  "positiveFactors": [
    "factor 1",
    "factor 2"
  ],
  "risks": [
    "risk 1",
    "risk 2"
  ],
  "recommendation": "specific next action"
}

All text must be written in English.

Keep answers concise.
`;

  try {
    const openai = createTrackedOpenAIClient(
      apiKey,
      supabase,
      limitCheck.context.workspaceId,
      user.id,
      "follow_up_forecast_ai",
    );
    const completion =
      await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        temperature: 0.25,
        response_format: {
          type: "json_object",
        },
        messages: [
          {
            role: "system",
            content: `
You are an expert B2B revenue forecasting analyst inside a CRM.

Your goal is to help sales teams understand future revenue and improve decisions.

Always return valid JSON only and write all text values in English.
`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      });

    const content = completion.choices[0]?.message.content;

    if (!content) {
      console.error("AI forecast returned an empty response.");
      return NextResponse.json({ error: "AI returned an empty response." }, { status: 502 });
    }

    const result: unknown = JSON.parse(content);
    if (
      !isRecord(result) ||
      typeof result.summary !== "string" ||
      !Array.isArray(result.positiveFactors) ||
      !Array.isArray(result.risks) ||
      typeof result.recommendation !== "string" ||
      !result.positiveFactors.every((item) => typeof item === "string") ||
      !result.risks.every((item) => typeof item === "string")
    ) {
      console.error("AI forecast returned an invalid response shape.");
      return NextResponse.json({ error: "AI returned an invalid response." }, { status: 502 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error(
      "AI forecast request failed:",
      error instanceof Error ? error.message : "Unknown provider error",
    );
    return NextResponse.json({ error: "AI forecasting is temporarily unavailable." }, { status: 502 });
  }
}