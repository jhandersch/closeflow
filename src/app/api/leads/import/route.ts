import { NextResponse } from "next/server";
import { denyReadOnlyWrite, getRouteUser, loadWorkspaceForUser } from "@/lib/supabase/route";
import { withWorkspaceImportLock } from "@/lib/import-lock";
import { getLeadCapacitySnapshot } from "@/lib/usageLimits";
import { parseCsvDocument } from "@/lib/csv";
type ImportIssue = {
    row: number;
    reason: string;
    field?: string;
    value?: string;
    name: string;
    company: string;
    status?: string;
    dealValue?: string;
    email?: string;
    phone?: string;
    website?: string;
    address?: string;
    source?: string;
    tags?: string;
    notes?: string;
};
const MAX_ISSUES_RETURNED = 500;
const normalize = (value: unknown) => String(value ?? "")
    .trim()
    .toLowerCase();
const parseNumber = (value: string) => {
    const normalized = value
        .trim()
        .replace(/\s/g, "")
        .replace(",", ".");
    if (!normalized) {
        return 0;
    }
    const number = Number(normalized);
    return Number.isFinite(number) ? number : null;
};
const ACTIVE_STATUSES = new Set(["new", "contacted", "proposal"]);
const IMPORT_BATCH_SIZE = 100;
type ImportCandidate = {
    rowNumber: number;
    key: string;
    name: string;
    company: string;
    status: string;
    value: number;
    notes: string;
    source: string | null;
    email: string | null;
    phone: string | null;
    website: string | null;
    address: string | null;
    tags: string[];
    stageChangedAt: string;
    explicitStageChangedAt: boolean;
};
type ExistingLead = Record<string, unknown> & {
    id: string;
    name: string | null;
    company: string | null;
};
type ImportRpcResult = {
    row_number: number;
    lead_id: string | null;
    name?: string | null;
    company?: string | null;
    error_message: string | null;
};

const matchesExistingLead = (existing: Record<string, unknown>, candidate: ImportCandidate) => {
    const sameTags = JSON.stringify(Array.isArray(existing.tags) ? existing.tags : []) === JSON.stringify(candidate.tags);
    const comparableFields: Array<[string, unknown]> = [
        ["name", candidate.name],
        ["company", candidate.company],
        ["status", candidate.status],
        ["value", candidate.value],
        ["notes", candidate.notes],
        ["source", candidate.source],
        ["email", candidate.email],
        ["phone", candidate.phone],
        ["website", candidate.website],
        ["address", candidate.address],
    ];
    const sameFields = comparableFields.every(([field, value]) => {
        if (!(field in existing)) return true;
        const existingValue = existing[field] ?? null;
        const candidateValue = value ?? null;
        return field === "value"
            ? Number(existingValue ?? 0) === Number(candidateValue ?? 0)
            : existingValue === candidateValue;
    });
    const sameStageDate = !candidate.explicitStageChangedAt || existing.stage_changed_at === candidate.stageChangedAt;
    return sameFields && sameTags && sameStageDate;
};

