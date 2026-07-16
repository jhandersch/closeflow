import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: Request) {
  try {
    const supabase = await createClient()

    const {
      name,
      company,
      value,
      status,
      source,
      email,
      phone,
      website,
      address,
      tags,
      notes,
      next_action,
      next_action_date,
    } = await req.json()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    console.log("USER:", user)
console.log("USER ERROR:", userError)

const {
  data: session,
} = await supabase.auth.getSession()

console.log("SESSION:", session)

    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { data, error } = await supabase
      .from("leads")
      .insert({
        user_id: user.id,

        name,
        company,

        value,

        status,

        source,

        email,

        phone,

        website,

        address,

        tags,

        notes,

        next_action,

        next_action_date,
      })
      .select()
      .single()

    if (error) {
      console.error(error)

      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 500,
        }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      {
        error: "Internal Server Error",
      },
      {
        status: 500,
      }
    )
  }
}