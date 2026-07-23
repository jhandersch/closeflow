import { NextResponse } from "next/server"
import { getRouteUser, loadWorkspaceForUser } from "@/lib/supabase/route"
import * as XLSX from "xlsx"
import { enforceAndTrackUsageLimit } from "@/lib/usageLimits"

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

  let { data: leads, error: queryError } = await supabase
    .from("leads")
    .select("name, company, status, value, source, email, phone, website, address, tags, notes")
    .eq("workspace_id", workspace.id)
    .order("created_at", { ascending: false })

  if (queryError && /column .* does not exist/i.test(queryError.message || "")) {
    const fallback = await supabase
      .from("leads")
      .select("name, company, status, value, notes")
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: false })

    leads = fallback.data as typeof leads
    queryError = fallback.error
  }

  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 500 })
  }

  const headers = ["name", "company", "status", "value", "source", "email", "phone", "website", "address", "tags", "notes"]

  const rows = (leads || []).map((lead) => [
    lead.name,
    lead.company,
    lead.status,
    lead.value,
    lead.source || "",
    lead.email || "",
    lead.phone || "",
    lead.website || "",
    lead.address || "",
    Array.isArray(lead.tags) ? lead.tags.join("|") : "",
    lead.notes || "",
  ])

  if (format === "xlsx") {
    const worksheetRows = [headers, ...rows]
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetRows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Leads")
    const output = XLSX.write(workbook, { bookType: "xlsx", type: "array" })

    return new NextResponse(output as ArrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename=closeflow-leads-${new Date().toISOString().slice(0, 10)}.xlsx`,
      },
    })
  }

  const csv = [headers.join(","), ...rows.map((row) => row.map(escapeCsv).join(","))].join("\n")

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=closeflow-leads-${new Date().toISOString().slice(0, 10)}.csv`,
    },
  })
}
