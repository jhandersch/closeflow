import { NextResponse } from "next/server"
import OpenAI from "openai"


const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})


export async function POST(req: Request) {

  try {

    const {
      pipelineValue,
      weightedRevenue,
      revenueAtRisk,
      leads,
    } = await req.json()


    const prompt = `
You are an AI sales forecasting assistant.

Analyze this CRM forecast:

Pipeline value:
€${pipelineValue}

Expected revenue:
€${weightedRevenue}

Revenue at risk:
€${revenueAtRisk}


Lead data:
${JSON.stringify(leads)}


Return JSON only:

{
"summary":"",
"positiveFactors":[],
"risks":[],
"recommendation":""
}

Focus on:
- sales pipeline quality
- deal risks
- conversion probability
- next best actions
`


    const completion =
      await openai.chat.completions.create({

        model:"gpt-4.1-mini",

        messages:[
          {
            role:"system",
            content:
              "You are an expert revenue forecasting analyst."
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
        summary:"Forecast analysis failed",
        positiveFactors:[],
        risks:[],
        recommendation:"Review pipeline manually"
      },
      {
        status:500
      }
    )

  }

}