import { NextResponse } from "next/server"
import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: Request) {

  let locale: "de" | "en" = "de"

  try {

    const { lead, activities, language } = await req.json()
    locale = language === "en" ? "en" : "de"


    const history = activities
      .map(
        (activity:any) =>
          `${activity.created_at}: ${activity.action}`
      )
      .join("\n")


    const prompt = `
You are an AI sales assistant inside a CRM.

Analyze this lead:

Lead:
Name: ${lead.name}
Company: ${lead.company}
Status: ${lead.status}
Value: €${lead.value}
Notes:
${lead.notes || "No notes"}

Activity history:
${history || "No activity yet"}


Return JSON only:

{
  "summary": "Short summary of the customer situation and buying context.",
  "risk": "Describe possible risks, objections, or concerns.",
  "nextAction": "The single best next sales action.",
  "confidence": 0.65
}

Focus on:
- customer buying intent
- sales risks
- objections
- engagement level
- pipeline movement
- next best action
- probability of conversion

Consider that:
- returning from a later stage to an earlier stage can indicate hesitation
- but returning back to a later stage can indicate continued buying interest
- Write all text values in ${locale === "de" ? "German" : "English"}

`


    const completion = await openai.chat.completions.create({

      model: "gpt-4.1-mini",

      messages:[
        {
          role:"system",
          content:
            `You are an expert B2B sales assistant. Return valid JSON only and write all text values in ${locale === "de" ? "German" : "English"}.`
        },
        {
          role:"user",
          content:prompt
        }
      ],

      response_format:{
        type:"json_object"
      }

    })


    const result =
      JSON.parse(
        completion.choices[0].message.content || "{}"
      )


    return NextResponse.json(result)


  } catch(error){

    console.error(error)

    return NextResponse.json(
      {
        summary: locale === "de" ? "KI-Analyse fehlgeschlagen." : "AI analysis failed.",
        risk: locale === "de" ? "Unbekannt" : "Unknown",
        nextAction: locale === "de" ? "Manuell prüfen." : "Review manually.",
        confidence:0,
      },
      {
        status:500
      }
    )

  }

}