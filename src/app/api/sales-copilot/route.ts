import { NextResponse } from "next/server"
import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: Request) {
  try {
    const {
      lead,
      activities,
      memory,
      risk,
      status,
    } = await req.json()


    const activityHistory = activities
      ?.map(
        (activity:any) =>
          `${activity.created_at}: ${activity.action}`
      )
      .join("\n")


    const prompt = `
You are an AI sales copilot inside a CRM.

Analyze this sales opportunity.

Lead:
Name: ${lead.name}
Company: ${lead.company}
Deal Value: €${lead.value}
Current Stage: ${status}

Notes:
${lead.notes || "No notes"}

Activity History:
${activityHistory || "No activity"}

AI Memory:
JSON.stringify(memory).slice(0,2000)

Current Risk:
JSON.stringify(risk).slice(0,1000)


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
`


    const completion =
      await openai.chat.completions.create({

        model: "gpt-4.1-mini",

        messages:[
          {
            role:"system",
            content:
              "You are an expert B2B sales strategist."
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
        error:"Sales copilot failed"
      },
      {
        status:500
      }
    )

  }
}