import { NextRequest, NextResponse } from "next/server"


export async function POST(request: NextRequest) {

  try {

    const { lead } = await request.json()

    const apiKey = process.env.OPENAI_API_KEY


    if (!apiKey) {
      return NextResponse.json({
        subject: "Follow up",
        email:
          "Hello, I wanted to follow up regarding our previous conversation."
      })
    }


    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",

        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },


        body: JSON.stringify({

          model: "gpt-4o-mini",

          temperature: 0.4,


          messages: [

            {
              role: "system",

              content: `
You are an expert B2B sales assistant.

Create a professional follow-up email.

Consider:
- customer name
- company
- deal value
- pipeline stage
- notes

Return ONLY JSON:

{
 "subject":"email subject",
 "email":"email body"
}

Keep it concise and human.
`
            },


            {
              role:"user",
              content: JSON.stringify(lead)
            }

          ]

        })

      }
    )


    const result = await response.json()


    const content =
      result.choices[0].message.content


    return NextResponse.json(
      JSON.parse(content)
    )


  } catch(error){

    console.error(error)

    return NextResponse.json({
      subject:"Follow up",
      email:"Unable to generate email."
    })

  }

}