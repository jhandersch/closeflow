import { NextResponse } from "next/server";
import { getRouteUser, loadWorkspaceForUser, } from "@/lib/supabase/route";
import { withWorkspaceImportLock } from "@/lib/import-lock";
import { detectCsvDelimiter, parseCsvDocument } from "@/lib/csv";
type ImportIssue = {
    row: number;
    reason: string;
    company: string | null;
    contact: string;
};
const MAX_ISSUES_RETURNED = 500;
export async function POST(request: Request) {
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
        if (issues.length <
            MAX_ISSUES_RETURNED) {
            issues.push(issue);
        }
    };
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
        const now = new Date().toISOString();
        const payload = {
            workspace_id: workspace.id,
            user_id: user.id,
            name: contact.trim(),
            company: company.trim(),
            status: "won",
            value: revenue,
            source: "other",
            notes: "Imported from customers file",
            stage_changed_at: now,
            last_activity_at: now,
        };
        const { data: insertedLead, error: insertError, } = await supabase
            .from("leads")
            .insert([payload])
            .select("id")
            .single();
        if (insertError ||
            !insertedLead?.id) {
            skipped += 1;
            addIssue({
                row: rowNumber,
                reason: insertError?.message ||
                    "Insert failed",
                company: company.trim(),
                contact: contact.trim(),
            });
            continue;
        }
        const { error: customerInsertError } = await supabase
            .from("customers")
            .insert({
                workspace_id: workspace.id,
                lead_id: insertedLead.id,
                contact: contact.trim(),
                company: company.trim(),
                revenue,
                status: "active",
                notes: "Imported from customers file",
            });
        if (customerInsertError) {
            await supabase.from("leads").delete().eq("id", insertedLead.id).eq("workspace_id", workspace.id);
            skipped += 1;
            addIssue({
                row: rowNumber,
                reason: `Customer could not be saved: ${customerInsertError.message}`,
                company: company.trim(),
                contact: contact.trim(),
            });
            continue;
        }
        knownKeys.add(key);
        inserted += 1;
        const { error: activityError } = await supabase
            .from("activities")
            .insert([
            {
                workspace_id: workspace.id,
                lead_id: insertedLead.id,
                user_id: user.id,
                title: "Customer imported from file",
                description: "Customer imported from file",
                action: "Customer imported from file",
                type: "created",
                metadata: {
                    source: "customers_import",
                },
            },
        ]);
        if (activityError) {
            console.error("CUSTOMER IMPORT ACTIVITY ERROR:", activityError);
            addIssue({
                row: rowNumber,
                reason: `Customer imported, but its activity could not be recorded: ${activityError.message}`,
                company: company.trim(),
                contact: contact.trim(),
            });
        }
    }
    return NextResponse.json({
        inserted,
        skipped,
        issues,
    });
}
