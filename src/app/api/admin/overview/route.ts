import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getRouteUser, requireAal2 } from "@/lib/supabase/route"

const isAdminEmail = (email: string | null | undefined) => {
  if (!email) return false
  const raw = process.env.CLOSEFLOW_ADMIN_EMAILS || ""
  const list = raw
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
  return list.includes(email.toLowerCase())
}

export async function GET(request: Request) {
  const { supabase, user, error } = await getRouteUser(request)

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const authz = await requireAal2(request, supabase)
  if (!authz.ok) {
    return NextResponse.json({ error: authz.message }, { status: authz.status })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRole) {
    return NextResponse.json({ error: "Admin backend not configured" }, { status: 500 })
  }

  const admin = createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const [workspacesRes, usersRes, leadsRes, subsRes, usageRes] = await Promise.all([
    admin.from("workspaces").select("id", { count: "exact", head: true }),
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("leads").select("id", { count: "exact", head: true }),
    admin.from("subscriptions").select("id, plan, status"),
    admin.from("usage").select("ai_requests"),
  ])

  const monthlyRevenue = (subsRes.data || []).reduce((sum, row) => {
    const plan = String(row.plan || "free")
    const status = String(row.status || "")
    if (status !== "active") return sum
    if (plan === "business") return sum + 149
    if (plan === "pro") return sum + 49
    return sum
  }, 0)

  const aiRequests = (usageRes.data || []).reduce((sum, row) => sum + Number(row.ai_requests || 0), 0)

  return NextResponse.json({
    users: usersRes.count || 0,
    workspaces: workspacesRes.count || 0,
    leads: leadsRes.count || 0,
    mrr: monthlyRevenue,
    ai_requests: aiRequests,
  })
}
