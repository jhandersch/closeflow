import { NextResponse } from "next/server";
import { denyReadOnlyWrite, getRouteUser, loadWorkspaceForUser, } from "@/lib/supabase/route";
import { withWorkspaceImportLock } from "@/lib/import-lock";
import { detectCsvDelimiter, parseCsvDocument } from "@/lib/csv";
type ImportIssue = {
    row: number;
    reason: string;
    company: string | null;
    contact: string;
};
type ImportRpcResult = {
    row_number: number;
    lead_id: string | null;
    error_message: string | null;
};
const MAX_ISSUES_RETURNED = 500;
export async function POST(request: Request) {
    const denied = await denyReadOnlyWrite(request);
    if (denied) return denied;
    return withWorkspaceImportLock(request, importCustomers);
}
async function importCustomers(request: Request) {
    const { supabase, user, error, } = await getRouteUser(request);
    if (error || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { workspace } = await loadWorkspaceForUser(supabase, user.id);
    if (!workspace?.id) {
        return NextResponse.json({ error: "Workspace required" }, { status: 403 });
    }
    let body: unknown;
    try {
        body = await request.json();
    }
    catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const csvText = typeof body === "object" &&
        body !== null &&
        "csv" in body &&
        typeof body.csv === "string"
        ? body.csv
        : "";
    if (!csvText.trim()) {
        return NextResponse.json({ error: "csv is required" }, { status: 400 });
    }
    /*
     * Remove UTF-8 BOM if present.
     */
    const normalizedCsv = csvText.replace(/^\uFEFF/, "");
    const firstLineEnd = normalizedCsv.search(/[\r\n]/);
    const headerLine = firstLineEnd < 0 ? normalizedCsv : normalizedCsv.slice(0, firstLineEnd);
    const delimiter = detectCsvDelimiter(headerLine);
    let rows: string[][];
    try {
        rows = parseCsvDocument(normalizedCsv, delimiter);
    }
    catch {
        return NextResponse.json({ error: "Invalid CSV: unterminated quoted field" }, { status: 400 });
    }
    if (rows.length < 2) {
        return NextResponse.json({
            inserted: 0,
            skipped: 0,
            message: "No rows found",
            issues: [],
        });
    }
    /*
     * Support both:
     *
     * contact;company;revenue
     *
     * and:
     *
     * contact,company,revenue
     */
    const headers = rows[0].map((header) => header.toLowerCase());
    const headerIndex = (name: string) => headers.indexOf(name);
    /*
     * Customer records are canonical, while
     * completed leads provide the deal history
     * used by the Customers workspace.
     */
    const { data: existingCustomers, error: existingCustomersError } = await supabase
        .from("customers")
        .select("contact, company")
        .eq("workspace_id", workspace.id);
    if (existingCustomersError) {
        return NextResponse.json({ error: existingCustomersError.message }, { status: 500 });
    }
    const { data: existingLeads, error: existingLeadsError, } = await supabase
        .from("leads")
        .select("name, company")
        .eq("workspace_id", workspace.id)
        .is("deleted_at", null);
    if (existingLeadsError) {
        return NextResponse.json({
            error: existingLeadsError.message,
        }, {
            status: 500,
        });
    }
    const knownKeys = new Set([
        ...(existingCustomers || []).map((customer) => `${(customer.contact || "")
            .trim()
            .toLowerCase()}::${(customer.company || "")
            .trim()
            .toLowerCase()}`),
        ...(existingLeads || []).map((lead) => `${(lead.name || "")
        .trim()
        .toLowerCase()}::${(lead.company || "")
        .trim()
        .toLowerCase()}`),
    ]);
    let inserted = 0;
    let skipped = 0;
    const issues: ImportIssue[] = [];
    const addIssue = (issue: ImportIssue) => {
        if (issues.length < MAX_ISSUES_RETURNED) {
            issues.push(issue);
        }
    };
    const candidates: Array<{
        rowNumber: number;
        contact: string;
        company: string;
        revenue: number;
    }> = [];
    for (const [rowIndex, values] of rows.slice(1).entries()) {
        const rowNumber = rowIndex + 2;
        const get = (column: string) => {
            const index = headerIndex(column);
            return index >= 0
                ? values[index] || ""
                : "";
        };
        const company = get("company");
        const contact = get("contact");
        const revenueText = get("revenue");
        const revenue = Number(revenueText || "0");
        if (!contact.trim()) {
            skipped += 1;
            addIssue({
                row: rowNumber,
                reason: "Missing required field: contact",
                company: company.trim(),
                contact: contact.trim(),
            });
            continue;
        }
        if (!Number.isFinite(revenue)) {
            skipped += 1;
            addIssue({
                row: rowNumber,
                reason: "Invalid numeric value: revenue",
                company: company.trim(),
                contact: contact.trim(),
            });
            continue;
        }
        const key = `${contact
            .trim()
            .toLowerCase()}::${company
            .trim()
            .toLowerCase()}`;
        if (knownKeys.has(key)) {
            skipped += 1;
            addIssue({
                row: rowNumber,
                reason: "Duplicate customer (contact + company already exists)",
                company: company.trim(),
                contact: contact.trim(),
            });
            continue;
        }
        candidates.push({
            rowNumber,
            contact: contact.trim(),
            company: company.trim(),
            revenue,
        });
    }

    const IMPORT_BATCH_SIZE = 100;
    for (let offset = 0; offset < candidates.length; offset += IMPORT_BATCH_SIZE) {
        const batch = candidates.slice(offset, offset + IMPORT_BATCH_SIZE);
        const { data, error: importError } = await supabase.rpc("import_customer_with_activity", {
            p_workspace_id: workspace.id,
            p_user_id: user.id,
            p_rows: batch,
        });
        const rpcResults: ImportRpcResult[] = Array.isArray(data) ? data : [];
        const results = new Map(rpcResults.map((result) => [result.row_number, result]));
        for (const candidate of batch) {
            const result = results.get(candidate.rowNumber);
            if (!importError && result?.lead_id && !result.error_message) {
                inserted += 1;
                knownKeys.add(`${candidate.contact.toLowerCase()}::${candidate.company.toLowerCase()}`);
                continue;
            }
            skipped += 1;
            addIssue({
                row: candidate.rowNumber,
                reason: result?.error_message || importError?.message || "Import returned no result for row.",
                company: candidate.company,
                contact: candidate.contact,
            });
        }
    }
    return NextResponse.json({
        inserted,
        skipped,
        issues,
    });
}
