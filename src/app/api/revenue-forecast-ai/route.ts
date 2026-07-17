import { NextResponse } from "next/server"
import OpenAI from "openai"

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
}

type RevenueForecastAIResponse = {
  confidence: number
  explanation: string
  positiveDrivers: string[]
  risks: string[]
  recommendation: string
}

const fallbackInsight = (locale: "de" | "en" = "de"): RevenueForecastAIResponse => {
  if (locale === "en") {
    return {
      confidence: 0.2,
      explanation: "Revenue insights could not be generated automatically.",
      positiveDrivers: [],
      risks: ["Forecast data could not be analyzed automatically."],
      recommendation: "Review the pipeline manually and focus on the largest open deals.",
    }
  }

  return {
    confidence: 0.2,
    explanation: "Umsatz-Insights konnten nicht automatisch erstellt werden.",
    positiveDrivers: [],
    risks: ["Forecast-Daten konnten nicht automatisch analysiert werden."],
    recommendation: "Prüfe die Pipeline manuell und fokussiere die größten offenen Deals.",
  }
}

export async function POST(req: Request) {
  try {
    const { leads, forecast, language } = (await req.json()) as {
      leads?: LeadPayload[]
      forecast?: ForecastPayload
      language?: "de" | "en"
    }

    const locale = language === "en" ? "en" : "de"

    if (!Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json(fallbackInsight(locale))
    }

    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      return NextResponse.json(fallbackInsight(locale))
    }

    const leadSummary = leads
      .map((lead) => {
        const value = lead.value ?? 0
        const stage = lead.status ?? "Unknown"
        const stageChanged = lead.stage_changed_at ? `Stage changed at ${lead.stage_changed_at}` : "No stage change timestamp"
        const notes = lead.notes ? `Notes: ${lead.notes}` : "No notes"
        const nextAction = lead.next_action ? `Next action: ${lead.next_action}` : "No next action"

        return [
          `- ${lead.name ?? "Unknown lead"} at ${lead.company ?? "Unknown company"}`,
          `  Stage: ${stage}`,
          `  Value: €${value}`,
          `  ${stageChanged}`,
          `  ${notes}`,
          `  ${nextAction}`,
        ].join("\n")
      })
      .join("\n\n")

    const prompt = `
You are an AI revenue analyst for a sales CRM.

Analyze the current forecast and explain why revenue is expected, which deals are driving it, what risks exist, and what the sales team should do now.

Forecast snapshot:
- Pipeline value: €${forecast?.pipelineValue ?? 0}
- Weighted revenue: €${forecast?.weightedRevenue ?? 0}
- Revenue at risk: €${forecast?.revenueAtRisk ?? 0}

Deals:
${leadSummary}

Return JSON only in the following shape:
{
  "confidence": 0.0,
  "explanation": "string",
  "positiveDrivers": ["string"],
  "risks": ["string"],
  "recommendation": "string"
}

Analyze:
- deal values and concentration
- pipeline stage maturity
- activity and movement signals
- risks and likely close outcomes
- the most useful next action for the sales team
- Write all text fields in ${locale === "de" ? "German" : "English"}
`

    const openai = new OpenAI({ apiKey })
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert revenue intelligence analyst for a B2B sales CRM. Return valid JSON only and write text fields in ${locale === "de" ? "German" : "English"}.`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: {
        type: "json_object",
      },
    })

    const result = JSON.parse(completion.choices[0]?.message?.content ?? "{}") as Partial<RevenueForecastAIResponse>

    return NextResponse.json({
      confidence: typeof result.confidence === "number" ? result.confidence : 0.5,
      explanation: typeof result.explanation === "string" ? result.explanation : (locale === "de" ? "Umsatztreiber wurden automatisch zusammengefasst." : "Revenue drivers were summarized automatically."),
      positiveDrivers: Array.isArray(result.positiveDrivers) ? result.positiveDrivers.filter((item): item is string => typeof item === "string") : [],
      risks: Array.isArray(result.risks) ? result.risks.filter((item): item is string => typeof item === "string") : [],
      recommendation: typeof result.recommendation === "string" ? result.recommendation : (locale === "de" ? "Prüfe die Pipeline manuell." : "Review the pipeline manually."),
    })
  } catch (error) {
    console.error("Revenue forecast AI failed:", error)

    const openAiLikeError = error as { status?: number; code?: string; type?: string } | undefined
    const isRecoverableOpenAIError =
      openAiLikeError?.status === 429 ||
      openAiLikeError?.code === "insufficient_quota" ||
      openAiLikeError?.type === "insufficient_quota"

    if (isRecoverableOpenAIError) {
      return NextResponse.json(fallbackInsight("de"))
    }

    return NextResponse.json(fallbackInsight("de"))
  }
}
