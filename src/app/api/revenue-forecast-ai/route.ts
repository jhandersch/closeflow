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

  health:
    | "Excellent"
    | "Healthy"
    | "Warning"
    | "Critical"

  headline: string

  summary: string

  topDrivers: string[]

  risks: string[]

  recommendations: string[]

  pipelineComment: string

  singleDealRisk: number
}



const fallbackInsight = (
  locale: "de" | "en" = "de"
): RevenueForecastAIResponse => {

  if (locale === "en") {
    return {
      confidence: 20,
      health: "Warning",
      headline: "Revenue analysis unavailable",
      summary:
        "Revenue intelligence could not be generated automatically.",
      topDrivers: [],
      risks: [
        "Forecast data could not be analyzed automatically.",
      ],
      recommendations: [
        "Review your largest open opportunities manually.",
      ],
      pipelineComment:
        "Pipeline requires manual review.",
      singleDealRisk: 0,
    }
  }


  return {
    confidence: 20,
    health: "Warning",
    headline:
      "Umsatzanalyse nicht verfügbar",
    summary:
      "Umsatz-Insights konnten nicht automatisch erstellt werden.",
    topDrivers: [],
    risks: [
      "Forecast-Daten konnten nicht analysiert werden.",
    ],
    recommendations: [
      "Prüfe die größten offenen Deals manuell.",
    ],
    pipelineComment:
      "Pipeline benötigt eine manuelle Prüfung.",
    singleDealRisk: 0,
  }
}



export async function POST(req: Request) {

  try {

    const {
      leads,
      forecast,
      language,
    } =
      (await req.json()) as {
        leads?: LeadPayload[]
        forecast?: ForecastPayload
        language?: "de" | "en"
      }


    const locale =
      language === "en"
        ? "en"
        : "de"



    if (!Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json(
        fallbackInsight(locale)
      )
    }



    const apiKey =
      process.env.OPENAI_API_KEY



    if (!apiKey) {
      return NextResponse.json(
        fallbackInsight(locale)
      )
    }



    const leadSummary =
      leads
        .map((lead) => {

          return [
            `Lead: ${lead.name ?? "Unknown"}`,
            `Company: ${lead.company ?? "Unknown"}`,
            `Stage: ${lead.status ?? "Unknown"}`,
            `Value: €${lead.value ?? 0}`,
            `Notes: ${lead.notes ?? "None"}`,
            `Next action: ${lead.next_action ?? "None"}`,
          ].join("\n")

        })
        .join("\n\n")



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


Forecast:

Pipeline value:
€${forecast?.pipelineValue ?? 0}

Weighted revenue:
€${forecast?.weightedRevenue ?? 0}

Revenue at risk:
€${forecast?.revenueAtRisk ?? 0}


Deals:

${leadSummary}


Return ONLY JSON:

{
 "confidence": number,
 "health": "Excellent | Healthy | Warning | Critical",
 "headline": "string",
 "summary": "string",
 "topDrivers": ["string"],
 "risks": ["string"],
 "recommendations": ["string"],
 "pipelineComment": "string",
 "singleDealRisk": number
}


Language:
${locale === "de" ? "German" : "English"}

Keep it concise.

`



    const openai =
      new OpenAI({
        apiKey,
      })



    const completion =
      await openai.chat.completions.create({

        model:
          "gpt-4.1-mini",

        messages: [

          {
            role:"system",
            content:
              "Return valid JSON only.",
          },

          {
            role:"user",
            content:prompt,
          },

        ],

        response_format:{
          type:"json_object",
        },

      })



    const raw =
      completion
        .choices[0]
        ?.message
        ?.content



    const result =
      JSON.parse(
        raw ?? "{}"
      ) as Partial<RevenueForecastAIResponse>



    return NextResponse.json({

      confidence:
        typeof result.confidence === "number"
          ? result.confidence
          : 50,


      health:
        result.health ??
        "Warning",


      headline:
        result.headline ??
        "Pipeline analysis completed.",


      summary:
        result.summary ??
        "No summary available.",


      topDrivers:
        Array.isArray(result.topDrivers)
          ? result.topDrivers
          : [],


      risks:
        Array.isArray(result.risks)
          ? result.risks
          : [],


      recommendations:
        Array.isArray(result.recommendations)
          ? result.recommendations
          : [],


      pipelineComment:
        result.pipelineComment ??
        "",


      singleDealRisk:
        typeof result.singleDealRisk === "number"
          ? result.singleDealRisk
          : 0,

    })



  } catch(error) {

    console.error(
      "Revenue forecast AI failed:",
      error
    )


    return NextResponse.json(
      fallbackInsight("de")
    )

  }

}