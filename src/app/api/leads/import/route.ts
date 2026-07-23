import { NextResponse } from "next/server"
import { getRouteUser, loadWorkspaceForUser } from "@/lib/supabase/route"

type ImportIssue = {
  row: number
  reason: string
  name: string
  company: string
}

const MAX_ISSUES_RETURNED = 500

const parseCsvLine = (line: string) => {
  const values: string[] = []
  let current = ""
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    const next = line[index + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === "," && !inQuotes) {
      values.push(current)
      current = ""
      continue
    }

    current += char
  }

  values.push(current)
  return values.map((value) => value.trim())
}

export async function POST(request: Request) {
  const { supabase, user, error } = await getRouteUser(request)

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { workspace } = await loadWorkspaceForUser(supabase, user.id)
  if (!workspace?.id) {
    return NextResponse.json({ error: "Workspace required" }, { status: 403 })
  }

  const body = await request.json()
  const csvText = typeof body.csv === "string" ? body.csv : ""

  if (!csvText.trim()) {
    return NextResponse.json({ error: "csv is required" }, { status: 400 })
  }

  const lines = csvText
    .split(/\r?\n/)
    .map((line: string) => line.trim())
    .filter(Boolean)

  if (lines.length < 2) {
    return NextResponse.json({ inserted: 0, skipped: 0, message: "No rows found" })
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase())
  const headerIndex = (name: string) => headers.indexOf(name)

  const { data: existingLeads } = await supabase
    .from("leads")
    .select("name, company")
    .eq("workspace_id", workspace.id)

  const knownKeys = new Set(
    (existingLeads || []).map((lead) => `${(lead.name || "").trim().toLowerCase()}::${(lead.company || "").trim().toLowerCase()}`)
  )

  let inserted = 0
  let skipped = 0
  const issues: ImportIssue[] = []

  const addIssue = (issue: ImportIssue) => {
    if (issues.length < MAX_ISSUES_RETURNED) {
      issues.push(issue)
    }
  }

  for (const [lineIndex, line] of lines.slice(1).entries()) {
    const rowNumber = lineIndex + 2
    const values = parseCsvLine(line)
    const get = (column: string) => {
      const index = headerIndex(column)
      return index >= 0 ? values[index] || "" : ""
    }

    const name = get("name")
    const company = get("company")
    const status = get("status") || "new"
    const value = Number(get("value") || "0")

    if (!name.trim() || !company.trim()) {
      skipped += 1
      addIssue({
        row: rowNumber,
        reason: "Missing required field: name or company",
        name: name.trim(),
        company: company.trim(),
      })
      continue
    }

    if (!Number.isFinite(value)) {
      skipped += 1
      addIssue({
        row: rowNumber,
        reason: "Invalid numeric value",
        name: name.trim(),
        company: company.trim(),
      })
      continue
    }

    const key = `${name.trim().toLowerCase()}::${company.trim().toLowerCase()}`
    if (knownKeys.has(key)) {
      skipped += 1
      addIssue({
        row: rowNumber,
        reason: "Duplicate lead (name + company already exists)",
        name: name.trim(),
        company: company.trim(),
      })
      continue
    }

    const { data: membership, error: membershipError } =
      await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id)
        .single()

    if (membershipError || !membership) {
      throw new Error("No workspace found")
    }

    const workspaceId = membership.workspace_id

    const payload = {
      workspace_id: workspace.id,
      user_id: user.id,
      created_by: user.id,
      name: name.trim(),
      company: company.trim(),
      status,
      value: Number.isFinite(value) ? value : 0,
      notes: get("notes"),
      source: get("source") || null,
      email: get("email") || null,
      phone: get("phone") || null,
      website: get("website") || null,
      address: get("address") || null,
      tags: get("tags")
        .split("|")
        .map((tag) => tag.trim())
        .filter(Boolean),
      stage_changed_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
    }

    let insertResult = await supabase.from("leads").insert([payload]).select("id").single()

    if (insertResult.error && /column .* does not exist/i.test(insertResult.error.message || "")) {
      const fallbackPayload = {
        workspace_id: workspace.id,
        user_id: user.id,
        name: name.trim(),
        company: company.trim(),
        status,
        value: Number.isFinite(value) ? value : 0,
        notes: get("notes"),
        stage_changed_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString(),
      }
      insertResult = await supabase.from("leads").insert([fallbackPayload]).select("id").single()
    }

    if (insertResult.error || !insertResult.data?.id) {
      skipped += 1
      addIssue({
        row: rowNumber,
        reason: insertResult.error?.message || "Insert failed",
        name: name.trim(),
        company: company.trim(),
      })
      continue
    }

    knownKeys.add(key)
    inserted += 1

    await supabase.from("activities").insert([
      {
        workspace_id: workspace.id,
        lead_id: insertResult.data.id,
        user_id: user.id,
        title: "Lead imported from CSV",
        description: "Lead imported from CSV",
        action: "Lead imported from CSV",
        type: "created",
        metadata: { source: "csv_import" },
      },
    ])
  }

  return NextResponse.json({ inserted, skipped, issues })
}
