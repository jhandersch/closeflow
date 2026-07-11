import { NextRequest, NextResponse } from "next/server"


export async function POST(request: NextRequest) {

  try {

    const { leads } = await request.json()

    const apiKey = process.env.OPENAI_API_KEY


    if (!apiKey) {

      return NextResponse.json({

        explanation:
          "Your highest priority deals should receive immediate attention based on value and pipeline stage.",

        nextAction:
          "Contact proposal-stage leads first."

      })

    }



    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {

        method:"POST",

        headers:{
          Authorization:`Bearer ${apiKey}`,
          "Content-Type":"application/json",
        },


        body:JSON.stringify({

          model:"gpt-4o-mini",

          temperature:0.3,


          messages:[

            {
              role: "system",

              content: `
            You are an expert B2B sales strategist inside a CRM.

            Analyze the sales opportunities.

            Consider:
            - deal value
            - pipeline stage
            - customer momentum
            - notes
            - buying signals
            - risks

            Return ONLY valid JSON:

            {
              "headline": "short title",
              "explanation": "sales analysis",
              "nextAction": "specific next step",
              "priorityReason": "why this deal matters",
              "riskLevel": "Low | Medium | High"
            }

            Be concise and actionable.
            `
            },


            {
              role:"user",

              content:
              JSON.stringify(leads)

            }

          ]

        })

      }
    )


    const result = await response.json()

    console.log("OPENAI RESULT:", result)


    if (!result.choices?.[0]?.message?.content) {

      console.log("OPENAI ERROR DETAIL:", JSON.stringify(result, null, 2))

      throw new Error(
        result?.error?.message ||
        "No AI response received"
      )

    }


    const content =
      result.choices[0].message.content

    return NextResponse.json(
      JSON.parse(content)
    )


  } catch (error) {

    console.error("PRIORITY AI ERROR:", error)

    return NextResponse.json({

      headline:
        "Priority opportunities need attention",

      explanation:
        "Your highest priority deals should receive attention based on value and pipeline stage.",

      nextAction:
        "Contact proposal-stage leads first.",

      priorityReason:
        "High-value opportunities have the strongest closing potential.",

      riskLevel:
        "Medium"

    })

}

}