import { NextRequest, NextResponse } from "next/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"

export async function POST(
  request: NextRequest,
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
        user
      },
      error: userError,
    } = await supabase.auth.getUser()


    if (userError || !user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      )
    }



    const {
      data: lead,
      error: leadError,
    } =
      await supabase
        .from("leads")
        .select("*")
        .eq("id", id)
        .single()



    if (leadError || !lead) {

      console.error(
        "Lead lookup error:",
        leadError
      )

      return NextResponse.json(
        {
          error: "Lead not found",
        },
        {
          status:404,
        }
      )

    }



    const analysis = `
AI Deal Analysis

Lead:
${lead.name}

Company:
${lead.company}

Deal Value:
€${lead.value ?? 0}

Current Stage:
${lead.status}


Recommendation:

- Follow up with this lead based on the current pipeline stage.
- Review deal risks and next actions.
- Keep activity history updated.
- Prioritize communication if the deal is valuable.


Risk Level:
${
  lead.status === "new"
  ? "Medium"
  : "Low"
}

Opportunity:
This lead has potential and should remain actively managed.
`



    return NextResponse.json({

      analysis,

    })


  } catch(error) {

    console.error(
      "AI analysis error:",
      error
    )


    return NextResponse.json(
      {
        error:"Internal server error"
      },
      {
        status:500
      }
    )

  }

}