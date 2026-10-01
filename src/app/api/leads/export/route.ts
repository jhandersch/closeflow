import { NextResponse } from "next/server";
import { getRouteUser, loadWorkspaceForUser } from "@/lib/supabase/route";
import * as XLSX from "xlsx";
import { enforceAndTrackUsageLimit } from "@/lib/usageLimits";
import { formatExportDateTime, getExcelDateCell, getExportDateKey, resolveExportTimezone } from "@/lib/exportDates";

type ExportLead = {
  name: string | null;
  company: string | null;
  status: string | null;
  value: number | null;
  probability: number | null;
  next_action: string | null;
  created_at: string | null;
  stage_changed_at: string | null;
  source: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  tags: unknown;
  notes: string | null;
};

const escapeCsv = (value: unknown) => {
  const text = String(value ?? "");

  if (
    text.includes(";") ||
    text.includes(",") ||
    text.includes("\n") ||
    text.includes("\r") ||
    text.includes('"')
  ) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
};

export async function GET(request: Request) {
  const { supabase, user, error } =
    await getRouteUser(request);

  const url = new URL(request.url);
  const format = (
    url.searchParams.get("format") || "csv"
  ).toLowerCase();

  if (error || !user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { workspace } = await loadWorkspaceForUser(
    supabase,
    user.id
  );

  if (!workspace?.id) {
    return NextResponse.json(
      { error: "Workspace required" },
      { status: 403 }
    );
  }

  const limitCheck =
    await enforceAndTrackUsageLimit(
      supabase,
      user.id,
      "export"
    );

  if (!limitCheck.ok) {
    return NextResponse.json(
      { error: limitCheck.message },
      { status: limitCheck.status }
    );
  }

  const timeZone = resolveExportTimezone(user.user_metadata?.timezone);
  const exportDate = getExportDateKey(new Date(), timeZone);

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
  `;

  let { data, error: queryError } =
    await supabase
      .from("leads")
      .select(selectColumns)
      .eq("workspace_id", workspace.id)
      .is("deleted_at", null)
      .in("status", [
        "new",
        "contacted",
        "proposal",
      ])
      .order("created_at", {
        ascending: false,
      });

  /*
   * Fallback for databases where some newer
   * lead columns do not exist yet.
   */
  if (
    queryError &&
    /column .* does not exist|schema cache/i.test(
      queryError.message || ""
    )
  ) {
    const fallback = await supabase
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
        notes,
        created_at
      `)
      .eq("workspace_id", workspace.id)
      .is("deleted_at", null)
      .in("status", [
        "new",
        "contacted",
        "proposal",
      ])
      .order("created_at", {
        ascending: false,
      });

    if (fallback.error) {
      return NextResponse.json(
        { error: fallback.error.message },
        { status: 500 }
      );
    }

    data = fallback.data as ExportLead[];
    queryError = null;
  }

  if (queryError) {
    return NextResponse.json(
      { error: queryError.message },
      { status: 500 }
    );
  }

  const leads = (data || []) as ExportLead[];

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
  ];

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
  ]);

  if (format === "xlsx") {
    const worksheetRows = [
      headers,
      ...rows,
    ];

    const worksheet =
      XLSX.utils.aoa_to_sheet(
        worksheetRows
      );

    for (let rowIndex = 0; rowIndex < leads.length; rowIndex += 1) {
      for (const columnIndex of [6, 7]) {
        const cell = XLSX.utils.encode_cell({ r: rowIndex + 1, c: columnIndex });
        const excelDate = getExcelDateCell(rows[rowIndex][columnIndex], timeZone);
        if (excelDate && worksheet[cell]) {
          worksheet[cell] = {
            ...worksheet[cell],
            t: "n",
            v: excelDate.value,
            z: excelDate.numberFormat,
          };
        }
      }
    }

    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Leads"
    );

    worksheet["!cols"] = [
      { wch: 22 },
      { wch: 24 },
      { wch: 16 },
      { wch: 14 },
      { wch: 14 },
      { wch: 32 },
      { wch: 24 },
      { wch: 24 },
      { wch: 18 },
      { wch: 30 },
      { wch: 20 },
      { wch: 32 },
      { wch: 35 },
      { wch: 30 },
      { wch: 50 },
    ];

    const output = XLSX.write(
      workbook,
      {
        bookType: "xlsx",
        type: "array",
      }
    );

    return new NextResponse(
      output as ArrayBuffer,
      {
        status: 200,
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition":
            `attachment; filename=closeflow-leads-${exportDate}.xlsx`,
        },
      }
    );
  }

  const csvRows = rows.map((row) =>
    row.map((value, index) =>
      index === 6 || index === 7
        ? formatExportDateTime(value, timeZone)
        : value,
    ),
  );
  const csv = [
    headers.join(";"),
    ...csvRows.map((row) => row.map(escapeCsv).join(";")),
  ].join("\r\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type":
        "text/csv; charset=utf-8",
      "Content-Disposition":
        `attachment; filename=closeflow-leads-${exportDate}.csv`,
    },
  });
}