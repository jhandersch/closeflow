import { NextResponse } from "next/server"
import OpenAI from "openai"

import { recordAiUsageEvent } from "@/lib/aiCost"
import { createClient } from "@/lib/supabase/server"
import { enforceAndTrackUsageLimit } from "@/lib/usageLimits"

type LeadPayload = {
  id?: string
  name?: string
  company?: string
  status?: string
  value?: number
  created_at?: string
  stage_changed_at?: string | null
  notes?: string | null
  next_action?: string | null
}

type ForecastPayload = {
  pipelineValue?: number
  weightedRevenue?: number
  revenueAtRisk?: number
  commitRevenue?: number
  bestCaseRevenue?: number
  confidence?: number
  averageHealth?: number
  averageProbability?: number
  activeDeals?: number
  pipelineCoverage?: number
}

type RevenueForecastAIResponse = {
  confidence: number
  health: "Excellent" | "Healthy" | "Warning" | "Critical"
  headline: string
  summary: string
  topDrivers: string[]
  risks: string[]
  recommendations: string[]
  pipelineComment: string
  singleDealRisk: number
}

function fallbackInsight(
  locale: "de" | "en"
): RevenueForecastAIResponse {
  if (locale === "en") {
    return {
      confidence: 20,
      health: "Warning",
      headline: "Revenue analysis temporarily unavailable",
      summary:
        "The AI analysis could not be generated right now. Your forecast data is still available.",
      topDrivers: [],
      risks: [
        "AI analysis is temporarily unavailable.",
      ],
      recommendations: [
        "Review your largest open opportunities manually.",
        "Check deals with low health scores or missing next actions.",
      ],
      pipelineComment:
        "The pipeline remains available and can be reviewed manually.",
      singleDealRisk: 0,
    }
  }

  return {
    confidence: 20,
    health: "Warning",
    headline: "Umsatzanalyse momentan nicht verfügbar",
    summary:
      "Die KI-Analyse konnte momentan nicht erstellt werden. Deine Forecast-Daten sind weiterhin verfügbar.",
    topDrivers: [],
    risks: [
      "Die KI-Analyse ist momentan nicht verfügbar.",
    ],
    recommendations: [
      "Prüfe deine größten offenen Deals manuell.",
      "Prüfe Deals mit niedrigem Health Score oder fehlender nächster Aktion.",
    ],
    pipelineComment:
      "Die Pipeline ist weiterhin verfügbar und kann manuell geprüft werden.",
    singleDealRisk: 0,
  }
}

function normalizeResponse(
  value: Partial<RevenueForecastAIResponse>,
  locale: "de" | "en"
): RevenueForecastAIResponse {
  const validHealth =
    value.health === "Excellent" ||
    value.health === "Healthy" ||
    value.health === "Warning" ||
    value.health === "Critical"
      ? value.health
      : "Warning"

  return {
    confidence:
      typeof value.confidence === "number"
        ? Math.max(
            0,
            Math.min(100, value.confidence)
          )
        : 50,

    health: validHealth,

    headline:
      typeof value.headline === "string" &&
      value.headline.trim()
        ? value.headline.trim()
        : locale === "de"
          ? "Pipeline-Analyse abgeschlossen."
          : "Pipeline analysis completed.",

    summary:
      typeof value.summary === "string" &&
      value.summary.trim()
        ? value.summary.trim()
        : locale === "de"
          ? "Keine Zusammenfassung verfügbar."
          : "No summary available.",

    topDrivers:
      Array.isArray(value.topDrivers)
        ? value.topDrivers.filter(
            (item): item is string =>
              typeof item === "string"
          )
        : [],

    risks:
      Array.isArray(value.risks)
        ? value.risks.filter(
            (item): item is string =>
              typeof item === "string"
          )
        : [],

    recommendations:
      Array.isArray(value.recommendations)
        ? value.recommendations.filter(
            (item): item is string =>
              typeof item === "string"
          )
        : [],

    pipelineComment:
      typeof value.pipelineComment === "string"
        ? value.pipelineComment
        : "",

    singleDealRisk:
      typeof value.singleDealRisk === "number"
        ? Math.max(
            0,
            Math.min(
              100,
              value.singleDealRisk
            )
          )
        : 0,
  }
}

