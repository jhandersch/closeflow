import { NextRequest, NextResponse } from "next/server";
import { getRouteUser, loadWorkspaceForUser, } from "@/lib/supabase/route";
import { getPersonalDealCostsForLead } from "@/lib/personalDealCosts";
import { requireAiWorkspaceQuota } from "@/lib/aiAccess";
import { normalizeLanguage } from "@/lib/i18n";
export async function POST(request: NextRequest, context: {
    params: Promise<{
        id: string;
    }>;
}) {
    const access = await requireAiWorkspaceQuota(request);
    if (!access.ok) return access.response;
    let language = normalizeLanguage(undefined);
    try {
        const { id } = await context.params;
        const body = await request.json().catch(() => ({}));
        if (!id) {
            return NextResponse.json({ error: "Missing lead id" }, { status: 400 });
        }
        const { supabase, user, error: authError, } = await getRouteUser(request);
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        language = normalizeLanguage(body?.language ?? user.user_metadata?.language);
        const isGerman = language === "de";
        const { workspace, error: workspaceError, } = await loadWorkspaceForUser(
            supabase,
            user.id,
            access.workspaceId,
        );
        if (workspaceError || !workspace?.id) {
            return NextResponse.json({ error: "Workspace required" }, { status: 403 });
        }
        const { data: lead, error: leadError, } = await supabase
            .from("leads")
            .select("*")
            .eq("id", id)
            .eq("workspace_id", workspace.id)
            .is("deleted_at", null)
            .single();
        if (leadError || !lead) {
            console.error("AI LEAD LOOKUP ERROR:", leadError);
            return NextResponse.json({ error: "Lead not found" }, { status: 404 });
        }
        const analysis = isGerman ? `
KI-Abschlussanalyse

Deal economics:
Brutto-Abschlusswert: ${Number(lead.value ?? 0).toLocaleString("de-DE", { style: "currency", currency: "EUR" })}
${(() => {
            const costs = getPersonalDealCostsForLead(user.user_metadata?.personal_deal_costs, id);
            const total = costs.reduce((sum, item) => sum + item.amount, 0);
            return costs.length
                ? `Erfasste Kosten: ${costs.map((item) => `${item.name}: ${item.amount.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}`).join(", ")}\nGeschätzter Wert nach diesen Kosten: ${(Number(lead.value ?? 0) - total).toLocaleString("de-DE", { style: "currency", currency: "EUR" })} (vor weiteren Ausgaben)`
                : "Für diesen Lead wurden keine Kosten erfasst.";
        })()}

Lead:
${lead.name}

Unternehmen:
${lead.company ?? "—"}

Abschlusswert:
${Number(lead.value ?? 0).toLocaleString("de-DE", { style: "currency", currency: "EUR" })}

Aktuelle Phase:
${translateLeadStatus(lead.status, "de")}

Empfehlung:

- Fasse abhängig von der aktuellen Vertriebsphase nach.
- Prüfe Abschlussrisiken und nächste Maßnahmen.
- Halte den Aktivitätsverlauf aktuell.
- Priorisiere die Kommunikation bei hohem Abschlusswert.

Risikostufe:
${lead.status === "new"
            ? "Mittel"
            : "Niedrig"}

Verkaufschance:
Dieser Lead hat Potenzial und sollte aktiv betreut werden.
` : `
AI Deal Analysis

Deal economics:\nGross deal value: €${Number(lead.value ?? 0).toFixed(2)}
${(() => {
            const costs = getPersonalDealCostsForLead(user.user_metadata?.personal_deal_costs, id);
            const total = costs.reduce((sum, item) => sum + item.amount, 0);
            return costs.length
                ? `User-entered costs: ${costs.map((item) => `${item.name}: €${item.amount.toFixed(2)}`).join(", ")}\nEstimated value after listed costs: €${(Number(lead.value ?? 0) - total).toFixed(2)} (before other expenses)`
                : "No user-entered costs recorded for this lead.";
        })()}

Lead:\n${lead.name}\n\nCompany:\n${lead.company ?? "—"}\n\nDeal Value:\n€${lead.value ?? 0}\n\nCurrent Stage:\n${lead.status}\n\nRecommendation:\n- Follow up with this lead based on the current pipeline stage.\n- Review deal risks and next actions.\n- Keep activity history updated.\n- Prioritize communication if the deal is valuable.\n\nRisk Level:\n${lead.status === "new" ? "Medium" : "Low"}\n\nOpportunity:\nThis lead has potential and should remain actively managed.\n`;
        return NextResponse.json({
            analysis,
        });
    }
    catch (error) {
        console.error("AI ANALYSIS ERROR:", error);
        return NextResponse.json({
            error: error instanceof Error
                ? (language === "de" ? "Die Analyse ist fehlgeschlagen." : error.message)
                : language === "de" ? "Interner Serverfehler" : "Internal server error",
        }, {
            status: 500,
        });
    }
}

function translateLeadStatus(status: string | null, language: "de") {
    if (language !== "de") return status ?? "—";
    const values: Record<string, string> = {
        new: "Neu", contacted: "Kontaktiert", qualified: "Qualifiziert",
        proposal: "Angebot", won: "Gewonnen", lost: "Verloren",
    };
    return values[(status ?? "").toLowerCase()] ?? status ?? "—";
}
