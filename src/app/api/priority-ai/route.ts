import { NextRequest, NextResponse } from "next/server"


export async function POST(
  request: NextRequest
) {

  let locale: "de" | "en" = "de"


  try {


    const {
      leads,
      language,
    } = await request.json()



    locale =
      language === "en"
        ? "en"
        : "de"




    const apiKey =
      process.env.OPENAI_API_KEY





    if (!apiKey) {

      return NextResponse.json({

        headline:
          locale === "de"
            ? "Prioritäten analysiert"
            : "Priority analysis ready",


        explanation:
          locale === "de"
            ? "Die wichtigsten Deals sollten anhand von Wert, Pipeline-Stufe und Aktivität priorisiert werden."
            : "The most important deals should be prioritized using value, pipeline stage and activity signals.",


        nextAction:
          locale === "de"
            ? "Starte mit hochwertigen Deals in fortgeschrittenen Phasen."
            : "Start with high-value deals in advanced stages.",


        priorityReason:
          locale === "de"
            ? "Wertvolle Opportunities mit hohem Abschluss-Potenzial benötigen zuerst Aufmerksamkeit."
            : "High-value opportunities with strong closing potential need attention first.",


        riskLevel:
          "Medium"

      })

    }






    const response =
      await fetch(
        "https://api.openai.com/v1/chat/completions",
        {


          method:"POST",


          headers:{

            Authorization:
              `Bearer ${apiKey}`,

            "Content-Type":
              "application/json",

          },



          body:JSON.stringify({


            model:
              "gpt-4o-mini",


            temperature:
              0.25,



            response_format:{
              type:"json_object"
            },



            messages:[


              {


                role:"system",


                content:`

You are an AI sales strategist inside a professional CRM.

Your job:
Analyze the provided opportunities and identify the most important deal to focus on.

Use these signals:

- Deal value
- Pipeline stage
- Priority score
- Health score
- Close probability
- Urgency
- Customer notes
- Next action
- Activity freshness


Rules:

1. Focus on actionable sales advice.
2. Prefer deals with high revenue potential.
3. Consider risks from inactivity.
4. Recommend a specific next step.
5. Do not invent customer information.


Return ONLY valid JSON:

{
  "headline": "short title",
  "explanation": "clear sales analysis",
  "nextAction": "specific action",
  "priorityReason": "why this opportunity matters",
  "riskLevel": "Low | Medium | High"
}


Language:
${locale === "de"
? "German"
: "English"
}


Keep answers concise.

`

              },



              {


                role:"user",


                content:
                  JSON.stringify(
                    leads,
                    null,
                    2
                  )


              }


            ]


          })


        }
      )






    const result =
      await response.json()






    if (
      !result.choices?.[0]?.message?.content
    ) {

      throw new Error(
        result?.error?.message ||
        "No AI response"
      )

    }






    const content =
      result
      .choices[0]
      .message
      .content






    return NextResponse.json(
      JSON.parse(content)
    )





  } catch(error) {


    console.error(
      "PRIORITY AI ERROR:",
      error
    )



    return NextResponse.json({

      headline:
        locale === "de"
          ? "Deals benötigen Aufmerksamkeit"
          : "Deals need attention",



      explanation:
        locale === "de"
          ? "Die Pipeline sollte anhand von Wert, Aktivität und Abschlusswahrscheinlichkeit überprüft werden."
          : "The pipeline should be reviewed using value, activity and closing probability.",



      nextAction:
        locale === "de"
          ? "Prüfe deine wichtigsten Opportunities."
          : "Review your highest-value opportunities.",



      priorityReason:
        locale === "de"
          ? "Hohe Chancen sollten zuerst bearbeitet werden."
          : "High-potential opportunities should be handled first.",



      riskLevel:
        "Medium"

    })

  }

}