import { NextResponse } from "next/server"
import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: Request) {

  let locale: "de" | "en" = "de"

  try {
    const {
      lead,
      activities,
      memory,
      risk,
      status,
      question,
      mode,
      pipeline,
      language,
    } = await req.json()

    locale = language === "en" ? "en" : "de"


    const activityHistory = activities
      ?.map(
        (activity:any) =>
          `${activity.created_at}: ${activity.action}`
      )
      .join("\n")


    const memoryJson = JSON.stringify(memory || {}).slice(0, 2000)
    const riskJson = JSON.stringify(risk || {}).slice(0, 1000)
    const pipelineJson = JSON.stringify(pipeline || {}).slice(0, 2000)

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
- Output language for all free-text values: ${locale === "de" ? "German" : "English"}
`


    const completion =
      await openai.chat.completions.create({

        model: "gpt-4.1-mini",

        messages:[
          {
            role:"system",
            content:
              `You are an expert B2B sales strategist. Return valid JSON only. Keep schema keys in English, but write all text values in ${locale === "de" ? "German" : "English"}.`
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
        error: locale === "de" ? "KI-Vertriebsassistent fehlgeschlagen" : "Sales copilot failed"
      },
      {
        status:500
      }
    )

  }
}