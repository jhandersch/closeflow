import { NextResponse } from "next/server"
import OpenAI from "openai"






export async function POST(
  req: Request
) {


  let locale:
    | "de"
    | "en" = "de"



  try {

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })


    const {
      pipelineValue,
      weightedRevenue,
      revenueAtRisk,
      pipelineCoverage,
      leads,
      language,
    } = await req.json()



    locale =
      language === "en"
        ? "en"
        : "de"






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

${JSON.stringify(
  leads,
  null,
  2
)}



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


All text must be written in ${
  locale === "de"
  ? "German"
  : "English"
}.

Keep answers concise.

`







    const completion =
      await openai.chat.completions.create({

        model:
          "gpt-4.1-mini",


        temperature:
          0.25,


        response_format:{
          type:"json_object",
        },


        messages:[


          {


            role:"system",


            content:

`
You are an expert B2B revenue forecasting analyst inside a CRM.

Your goal is to help sales teams understand future revenue and improve decisions.

Always return valid JSON only.

`

          },


          {


            role:"user",


            content:
              prompt

          }


        ]

      })







    const content =
      completion
      .choices[0]
      .message
      .content







    if (!content) {

      throw new Error(
        "No AI response"
      )

    }







    return NextResponse.json(
      JSON.parse(content)
    )






  } catch(error) {


    console.error(
      "FORECAST AI ERROR:",
      error
    )




    return NextResponse.json(

      {

        summary:
          locale === "de"
          ? "Forecast-Analyse fehlgeschlagen."
          : "Forecast analysis failed.",



        positiveFactors:
          [],



        risks:
          [],



        recommendation:
          locale === "de"
          ? "Pipeline manuell prüfen."
          : "Review pipeline manually.",

      },


      {
        status: 200
      }

    )


  }

}