import { NextResponse } from "next/server"
import OpenAI from "openai"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"


export async function POST(
  request: Request,
  context: {
    params: Promise<{ id: string }>
  }
) {

  try {

    const { id } = await context.params

    const cookieSupabase = await createClient()
    const authorization = request.headers.get("authorization")
    const bearerToken = authorization?.startsWith("Bearer ")
      ? authorization.slice(7)
      : null

    const supabase = bearerToken
      ? createSupabaseClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            global: {
              headers: {
                Authorization: `Bearer ${bearerToken}`,
              },
            },
            auth: {
              persistSession: false,
              autoRefreshToken: false,
            },
          }
        )
      : cookieSupabase


    const {
      data: {
        user,
      },
      error: userError,
    } = await supabase.auth.getUser()



if(userError || !user){
      return NextResponse.json(
        {
          error:"Unauthorized"
        },
        {
          status:401
        }
      )
    }



    const {
      data: lead,
      error,
    } = await supabase
      .from("leads")
      .select("*")
      .eq("id", id)
      .single()



    if(error || !lead){

      return NextResponse.json(
        {
          error:"Lead not found"
        },
        {
          status:404
        }
      )

    }



    const openai =
      new OpenAI({
        apiKey:
          process.env.OPENAI_API_KEY
      })



    const completion =
      await openai.chat.completions.create({

        model:"gpt-4.1-mini",

        response_format:{
          type:"json_object"
        },

        messages:[

          {
            role:"system",
            content:
`
You are an expert sales assistant.

Create a follow-up email for a sales representative.

Return JSON:

{
 subject:"",
 email:"",
 reason:"",
 next_action:""
}

Language: German
`
          },


          {
            role:"user",
            content:
`
Lead:
${lead.name}

Company:
${lead.company}

Status:
${lead.status}

Deal Value:
${lead.value}

Notes:
${lead.notes || "none"}

Create the best follow-up.
`
          }

        ]

      })



    const result =
      JSON.parse(
        completion
        .choices[0]
        .message
        .content || "{}"
      )



    return NextResponse.json(
      result
    )


  }

  catch(error){

    console.error(
      "FOLLOW UP AI ERROR",
      error
    )


    return NextResponse.json(
      {
        error:"AI failed"
      },
      {
        status:500
      }
    )

  }

}