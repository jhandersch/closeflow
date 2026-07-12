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
${JSON.stringify(memory)}

Current Risk:
${JSON.stringify(risk)}


Create sales assistance.

Return JSON only:

{
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

 "meetingSummary": ""
}


Focus on:
- closing the deal
- understanding customer motivation
- handling objections
- next best sales conversation
- practical actions for the salesperson
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