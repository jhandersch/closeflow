import { NextResponse } from "next/server"
import { getRouteUser, loadWorkspaceForUser } from "@/lib/supabase/route"
import * as XLSX from "xlsx"
import { enforceAndTrackUsageLimit } from "@/lib/usageLimits"

type ExportLead = {
  name: string | null
  company: string | null
  status: string | null
  value: number | null
  probability: number | null
  next_action: string | null
  created_at: string | null
  stage_changed_at: string | null
  source: string | null
  email: string | null
  phone: string | null
  website: string | null
  address: string | null
  tags: unknown
  notes: string | null
}

const escapeCsv = (value: unknown) => {
  const text = String(value ?? "")

  if (
    text.includes(";") ||
    text.includes(",") ||
    text.includes("\n") ||
    text.includes("\r") ||
    text.includes('"')
  ) {
    return `"${text.replaceAll('"', '""')}"`
  }

  return text
}

export async function GET(request: Request) {
  const { supabase, user, error } =
    await getRouteUser(request)

  const url = new URL(request.url)

  const format =
    (url.searchParams.get("format") || "csv").toLowerCase()

  if (error || !user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }

  const { workspace } =
    await loadWorkspaceForUser(
      supabase,
      user.id
    )

  if (!workspace?.id) {
    return NextResponse.json(
      { error: "Workspace required" },
      { status: 403 }
    )
  }

  const limitCheck =
    await enforceAndTrackUsageLimit(
      supabase,
      user.id,
      "export"
    )

  if (!limitCheck.ok) {
    return NextResponse.json(
      { error: limitCheck.message },
      { status: limitCheck.status }
    )
  }

  const selectColumns = `
    name,
    company,
    status,
    value,
    probability,
    next_action,
    created_at,
    stage_changed_at,
    source,
    email,
    phone,
    website,
    address,
    tags,
    notes
  `

  let { data, error: queryError } =
    await supabase
      .from("leads")
      .select(selectColumns)
      .eq("workspace_id", workspace.id)
      .is("deleted_at", null)
      .order("created_at", {
        ascending: false,
      })

  /*
   * Fallback for databases where some of the
   * newer lead columns do not exist yet.
   */
  if (
    queryError &&
    /column .* does not exist|schema cache/i.test(
      queryError.message || ""
    )
  ) {
    const fallback =
  await supabase
    .from("leads")
    .select(`
      name,
      company,
      status,
      value,
      source,
      email,
      phone,
      website,
      address,
      tags,
      notes
    `)
    .eq("workspace_id", workspace.id)
    .is("deleted_at", null)
    .order("created_at", {
      ascending: false,
    })

    if (fallback.error) {
      return NextResponse.json(
        { error: fallback.error.message },
        { status: 500 }
      )
    }

    data = fallback.data as ExportLead[]
  }

  if (queryError) {
    return NextResponse.json(
      { error: queryError.message },
      { status: 500 }
    )
  }

  const leads =
    (data || []) as ExportLead[]

  /*
   * Every value below has exactly one
   * corresponding CSV/XLSX column.
   */
  const headers = [
    "name",
    "company",
    "status",
    "value",
    "probability",
    "next_action",
    "created_at",
    "stage_changed_at",
    "source",
    "email",
    "phone",
    "website",
    "address",
    "tags",
    "notes",
  ]

  const rows = leads.map((lead) => [
    lead.name ?? "",
    lead.company ?? "",
    lead.status ?? "",
    lead.value ?? "",
    lead.probability ?? "",
    lead.next_action ?? "",
    lead.created_at ?? "",
    lead.stage_changed_at ?? "",
    lead.source ?? "",
    lead.email ?? "",
    lead.phone ?? "",
    lead.website ?? "",
    lead.address ?? "",
    Array.isArray(lead.tags)
      ? lead.tags.join("|")
      : lead.tags ?? "",
    lead.notes ?? "",
  ])

  /*
   * XLSX
   */
  if (format === "xlsx") {
    const worksheetRows = [
      headers,
      ...rows,
    ]

    const worksheet =
      XLSX.utils.aoa_to_sheet(
        worksheetRows
      )

    const workbook =
      XLSX.utils.book_new()

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Leads"
    )

    /*
     * Make columns readable in Excel.
     */
    worksheet["!cols"] = [
      { wch: 22 }, // name
      { wch: 24 }, // company
      { wch: 16 }, // status
      { wch: 14 }, // value
      { wch: 14 }, // probability
      { wch: 32 }, // next_action
      { wch: 24 }, // created_at
      { wch: 24 }, // stage_changed_at
      { wch: 18 }, // source
      { wch: 30 }, // email
      { wch: 20 }, // phone
      { wch: 32 }, // website
      { wch: 35 }, // address
      { wch: 30 }, // tags
      { wch: 50 }, // notes
    ]

    const output =
      XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      })

    return new NextResponse(
      output as ArrayBuffer,
      {
        status: 200,
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

          "Content-Disposition":
            `attachment; filename=closeflow-leads-${new Date()
              .toISOString()
              .slice(0, 10)}.xlsx`,
        },
      }
    )
  }

  /*
   * CSV
   */
  const csv = [
    headers.join(";"),
    ...rows.map((row) =>
      row
        .map(escapeCsv)
        .join(";")
    ),
  ].join("\r\n")

  return new NextResponse(
    csv,
    {
      status: 200,
      headers: {
        "Content-Type":
          "text/csv; charset=utf-8",

        "Content-Disposition":
          `attachment; filename=closeflow-leads-${new Date()
            .toISOString()
            .slice(0, 10)}.csv`,
      },
    }
  )
}