export async function POST(req: Request) {
  const supabase = await createClient()

  /*
   * AUTHENTICATION
   */

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      )
    }

    /*
     * REQUEST
     */

    const body = (await req.json()) as {
      leads?: LeadPayload[]
      forecast?: ForecastPayload
      language?: "de" | "en"
    }

    const locale =
      body.language === "en"
        ? "en"
        : "de"

    const leads = body.leads ?? []
    const forecast = body.forecast ?? {}

    if (
      !Array.isArray(leads) ||
      leads.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            locale === "de"
              ? "Keine Leads für die Forecast-Analyse vorhanden."
              : "No leads available for forecast analysis.",
        },
        {
          status: 400,
        }
      )
    }

    /*
     * AI USAGE LIMIT
     *
     * This checks the user's workspace and
     * monthly AI allowance.
     */

    const usageCheck =
      await enforceAndTrackUsageLimit(
        supabase,
        user.id,
        "ai"
      )

    if (!usageCheck.ok) {
      return NextResponse.json(
        {
          error: usageCheck.message,
        },
        {
          status: usageCheck.status,
        }
      )
    }

    /*
     * OPENAI KEY
     */

    const apiKey =
      process.env.OPENAI_API_KEY

    if (!apiKey) {
      console.error(
        "Revenue Forecast AI: OPENAI_API_KEY is missing."
      )

      return NextResponse.json(
        {
          error:
            locale === "de"
              ? "KI momentan nicht verfügbar."
              : "AI is currently unavailable.",
        },
        {
          status: 503,
        }
      )
    }

    /*
     * LIMIT INPUT SIZE
     *
     * Prevent unnecessarily large AI requests.
     */

    const leadSummary = leads
      .slice(0, 20)
      .map((lead) =>
        [
          `Lead: ${lead.name ?? "Unknown"}`,
          `Company: ${lead.company ?? "Unknown"}`,
          `Stage: ${lead.status ?? "Unknown"}`,
          `Value: €${Number(
            lead.value ?? 0
          )}`,
          `Notes: ${lead.notes ?? "None"}`,
          `Next action: ${
            lead.next_action ?? "None"
          }`,
        ].join("\n")
      )
      .join("\n\n")

    /*
     * PROMPT
     */

    const prompt = `
You are an enterprise CRM Revenue Intelligence AI.

Analyze this sales pipeline like a VP of Sales.

Evaluate:

- pipeline health
- revenue concentration
- deal quality
- inactivity risk
- proposal maturity
- forecast confidence
- biggest opportunities
- biggest threats
- recommended actions

FORECAST

Pipeline value:
€${Number(
      forecast.pipelineValue ?? 0
    )}

Weighted revenue:
€${Number(
      forecast.weightedRevenue ?? 0
    )}

Revenue at risk:
€${Number(
      forecast.revenueAtRisk ?? 0
    )}

Commit revenue:
€${Number(
      forecast.commitRevenue ?? 0
    )}

Best case revenue:
€${Number(
      forecast.bestCaseRevenue ?? 0
    )}

Average health:
${Number(
      forecast.averageHealth ?? 0
    )}%

Average probability:
${Number(
      forecast.averageProbability ?? 0
    )}%

Active deals:
${Number(
      forecast.activeDeals ?? 0
    )}

DEALS

${leadSummary}

Return ONLY valid JSON with exactly this structure:

{
  "confidence": 0,
  "health": "Excellent",
  "headline": "",
  "summary": "",
  "topDrivers": [],
  "risks": [],
  "recommendations": [],
  "pipelineComment": "",
  "singleDealRisk": 0
}

Rules:

- confidence must be between 0 and 100
- singleDealRisk must be between 0 and 100
- health must be exactly one of:
  Excellent, Healthy, Warning, Critical
- topDrivers must be an array of strings
- risks must be an array of strings
- recommendations must be an array of strings
- Keep the response concise
- Do not invent deals or numbers
- Base the analysis only on the supplied data

Language:
${
  locale === "de"
    ? "German"
    : "English"
}
`

    const openai = new OpenAI({
      apiKey,
    })

    /*
     * OPENAI REQUEST
     */

    let completion

    try {
      completion =
        await openai.chat.completions.create({
          model: "gpt-4.1-mini",

          messages: [
            {
              role: "system",
              content:
                "You are a CRM revenue intelligence assistant. Return valid JSON only.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],

          response_format: {
            type: "json_object",
          },

          temperature: 0.2,
        })
    } catch (openaiError) {
      console.error(
        "Revenue Forecast AI: OpenAI request failed",
        openaiError
      )

      /*
       * CONTROLLED FALLBACK
       */

      return NextResponse.json(
        fallbackInsight(locale),
        {
          status: 200,
          headers: {
            "X-AI-Fallback": "true",
          },
        }
      )
    }

    /*
     * TOKEN / COST TRACKING
     */

    if (
      usageCheck.context &&
      completion.usage
    ) {
      try {
        await recordAiUsageEvent(
          supabase,
          usageCheck.context.workspaceId,
          user.id,
          "revenue_forecast",
          "gpt-4.1-mini",
          completion.usage.prompt_tokens ??
            0,
          completion.usage
            .completion_tokens ?? 0
        )
      } catch (usageError) {
        /*
         * Usage tracking must never break
         * a successful AI response.
         */

        console.error(
          "Revenue Forecast AI: usage tracking failed",
          usageError
        )
      }
    }

    /*
     * RESPONSE
     */

    const raw =
      completion.choices[0]
        ?.message
        ?.content

    if (!raw) {
      console.error(
        "Revenue Forecast AI: empty response"
      )

      return NextResponse.json(
        fallbackInsight(locale),
        {
          status: 200,
          headers: {
            "X-AI-Fallback": "true",
          },
        }
      )
    }

    /*
     * JSON PARSING
     */

    let parsed:
      Partial<RevenueForecastAIResponse>

    try {
      parsed = JSON.parse(raw)
    } catch (parseError) {
      console.error(
        "Revenue Forecast AI: invalid JSON",
        {
          parseError,
        }
      )

      return NextResponse.json(
        fallbackInsight(locale),
        {
          status: 200,
          headers: {
            "X-AI-Fallback": "true",
          },
        }
      )
    }

    /*
     * NORMALIZE
     */

    const result =
      normalizeResponse(
        parsed,
        locale
      )

    console.log(
      "Revenue Forecast AI: response received"
    )

    return NextResponse.json(
      result
    )
  } catch (error) {
    console.error(
      "Revenue forecast AI failed:",
      error
    )

    /*
     * FINAL FALLBACK
     *
     * Even unexpected errors do not
     * destroy the dashboard.
     */

    return NextResponse.json(
      fallbackInsight("de"),
      {
        status: 200,
        headers: {
          "X-AI-Fallback": "true",
        },
      }
    )
  }
}