import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getRouteUser, requireAal2 } from "@/lib/supabase/route"

export async function POST(request: Request) {
  const { supabase, user, error } = await getRouteUser(request)

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const authz = await requireAal2(request, supabase)
  if (!authz.ok) {
    return NextResponse.json({ error: authz.message }, { status: authz.status })
  }

  const body = await request.json().catch(() => ({}))
  const confirmation = typeof body?.confirmation === "string" ? body.confirmation.trim() : ""

  if (confirmation !== "DELETE") {
    return NextResponse.json({ error: "Confirmation text mismatch" }, { status: 400 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRole) {
    return NextResponse.json({ error: "Deletion backend not configured" }, { status: 500 })
  }

  const admin = createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const cleanupOperations = [
    admin.from("calendar_events").delete().eq("user_id", user.id),
    admin.from("activities").delete().eq("user_id", user.id),
    admin.from("tasks").delete().eq("user_id", user.id),
    admin.from("leads").delete().eq("user_id", user.id),
    admin.from("notifications").delete().eq("user_id", user.id),
    admin.from("workspace_members").delete().eq("user_id", user.id),
    admin.from("profiles").delete().eq("id", user.id),
  ]

  const cleanupResults = await Promise.all(cleanupOperations)
  const cleanupError = cleanupResults.find((result) => result.error)
  if (cleanupError?.error) {
    return NextResponse.json({ error: cleanupError.error.message }, { status: 500 })
  }

  const { error: deleteUserError } = await admin.auth.admin.deleteUser(user.id)
  if (deleteUserError) {
    return NextResponse.json({ error: deleteUserError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}