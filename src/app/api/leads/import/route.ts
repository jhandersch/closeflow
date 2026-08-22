import { NextResponse } from "next/server"
import { getRouteUser, loadWorkspaceForUser } from "@/lib/supabase/route"

type ImportIssue = {
  row: number
  reason: string
  field?: string
  value?: string
  name: string
  company: string
  status?: string
  dealValue?: string
  email?: string
  phone?: string
  website?: string
  address?: string
  source?: string
  tags?: string
  notes?: string
}

const MAX_ISSUES_RETURNED = 500

/**
 * Parses a complete CSV document.
 *
 * Unlike line.split("\n"), this also supports quoted fields
 * containing commas and line breaks.
 */
const parseCsv = (csv: string): string[][] => {
  const rows: string[][] = []
  let row: string[] = []
  let current = ""
  let inQuotes = false

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index]
    const next = csv[index + 1]

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
      row.push(current.trim())
      current = ""
      continue
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1
      }

      row.push(current.trim())
      current = ""

      if (row.some((value) => value !== "")) {
        rows.push(row)
      }

      row = []
      continue
    }

    current += char
  }

  if (current !== "" || row.length > 0) {
    row.push(current.trim())

    if (row.some((value) => value !== "")) {
      rows.push(row)
    }
  }

  return rows
}

const normalize = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toLowerCase()

const parseNumber = (value: string) => {
  const normalized = value
    .trim()
    .replace(/\s/g, "")
    .replace(",", ".")

  if (!normalized) {
    return 0
  }

  const number = Number(normalized)

  return Number.isFinite(number) ? number : null
}

