import { NextResponse } from "next/server";
import { getRouteUser, loadWorkspaceForUser, } from "@/lib/supabase/route";
type ImportIssue = {
    row: number;
    reason: string;
    company: string;
    contact: string;
};
const MAX_ISSUES_RETURNED = 500;
const parseCsvLine = (line: string, delimiter: "," | ";") => {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let index = 0; index < line.length; index += 1) {
        const char = line[index];
        const next = line[index + 1];
        if (char === '"') {
            if (inQuotes && next === '"') {
                current += '"';
                index += 1;
            }
            else {
                inQuotes = !inQuotes;
            }
            continue;
        }
        if (char === delimiter && !inQuotes) {
            values.push(current);
            current = "";
            continue;
        }
        current += char;
    }
    values.push(current);
    return values.map((value) => value.trim());
};
const detectDelimiter = (headerLine: string) => {
    const semicolonCount = (headerLine.match(/;/g) || []).length;
    const commaCount = (headerLine.match(/,/g) || []).length;
    return semicolonCount > commaCount
        ? ";"
        : ",";
};
export async function POST(request: Request) {
    const { supabase, user, error, } = await getRouteUser(request);
    if (error || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { workspace } = await loadWorkspaceForUser(supabase, user.id);
    if (!workspace?.id) {
        return NextResponse.json({ error: "Workspace required" }, { status: 403 });
    }
    const body = await request.json();
    const csvText = typeof body.csv === "string"
        ? body.csv
        : "";
    if (!csvText.trim()) {
        return NextResponse.json({ error: "csv is required" }, { status: 400 });
    }
    /*
     * Remove UTF-8 BOM if present.
     */
    const normalizedCsv = csvText.replace(/^\uFEFF/, "");
    const lines = normalizedCsv
        .split(/\r?\n/)
        .map((line: string) => line.trim())
        .filter(Boolean);
    if (lines.length < 2) {
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
     * company;contact;revenue
     *
     * and:
     *
     * company,contact,revenue
     */
    const delimiter = detectDelimiter(lines[0]);
    const headers = parseCsvLine(lines[0], delimiter).map((header) => header.toLowerCase());
    const headerIndex = (name: string) => headers.indexOf(name);
    /*
     * Only active leads participate in
     * duplicate detection.
     *
     * Soft-deleted leads are ignored.
     */
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
    const knownKeys = new Set((existingLeads || []).map((lead) => `${(lead.name || "")
        .trim()
        .toLowerCase()}::${(lead.company || "")
        .trim()
        .toLowerCase()}`));
    let inserted = 0;
    let skipped = 0;
    const issues: ImportIssue[] = [];
    const addIssue = (issue: ImportIssue) => {
        if (issues.length <
            MAX_ISSUES_RETURNED) {
            issues.push(issue);
        }
    };
    for (const [lineIndex, line] of lines
        .slice(1)
        .entries()) {
        const rowNumber = lineIndex + 2;
        const values = parseCsvLine(line, delimiter);
        const get = (column: string) => {
            const index = headerIndex(column);
            return index >= 0
                ? values[index] || ""
                : "";
        };
        const company = get("company");
        const contact = get("contact") ||
            `Contact ${rowNumber - 1}`;
        const revenueText = get("revenue");
        const revenue = Number(revenueText || "0");
        if (!company.trim()) {
            skipped += 1;
            addIssue({
                row: rowNumber,
                reason: "Missing required field: company",
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
        knownKeys.add(key);
        inserted += 1;
        await supabase
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
    }
    return NextResponse.json({
        inserted,
        skipped,
        issues,
    });
}
