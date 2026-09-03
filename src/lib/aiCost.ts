import type { SupabaseClient } from "@supabase/supabase-js";
export type AiFeature = "ai_chat" | "sales_copilot" | "revenue_forecast";
type AiUsageBreakdown = {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    cost_usd: number;
    calls: number;
};
type AiUsageSummary = {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    cost_usd: number;
    calls: number;
    by_feature: Record<string, AiUsageBreakdown>;
};
const MODEL_PRICING: Record<string, {
    inputPer1m: number;
    outputPer1m: number;
}> = {
    "gpt-4.1-mini": { inputPer1m: 0.4, outputPer1m: 1.6 },
};
const round6 = (value: number) => Math.round(value * 1000000) / 1000000;
const calcCostUsd = (model: string, promptTokens: number, completionTokens: number) => {
    const pricing = MODEL_PRICING[model] || MODEL_PRICING["gpt-4.1-mini"];
    const inputCost = (promptTokens / 1000000) * pricing.inputPer1m;
    const outputCost = (completionTokens / 1000000) * pricing.outputPer1m;
    return round6(inputCost + outputCost);
};
export async function recordAiUsageEvent(supabase: SupabaseClient, workspaceId: string, userId: string, feature: AiFeature, model: string, promptTokens: number, completionTokens: number): Promise<void> {
    const safePrompt = Math.max(0, Number(promptTokens || 0));
    const safeCompletion = Math.max(0, Number(completionTokens || 0));
    const total = safePrompt + safeCompletion;
    const cost = calcCostUsd(model, safePrompt, safeCompletion);
    await supabase.from("audit_logs").insert({
        workspace_id: workspaceId,
        actor_user_id: userId,
        event_type: "ai.usage",
        payload: {
            feature,
            model,
            prompt_tokens: safePrompt,
            completion_tokens: safeCompletion,
            total_tokens: total,
            cost_usd: cost,
            captured_at: new Date().toISOString(),
        },
    });
}
export async function summarizeWorkspaceAiUsage(supabase: SupabaseClient, workspaceId: string, month: string): Promise<AiUsageSummary> {
    const from = `${month}-01T00:00:00.000Z`;
    const toDate = new Date(from);
    toDate.setUTCMonth(toDate.getUTCMonth() + 1);
    const to = toDate.toISOString();
    const { data } = await supabase
        .from("audit_logs")
        .select("payload")
        .eq("workspace_id", workspaceId)
        .eq("event_type", "ai.usage")
        .gte("created_at", from)
        .lt("created_at", to);
    const summary: AiUsageSummary = {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
        cost_usd: 0,
        calls: 0,
        by_feature: {},
    };
    for (const row of data || []) {
        const payload = (row.payload || {}) as Record<string, unknown>;
        const feature = typeof payload.feature === "string" ? payload.feature : "unknown";
        const prompt = Number(payload.prompt_tokens || 0);
        const completion = Number(payload.completion_tokens || 0);
        const total = Number(payload.total_tokens || prompt + completion);
        const cost = Number(payload.cost_usd || 0);
        summary.prompt_tokens += prompt;
        summary.completion_tokens += completion;
        summary.total_tokens += total;
        summary.cost_usd += cost;
        summary.calls += 1;
        if (!summary.by_feature[feature]) {
            summary.by_feature[feature] = {
                prompt_tokens: 0,
                completion_tokens: 0,
                total_tokens: 0,
                cost_usd: 0,
                calls: 0,
            };
        }
        summary.by_feature[feature].prompt_tokens += prompt;
        summary.by_feature[feature].completion_tokens += completion;
        summary.by_feature[feature].total_tokens += total;
        summary.by_feature[feature].cost_usd += cost;
        summary.by_feature[feature].calls += 1;
    }
    summary.cost_usd = round6(summary.cost_usd);
    for (const key of Object.keys(summary.by_feature)) {
        summary.by_feature[key].cost_usd = round6(summary.by_feature[key].cost_usd);
    }
    return summary;
}