export async function POST(request: Request) {
  const { supabase, user, error } = await getRouteUser(request)

  if (error || !user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }

  const { workspace } = await loadWorkspaceForUser(
    supabase,
    user.id
  )

  if (!workspace?.id) {
    return NextResponse.json(
      { error: "Workspace required" },
      { status: 403 }
    )
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    )
  }

  const csvText =
    typeof body === "object" &&
    body !== null &&
    "csv" in body &&
    typeof body.csv === "string"
      ? body.csv
      : ""

  if (!csvText.trim()) {
    return NextResponse.json(
      { error: "csv is required" },
      { status: 400 }
    )
  }

  const rows = parseCsv(
    csvText.replace(/^\uFEFF/, "")
  )

  if (rows.length < 2) {
    return NextResponse.json({
      inserted: 0,
      updated: 0,
      skipped: 0,
      issues: [],
      message: "No rows found",
    })
  }

  const headers = rows[0].map((header) =>
    normalize(header)
  )

  const headerIndex = (name: string) =>
    headers.indexOf(normalize(name))

  const getValue = (
    values: string[],
    column: string
  ) => {
    const index = headerIndex(column)

    if (index < 0) {
      return ""
    }

    return values[index]?.trim() || ""
  }

  /**
   * Load existing leads from this workspace only.
   *
   * This is important for duplicate detection and workspace
   * isolation.
   */
  const { data: existingLeads, error: existingError } =
    await supabase
      .from("leads")
      .select("id, name, company")
      .eq("workspace_id", workspace.id)

  if (existingError) {
    return NextResponse.json(
      { error: existingError.message },
      { status: 500 }
    )
  }

  const existingByKey = new Map<
    string,
    { id: string; name: string; company: string }
  >()

  for (const lead of existingLeads || []) {
    const key = `${normalize(lead.name)}::${normalize(
      lead.company
    )}`

    if (key !== "::") {
      existingByKey.set(key, lead)
    }
  }

  let inserted = 0
  let updated = 0
  let skipped = 0

  const issues: ImportIssue[] = []

  const addIssue = (issue: ImportIssue) => {
    if (issues.length < MAX_ISSUES_RETURNED) {
      issues.push(issue)
    }
  }

  for (
    let index = 1;
    index < rows.length;
    index += 1
  ) {
    const values = rows[index]
    const rowNumber = index + 1

    const name = getValue(values, "name")
    const company = getValue(values, "company")

    const status =
      getValue(values, "status") || "new"

    const valueText = getValue(values, "value")
    const parsedValue = parseNumber(valueText)

    if (!name || !company) {
      skipped += 1

      addIssue({
        row: rowNumber,
        reason: !name && !company
          ? "Missing required fields: name and company"
          : !name
            ? "Missing required field: name"
            : "Missing required field: company",
        name,
        company,
        status,
        value: valueText,
        email: getValue(values, "email"),
        phone: getValue(values, "phone"),
        website: getValue(values, "website"),
        address: getValue(values, "address"),
        source: getValue(values, "source"),
        tags: getValue(values, "tags"),
        notes: getValue(values, "notes"),
      })

      continue
    }

    if (parsedValue === null) {
      skipped += 1

      addIssue({
        row: rowNumber,
        reason: `Invalid numeric value: "${valueText}"`,
        name,
        company,
        status,
        value: valueText,
        email: getValue(values, "email"),
        phone: getValue(values, "phone"),
        website: getValue(values, "website"),
        address: getValue(values, "address"),
        source: getValue(values, "source"),
        tags: getValue(values, "tags"),
        notes: getValue(values, "notes"),
      })

      continue
    }

    const key = `${normalize(name)}::${normalize(
      company
    )}`

    const existingLead = existingByKey.get(key)

    const tags = getValue(values, "tags")
      .split("|")
      .map((tag) => tag.trim())
      .filter(Boolean)

    const basePayload = {
      name,
      company,
      status,
      value: parsedValue,
      notes: getValue(values, "notes"),
      source: getValue(values, "source") || null,
      email: getValue(values, "email") || null,
      phone: getValue(values, "phone") || null,
      website: getValue(values, "website") || null,
      address: getValue(values, "address") || null,
      tags,
      stage_changed_at:
        getValue(values, "stage_changed_at") ||
        new Date().toISOString(),
      last_activity_at:
        new Date().toISOString(),
    }

    /**
     * Existing lead:
     * update instead of treating it as an error.
     */
    if (existingLead) {
      let updateResult = await supabase
        .from("leads")
        .update(basePayload)
        .eq("id", existingLead.id)
        .eq("workspace_id", workspace.id)
        .select("id")
        .single()

      /**
       * Compatibility fallback for older database schemas.
       */
      if (
        updateResult.error &&
        /column .* does not exist/i.test(
          updateResult.error.message || ""
        )
      ) {
        const fallbackPayload = {
          name,
          company,
          status,
          value: parsedValue,
          notes: getValue(values, "notes"),
          stage_changed_at:
            new Date().toISOString(),
          last_activity_at:
            new Date().toISOString(),
        }

        updateResult = await supabase
          .from("leads")
          .update(fallbackPayload)
          .eq("id", existingLead.id)
          .eq("workspace_id", workspace.id)
          .select("id")
          .single()
      }

      if (
        updateResult.error ||
        !updateResult.data?.id
      ) {
        skipped += 1

        addIssue({
          row: rowNumber,
          reason:
            updateResult.error?.message ||
            "Update failed",
          name,
          company,
        })

        continue
      }

      updated += 1

      await supabase.from("activities").insert([
        {
          workspace_id: workspace.id,
          lead_id: existingLead.id,
          user_id: user.id,
          title: "Lead updated from CSV",
          description: "Lead updated from CSV import",
          action: "Lead updated from CSV",
          type: "updated",
          metadata: {
            source: "csv_import",
          },
        },
      ])

      continue
    }

    /**
     * New lead -> insert.
     */
    const insertPayload = {
      workspace_id: workspace.id,
      user_id: user.id,
      created_by: user.id,
      ...basePayload,
    }

    let insertResult = await supabase
      .from("leads")
      .insert([insertPayload])
      .select("id")
      .single()

    /**
     * Compatibility fallback for older database schemas.
     */
    if (
      insertResult.error &&
      /column .* does not exist/i.test(
        insertResult.error.message || ""
      )
    ) {
      const fallbackPayload = {
        workspace_id: workspace.id,
        user_id: user.id,
        name,
        company,
        status,
        value: parsedValue,
        notes: getValue(values, "notes"),
        stage_changed_at:
          new Date().toISOString(),
        last_activity_at:
          new Date().toISOString(),
      }

      insertResult = await supabase
        .from("leads")
        .insert([fallbackPayload])
        .select("id")
        .single()
    }

    if (
      insertResult.error ||
      !insertResult.data?.id
    ) {
      skipped += 1

      addIssue({
        row: rowNumber,
        reason:
          insertResult.error?.message ||
          "Insert failed",
        name,
        company,
      })

      continue
    }

    const leadId = insertResult.data.id

    inserted += 1

    /**
     * Add the newly inserted lead to the duplicate map
     * so duplicates inside the same CSV are also detected.
     */
    existingByKey.set(key, {
      id: leadId,
      name,
      company,
    })

    await supabase.from("activities").insert([
      {
        workspace_id: workspace.id,
        lead_id: leadId,
        user_id: user.id,
        title: "Lead imported from CSV",
        description: "Lead imported from CSV",
        action: "Lead imported from CSV",
        type: "created",
        metadata: {
          source: "csv_import",
        },
      },
    ])
  }

  return NextResponse.json({
    inserted,
    updated,
    skipped,
    issues,
  })
}