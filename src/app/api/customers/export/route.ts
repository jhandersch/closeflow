import { NextResponse } from "next/server"
import * as XLSX from "xlsx"
import {
  getRouteUser,
  loadWorkspaceForUser,
} from "@/lib/supabase/route"
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

type LeadExportRow = {
  name: string | null
  company: string | null
  status: string | null
  value: number | null
  last_activity_at?: string | null
  created_at: string | null
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

  /*
   * Load all active leads belonging to the workspace.
   * Soft-deleted leads are excluded.
   *
   * We intentionally use fallbacks because some
   * installations may not have all newer columns.
   */
  const queryAttempts = [
    `
      name,
      company,
      status,
      value,
      last_activity_at,
      updated_at,
      created_at
    `,
    `
      name,
      company,
      status,
      value,
      last_activity_at,
      created_at
    `,
    `
      name,
      company,
      status,
      value,
      created_at
    `,
  ]

  let leadsData: LeadExportRow[] | null = null
  let queryError: { message: string } | null = null

  for (const selectClause of queryAttempts) {
    const result = await supabase
      .from("leads")
      .select(selectClause)
      .eq("workspace_id", workspace.id)
      .is("deleted_at", null)

    if (!result.error) {
      leadsData =
        (result.data || []) as unknown as LeadExportRow[]

      queryError = null
      break
    }

    queryError = {
      message: result.error.message,
    }

    /*
     * Only continue on schema drift.
     */
    if (
      !/column .* does not exist|schema cache/i.test(
        result.error.message || ""
      )
    ) {
      break
    }
  }

  if (queryError) {
    return NextResponse.json(
      { error: queryError.message },
      { status: 500 }
    )
  }

  const leads = leadsData || []

  /*
   * Aggregate leads by company.
   */
  const byCompany =
    new Map<string, CustomerSummary>()

  for (const lead of leads) {
    const key =
      (lead.company || "")
        .trim()
        .toLowerCase()

    if (!key) continue

    const existing =
      byCompany.get(key)

    const lastActivity =
      lead.last_activity_at ||
      lead.created_at ||
      ""

    if (!existing) {
      byCompany.set(key, {
        company: lead.company || "",
        contact: lead.name || "",
        revenue:
          lead.status === "won"
            ? Number(lead.value || 0)
            : 0,
        deals: 1,
        won_deals:
          lead.status === "won"
            ? 1
            : 0,
        lost_deals:
          lead.status === "lost"
            ? 1
            : 0,
        last_contact_at:
          lastActivity,
      })

      continue
    }

    existing.deals += 1

    existing.won_deals +=
      lead.status === "won"
        ? 1
        : 0

    existing.lost_deals +=
      lead.status === "lost"
        ? 1
        : 0

    existing.revenue +=
      lead.status === "won"
        ? Number(lead.value || 0)
        : 0

    if (
      lastActivity &&
      (
        !existing.last_contact_at ||
        new Date(lastActivity).getTime() >
          new Date(
            existing.last_contact_at
          ).getTime()
      )
    ) {
      existing.last_contact_at =
        lastActivity
    }

    /*
     * Keep multiple contacts in one cell.
     */
    if (
      lead.name &&
      !existing.contact.includes(
        lead.name
      )
    ) {
      existing.contact =
        existing.contact
          ? `${existing.contact} | ${lead.name}`
          : lead.name
    }
  }

  /*
   * Export structure.
   */
  const headers = [
    "company",
    "contact",
    "revenue",
    "deals",
    "won_deals",
    "lost_deals",
    "last_contact_at",
  ]

  const rows =
    Array.from(byCompany.values())
      .sort(
        (a, b) =>
          b.revenue - a.revenue
      )
      .map((customer) => [
        customer.company,
        customer.contact,
        customer.revenue,
        customer.deals,
        customer.won_deals,
        customer.lost_deals,
        customer.last_contact_at,
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
      "Customers"
    )

    /*
     * Make columns readable in Excel.
     */
    worksheet["!cols"] = [
      { wch: 30 }, // company
      { wch: 40 }, // contact
      { wch: 16 }, // revenue
      { wch: 12 }, // deals
      { wch: 14 }, // won_deals
      { wch: 14 }, // lost_deals
      { wch: 24 }, // last_contact_at
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
            `attachment; filename=closeflow-customers-${new Date()
              .toISOString()
              .slice(0, 10)}.xlsx`,
        },
      }
    )
  }

  /*
   * CSV
   *
   * Same structure as the working Leads export:
   * - semicolon delimiter
   * - CRLF line endings
   * - proper CSV escaping
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
          `attachment; filename=closeflow-customers-${new Date()
            .toISOString()
            .slice(0, 10)}.csv`,
      },
    }
  )
}
