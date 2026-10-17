import type { SupabaseClient } from "@supabase/supabase-js";
import OpenAI from "openai";
export type AiFeature =
    | "ai_chat"
    | "sales_copilot"
    | "revenue_forecast"
    | "activity_ai"
    | "ai_insight"
    | "ai_email_generator"
    | "ai_email_rewrite"
    | "ai_meeting_prep"
    | "follow_up_ai"
    | "follow_up_forecast_ai"
    | "lead_memory_ai"
    | "lead_ai_analysis"
    | "lead_follow_up_ai"
    | "priority_ai"
    | "priority_analysis";
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
    "gpt-4.1-mini-2025-04-14": { inputPer1m: 0.4, outputPer1m: 1.6 },
    "gpt-4o-mini": { inputPer1m: 0.15, outputPer1m: 0.6 },
    "gpt-4o-mini-2024-07-18": { inputPer1m: 0.15, outputPer1m: 0.6 },
};
const round6 = (value: number) => Math.round(value * 1000000) / 1000000;
const calcCostUsd = (model: string, promptTokens: number, completionTokens: number) => {
    const pricing = MODEL_PRICING[model];
    if (!pricing) {
        throw new Error(`AI cost is not configured for model "${model}".`);
    }
    const inputCost = (promptTokens / 1000000) * pricing.inputPer1m;
    const outputCost = (completionTokens / 1000000) * pricing.outputPer1m;
    return round6(inputCost + outputCost);
};
export async function recordAiUsageEvent(workspaceId: string, userId: string, feature: AiFeature, model: string, promptTokens: number, completionTokens: number, auditClient?: SupabaseClient): Promise<void> {
    if (
        !Number.isSafeInteger(promptTokens) ||
        promptTokens < 0 ||
        !Number.isSafeInteger(completionTokens) ||
        completionTokens < 0
    ) {
        throw new Error("AI token usage must be non-negative safe integers.");
    }
    const safePrompt = promptTokens;
    const safeCompletion = completionTokens;
    const total = safePrompt + safeCompletion;
    if (!Number.isSafeInteger(total)) {
        throw new Error("Total AI token usage exceeds the safe integer range.");
    }
    const cost = calcCostUsd(model, safePrompt, safeCompletion);
    let client = auditClient;
    if (!client) {
        const { createAdminClient } = await import("./supabase/admin");
        client = createAdminClient();
    }
    const { error } = await client.from("audit_logs").insert({
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
    if (error) {
        throw new Error(`Could not record AI usage: ${error.message}`);
    }
}

export function createTrackedOpenAIFetch(
    _supabase: SupabaseClient,
    workspaceId: string,
    userId: string,
    feature: AiFeature,
    fetcher: typeof fetch = fetch,
    auditClient?: SupabaseClient,
): typeof fetch {
    return async (input, init) => {
        const response = await fetcher(input, init);
        if (!response.ok) {
            return response;
        }

        const url = input instanceof Request
            ? input.url
            : input instanceof URL
                ? input.href
                : input;
        if (!url.includes("/chat/completions")) {
            return response;
        }

        let completion: {
            model?: unknown;
            usage?: {
                prompt_tokens?: unknown;
                completion_tokens?: unknown;
            };
        };
        try {
            completion = await response.clone().json();
        } catch {
            throw new Error("AI provider returned an invalid usage response.");
        }

        const requestBody = typeof init?.body === "string"
            ? JSON.parse(init.body) as { model?: unknown }
            : {};
        const model = typeof completion.model === "string"
            ? completion.model
            : requestBody.model;
        const promptTokens = completion.usage?.prompt_tokens;
        const completionTokens = completion.usage?.completion_tokens;
        if (
            typeof model !== "string" ||
            typeof promptTokens !== "number" ||
            !Number.isSafeInteger(promptTokens) ||
            typeof completionTokens !== "number" ||
            !Number.isSafeInteger(completionTokens)
        ) {
            throw new Error("AI provider returned incomplete token usage.");
        }

        await recordAiUsageEvent(
            workspaceId,
            userId,
            feature,
            model,
            promptTokens,
            completionTokens,
            auditClient,
        );
        return response;
    };
}

export function createTrackedOpenAIClient(
    apiKey: string,
    supabase: SupabaseClient,
    workspaceId: string,
    userId: string,
    feature: AiFeature,
    fetcher: typeof fetch = fetch,
    auditClient?: SupabaseClient,
): OpenAI {
    return new OpenAI({
        apiKey,
        maxRetries: 0,
        fetch: createTrackedOpenAIFetch(
            supabase,
            workspaceId,
            userId,
            feature,
            fetcher,
            auditClient,
        ),
    });
}

export async function summarizeWorkspaceAiUsage(supabase: SupabaseClient, workspaceId: string, month: string): Promise<AiUsageSummary> {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
        throw new Error("AI usage month must use YYYY-MM format.");
    }
    const from = `${month}-01T00:00:00.000Z`;
    const toDate = new Date(from);
    toDate.setUTCMonth(toDate.getUTCMonth() + 1);
    const to = toDate.toISOString();
    const { data, error } = await supabase
        .from("audit_logs")
        .select("payload")
        .eq("workspace_id", workspaceId)
        .eq("event_type", "ai.usage")
        .gte("created_at", from)
        .lt("created_at", to);
    if (error) {
        throw new Error(`Could not read AI usage summary: ${error.message}`);
    }
    const summary: AiUsageSummary = {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
        cost_usd: 0,
        calls: 0,
        by_feature: {},
    };
    for (const row of data ?? []) {
        const payload = (row.payload || {}) as Record<string, unknown>;
        const feature = typeof payload.feature === "string" ? payload.feature : "unknown";
        const prompt = Number(payload.prompt_tokens || 0);
        const completion = Number(payload.completion_tokens || 0);
        const total = Number(payload.total_tokens || prompt + completion);
        const cost = Number(payload.cost_usd || 0);
        if (
            !Number.isSafeInteger(prompt) ||
            prompt < 0 ||
            !Number.isSafeInteger(completion) ||
            completion < 0 ||
            !Number.isSafeInteger(total) ||
            total < 0 ||
            !Number.isFinite(cost) ||
            cost < 0
        ) {
            throw new Error("AI usage summary contains an invalid audit record.");
        }
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
