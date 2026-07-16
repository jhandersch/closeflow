import { NextResponse } from "next/server"
import { getRouteUser } from "@/lib/supabase/route"

export async function GET(request: Request) {
  const { supabase, user, error } = await getRouteUser(request)

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle()

  if (!membership?.workspace_id) {
    return NextResponse.json({ workspace_id: null, ai_requests: 0, lead_count: 0, month: new Date().toISOString().slice(0, 7) })
  }

  const month = new Date().toISOString().slice(0, 7)
  const { data: usage } = await supabase
    .from("usage")
    .select("workspace_id, ai_requests, lead_count, month")
    .eq("workspace_id", membership.workspace_id)
    .eq("month", month)
    .maybeSingle()

  return NextResponse.json({
    workspace_id: membership.workspace_id,
    ai_requests: usage?.ai_requests || 0,
    lead_count: usage?.lead_count || 0,
    month,
  })
}
