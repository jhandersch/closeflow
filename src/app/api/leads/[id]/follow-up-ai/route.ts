import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { formatPersonalDealCostsForLead } from "@/lib/personalDealCosts";
import { requireAiWorkspaceQuota } from "@/lib/aiAccess";
import { createTrackedOpenAIClient } from "@/lib/aiCost";
import { normalizeLanguage } from "@/lib/i18n";
export async function POST(request: Request, context: {
    params: Promise<{
        id: string;
    }>;
}) {
    const access = await requireAiWorkspaceQuota(request);
    if (!access.ok) return access.response;
    try {
        const { id } = await context.params;
        const requestBody = await request.json().catch(() => ({}));
        const cookieSupabase = await createClient();
        const authorization = request.headers.get("authorization");
        const bearerToken = authorization?.startsWith("Bearer ")
            ? authorization.slice(7)
            : null;
        const supabase = bearerToken
            ? createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
                global: {
                    headers: {
                        Authorization: `Bearer ${bearerToken}`,
                    },
                },
                auth: {
                    persistSession: false,
                    autoRefreshToken: false,
                },
            })
            : cookieSupabase;
        const { data: { user, }, error: userError, } = await supabase.auth.getUser();
        if (userError || !user) {
            return NextResponse.json({
                error: "Unauthorized"
            }, {
                status: 401
            });
        }
        const language = normalizeLanguage(requestBody.language ?? user.user_metadata?.language);
        const isGerman = language === "de";
        const { data: lead, error, } = await supabase
            .from("leads")
            .select("*")
            .eq("id", id)
            .eq("workspace_id", access.workspaceId)
            .single();
        if (error || !lead) {
            return NextResponse.json({
                error: "Lead not found"
            }, {
                status: 404
            });
        }
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: isGerman ? "Die KI ist nicht eingerichtet." : "AI is not configured." }, { status: 503 });
        }
        const openai = createTrackedOpenAIClient(
            apiKey,
            access.supabase,
            access.workspaceId,
            access.userId,
            "lead_follow_up_ai",
        );
        const completion = await openai.chat.completions.create({
            model: "gpt-4.1-mini",
            response_format: {
                type: "json_object"
            },
            messages: [
                {
                    role: "system",
                    content: `
You are an expert sales assistant.

Create a follow-up email for a sales representative.
Use the listed costs to guide commercially sound wording, but do not disclose internal costs or margins to the customer.

Return JSON:

{
 subject:"",
 email:"",
 reason:"",
 next_action:""
}

Write all text values in ${isGerman ? "German" : "English"}.
`
                },
                {
                    role: "user",
                    content: `
Lead:
${lead.name}

Company:
${lead.company}

Status:
${lead.status}

Deal Value:
${lead.value}

Notes:
${lead.notes || "none"}

User-entered deal costs:
${formatPersonalDealCostsForLead(user.user_metadata?.personal_deal_costs, id, Number(lead.value || 0))}

Create the best follow-up.
`
                }
            ]
        });
        const result = JSON.parse(completion
            .choices[0]
            .message
            .content || "{}");
        return NextResponse.json(result);
    }
    catch (error) {
        console.error("FOLLOW UP AI ERROR", error);
        return NextResponse.json({
            error: "AI failed"
        }, {
            status: 500
        });
    }
}