export async function POST(request: Request) {
    const denied = await denyReadOnlyWrite(request);
    if (denied) return denied;
    return withWorkspaceImportLock(request, importLeads);
}
async function importLeads(request: Request) {
    const { supabase, user, error } = await getRouteUser(request);
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
    let rows: string[][];
    try {
        rows = parseCsvDocument(csvText.replace(/^\uFEFF/, ""), ",");
    }
    catch {
        return NextResponse.json({ error: "Invalid CSV: unterminated quoted field" }, { status: 400 });
    }
    if (rows.length < 2) {
        return NextResponse.json({
            inserted: 0,
            updated: 0,
            skipped: 0,
            issues: [],
            message: "No rows found",
        });
    }
    const headers = rows[0].map((header) => normalize(header));
    const headerIndex = (name: string) => headers.indexOf(normalize(name));
    const getValue = (values: string[], column: string) => {
        const index = headerIndex(column);
        if (index < 0) {
            return "";
        }
        return values[index]?.trim() || "";
    };
    /** Load existing leads in bounded pages for workspace-local duplicate detection. */
    const existingLeads: ExistingLead[] = [];
    let useExtendedExistingColumns = true;
    for (let from = 0; ; from += 1000) {
        const extendedPage = await supabase
            .from("leads")
            .select("id, name, company, status, value, notes, source, email, phone, website, address, tags, stage_changed_at")
            .eq("workspace_id", workspace.id)
            .range(from, from + 999);
        let pageData = extendedPage.data as unknown as ExistingLead[] | null;
        let pageError = extendedPage.error;
        if (pageError && useExtendedExistingColumns && /column .* does not exist|schema cache/i.test(pageError.message || "")) {
            useExtendedExistingColumns = false;
            const legacyPage = await supabase
                .from("leads")
                .select("id, name, company, status, value, notes")
                .eq("workspace_id", workspace.id)
                .range(from, from + 999);
            pageData = legacyPage.data as unknown as ExistingLead[] | null;
            pageError = legacyPage.error;
        }
        if (pageError) {
            return NextResponse.json({ error: pageError.message }, { status: 500 });
        }
        existingLeads.push(...(pageData || []));
        if (!pageData || pageData.length < 1000) break;
    }
    const existingByKey = new Map<string, ExistingLead>();
    const existingById = new Map<string, ExistingLead>();
    for (const lead of existingLeads) {
        existingById.set(lead.id, lead);
        const key = `${normalize(lead.name)}::${normalize(lead.company)}`;
        if (key !== "::") {
            existingByKey.set(key, lead);
        }
    }
    let inserted = 0;
    let updated = 0;
    let unchanged = 0;
    let skipped = 0;
    const issues: ImportIssue[] = [];
    const addIssue = (issue: ImportIssue) => {
        if (issues.length < MAX_ISSUES_RETURNED) {
            issues.push(issue);
        }
    };
    const pendingInserts = new Map<string, ImportCandidate>();
    const pendingUpdates = new Map<string, ImportCandidate>();
    for (let index = 1; index < rows.length; index += 1) {
        const values = rows[index];
        const rowNumber = index + 1;
        const name = getValue(values, "name");
        const company = getValue(values, "company");
        const status = getValue(values, "status") || "new";
        const valueText = getValue(values, "value");
        const parsedValue = parseNumber(valueText);
        if (!name) {
            skipped += 1;
            addIssue({
                row: rowNumber,
                reason: "Missing required field: name",
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
            });
            continue;
        }
        if (parsedValue === null) {
            skipped += 1;
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
            });
            continue;
        }
        const key = `${normalize(name)}::${normalize(company)}`;
        const existingLead = existingByKey.get(key);
        const tags = getValue(values, "tags")
            .split("|")
            .map((tag) => tag.trim())
            .filter(Boolean);
        const candidate: ImportCandidate = {
            rowNumber,
            key,
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
            stageChangedAt: getValue(values, "stage_changed_at") || new Date().toISOString(),
            explicitStageChangedAt: Boolean(getValue(values, "stage_changed_at")),
        };
        if (existingLead) {
            pendingUpdates.set(existingLead.id, candidate);
            continue;
        }
        pendingInserts.set(key, candidate);
    }

    for (const [id, candidate] of pendingUpdates) {
        const existing = existingById.get(id);
        if (existing && matchesExistingLead(existing, candidate)) {
            pendingUpdates.delete(id);
            unchanged += 1;
        }
    }

    const newCandidates = [...pendingInserts.values()];
    const activeNewCandidates = newCandidates.filter((candidate) => ACTIVE_STATUSES.has(candidate.status));
    const capacity = activeNewCandidates.length
        ? await getLeadCapacitySnapshot(supabase, user.id, workspace.id)
        : { ok: true as const, available: null };
    if (!capacity.ok) {
        return NextResponse.json({ error: capacity.message }, { status: capacity.status });
    }

    let available = capacity.available;
    const allowedInserts: ImportCandidate[] = [];
    for (const candidate of newCandidates) {
        if (ACTIVE_STATUSES.has(candidate.status) && available !== null) {
            if (available <= 0) {
                skipped += 1;
                addIssue({
                    row: candidate.rowNumber,
                    reason: "Lead limit reached. Upgrade your plan to add more active leads.",
                    name: candidate.name,
                    company: candidate.company,
                });
                continue;
            }
            available -= 1;
        }
        allowedInserts.push(candidate);
    }

    for (let offset = 0; offset < allowedInserts.length; offset += IMPORT_BATCH_SIZE) {
        const batch = allowedInserts.slice(offset, offset + IMPORT_BATCH_SIZE);
        const rpcRows = batch.map((candidate) => ({
            ...candidate,
            stageChangedAt: candidate.stageChangedAt,
            lastActivityAt: new Date().toISOString(),
        }));
        const { data, error: importError } = await supabase.rpc("import_leads_with_activity", {
            p_workspace_id: workspace.id,
            p_user_id: user.id,
            p_rows: rpcRows,
            p_operation: "insert",
        });
        const rpcResults: ImportRpcResult[] = Array.isArray(data) ? data : [];
        const results = new Map(rpcResults.map((result) => [result.row_number, result]));
        for (const candidate of batch) {
            const result = results.get(candidate.rowNumber);
            if (!importError && result?.lead_id && !result.error_message) {
                inserted += 1;
                continue;
            }
            skipped += 1;
            addIssue({
                row: candidate.rowNumber,
                reason: result?.error_message || importError?.message || "Import returned no result for row.",
                name: candidate.name,
                company: candidate.company,
            });
        }
    }

    const updates = [...pendingUpdates.entries()];
    for (let offset = 0; offset < updates.length; offset += IMPORT_BATCH_SIZE) {
        const batch = updates.slice(offset, offset + IMPORT_BATCH_SIZE);
        const rpcRows = batch.map(([id, candidate]) => ({
            ...candidate,
            id,
            stageChangedAt: candidate.stageChangedAt,
            lastActivityAt: new Date().toISOString(),
        }));
        const { data, error: importError } = await supabase.rpc("import_leads_with_activity", {
            p_workspace_id: workspace.id,
            p_user_id: user.id,
            p_rows: rpcRows,
            p_operation: "update",
        });
        const rpcResults: ImportRpcResult[] = Array.isArray(data) ? data : [];
        const results = new Map(rpcResults.map((result) => [result.row_number, result]));
        for (const [, candidate] of batch) {
            const result = results.get(candidate.rowNumber);
            if (!importError && result?.lead_id && !result.error_message) {
                updated += 1;
                continue;
            }
            skipped += 1;
            addIssue({
                row: candidate.rowNumber,
                reason: result?.error_message || importError?.message || "Import returned no result for row.",
                name: candidate.name,
                company: candidate.company,
            });
        }
    }

    return NextResponse.json({
        inserted,
        updated,
        unchanged,
        skipped,
        issues,
    });
}
