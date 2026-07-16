import { NextResponse } from "next/server"
import { getRouteUser } from "@/lib/supabase/route"

export async function PATCH(request: Request) {
  const { supabase, user, error } = await getRouteUser(request)

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const avatarUrl = typeof body.avatar_url === "string" ? body.avatar_url.trim() : typeof body.avatar === "string" ? body.avatar.trim() : ""

  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({
      id: user.id,
      avatar_url: avatarUrl,
    })

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 })
  }

  const { error: authError } = await supabase.auth.updateUser({
    data: { avatar_url: avatarUrl },
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true, avatar_url: avatarUrl })
}