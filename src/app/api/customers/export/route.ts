import { NextResponse } from "next/server"
import * as XLSX from "xlsx"
import { getRouteUser, loadWorkspaceForUser } from "@/lib/supabase/route"
import { enforceAndTrackUsageLimit } from "@/lib/usageLimits"

type CustomerSummary = {
  company: string
  contact: string
  revenue: number
  deals: number
  won_deals: number
  lost_deals: number
  last_contact_at: string
}

const escapeCsv = (value: unknown) => {
  const text = String(value ?? "")
  if (text.includes(",") || text.includes("\n") || text.includes('"')) {
    return `"${text.replaceAll('"', '""')}"`
  }
  return text
}

export async function GET(request: Request) {
  const { supabase, user, error } = await getRouteUser(request)
  const url = new URL(request.url)
  const format = (url.searchParams.get("format") || "csv").toLowerCase()

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { workspace } = await loadWorkspaceForUser(supabase, user.id)
  if (!workspace?.id) {
    return NextResponse.json({ error: "Workspace required" }, { status: 403 })
  }

  const limitCheck = await enforceAndTrackUsageLimit(supabase, user.id, "export")
  if (!limitCheck.ok) {
    return NextResponse.json({ error: limitCheck.message }, { status: limitCheck.status })
  }

  const primaryQuery = await supabase
    .from("leads")
    .select("name, company, status, value, last_activity_at, updated_at, created_at")
    .eq("workspace_id", workspace.id)

  const fallbackQuery =
    primaryQuery.error && /column .* does not exist/i.test(primaryQuery.error.message || "")
      ? await supabase
          .from("leads")
          .select("name, company, status, value, last_activity_at, created_at")
          .eq("workspace_id", workspace.id)
      : null

  const leads = (fallbackQuery?.data || primaryQuery.data) as Array<{
    name: string | null
    company: string | null
    status: string | null
    value: number | null
    last_activity_at: string | null
    created_at: string | null
  }> | null

  const queryError = fallbackQuery?.error || primaryQuery.error

  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 500 })
  }

  const byCompany = new Map<string, CustomerSummary>()

  for (const lead of leads || []) {
    const key = (lead.company || "").trim().toLowerCase()
    if (!key) continue

    const existing = byCompany.get(key)
    const lastActivity = lead.last_activity_at || lead.created_at || ""

    if (!existing) {
      byCompany.set(key, {
        company: lead.company || "",
        contact: lead.name || "",
        revenue: lead.status === "won" ? Number(lead.value || 0) : 0,
        deals: 1,
        won_deals: lead.status === "won" ? 1 : 0,
        lost_deals: lead.status === "lost" ? 1 : 0,
        last_contact_at: lastActivity,
      })
      continue
    }

    existing.deals += 1
    existing.won_deals += lead.status === "won" ? 1 : 0
    existing.lost_deals += lead.status === "lost" ? 1 : 0
    existing.revenue += lead.status === "won" ? Number(lead.value || 0) : 0

    if (lastActivity && (!existing.last_contact_at || new Date(lastActivity) > new Date(existing.last_contact_at))) {
      existing.last_contact_at = lastActivity
    }

    if (lead.name && !existing.contact.includes(lead.name)) {
      existing.contact = existing.contact ? `${existing.contact} | ${lead.name}` : lead.name
    }
  }

  const headers = ["company", "contact", "revenue", "deals", "won_deals", "lost_deals", "last_contact_at"]
  const rows = Array.from(byCompany.values())
    .sort((a, b) => b.revenue - a.revenue)
    .map((customer) => [
      customer.company,
      customer.contact,
      customer.revenue,
      customer.deals,
      customer.won_deals,
      customer.lost_deals,
      customer.last_contact_at,
    ])

  if (format === "xlsx") {
    const worksheetRows = [headers, ...rows]
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetRows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Customers")
    const output = XLSX.write(workbook, { bookType: "xlsx", type: "array" })

    return new NextResponse(output as ArrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename=closeflow-customers-${new Date().toISOString().slice(0, 10)}.xlsx`,
      },
    })
  }

  const csv = [headers.join(","), ...rows.map((row) => row.map(escapeCsv).join(","))].join("\n")

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=closeflow-customers-${new Date().toISOString().slice(0, 10)}.csv`,
    },
  })
}
