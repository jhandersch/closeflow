import { NextResponse } from "next/server"
import { getRouteUser } from "@/lib/supabase/route"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, user, error } = await getRouteUser(request)

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: leadId } = await params

  if (!leadId) {
    return NextResponse.json({ error: "leadId is required" }, { status: 400 })
  }

  const body = await request.json()
  const to = typeof body.to === "string" ? body.to.trim() : ""
  const subject = typeof body.subject === "string" ? body.subject.trim() : ""
  const bodyText = typeof body.body === "string" ? body.body.trim() : ""

  if (!to || !subject || !bodyText) {
    return NextResponse.json({ error: "to, subject and body are required" }, { status: 400 })
  }

  // Log email as an activity on the lead
  const { error: activityError } = await supabase.from("activities").insert({
    lead_id: leadId,
    user_id: user.id,
    action: `Email sent to ${to}: "${subject}"`,
    type: "email_sent",
    title: subject,
    description: bodyText,
    created_at: new Date().toISOString(),
  })

  if (activityError) {
    return NextResponse.json({ error: activityError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, to, subject })
}
