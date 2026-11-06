import assert from "node:assert/strict";
import test from "node:test";
import {
  createTrackedAzureOpenAIClient,
  createTrackedAzureOpenAIFetch,
  recordAiUsageEvent,
  summarizeWorkspaceAiUsage,
} from "../src/lib/aiCost.ts";

process.env.AZURE_OPENAI_ENDPOINT ||= "https://closeflow-test.openai.azure.com";
process.env.AZURE_OPENAI_API_KEY ||= "test-only-key";
process.env.AZURE_OPENAI_API_VERSION ||= "2024-10-21";
process.env.AZURE_OPENAI_GPT_4_1_MINI_DEPLOYMENT ||= "gpt-4-1-mini-test";
process.env.AZURE_OPENAI_GPT_4O_MINI_DEPLOYMENT ||= "gpt-4o-mini-test";
process.env.AZURE_OPENAI_GPT_4_1_MINI_INPUT_USD_PER_1M_TOKENS ||= "0.4";
process.env.AZURE_OPENAI_GPT_4_1_MINI_OUTPUT_USD_PER_1M_TOKENS ||= "1.6";
process.env.AZURE_OPENAI_GPT_4O_MINI_INPUT_USD_PER_1M_TOKENS ||= "0.15";
process.env.AZURE_OPENAI_GPT_4O_MINI_OUTPUT_USD_PER_1M_TOKENS ||= "0.6";

const insertClient = (result) => ({
  from(table) {
    assert.equal(table, "audit_logs");
    return {
      insert: async (row) => {
        result.row = row;
        return { data: null, error: result.error ?? null };
      },
    };
  },
});

const summaryClient = (result) => ({
  from(table) {
    assert.equal(table, "audit_logs");
    const query = {
      select(columns) {
        assert.equal(columns, "payload");
        return query;
      },
      eq(column, value) {
        assert.ok(
          (column === "workspace_id" && value === "workspace-1") ||
            (column === "event_type" && value === "ai.usage"),
        );
        return query;
      },
      gte(column, value) {
        assert.equal(column, "created_at");
        assert.equal(value, "2026-10-01T00:00:00.000Z");
        return query;
      },
      lt(column, value) {
        assert.equal(column, "created_at");
        assert.equal(value, "2026-11-01T00:00:00.000Z");
        return Promise.resolve(result);
      },
    };
    return query;
  },
});

test("records known model tokens and the configured cost", async () => {
  const result = {};
  await recordAiUsageEvent(
    "workspace-1",
    "user-1",
    "ai_chat",
    "gpt-4.1-mini",
    1_000_000,
    1_000_000,
    insertClient(result),
  );

  assert.equal(result.row.workspace_id, "workspace-1");
  assert.deepEqual(result.row.payload, {
    feature: "ai_chat",
    model: "gpt-4.1-mini",
    prompt_tokens: 1_000_000,
    completion_tokens: 1_000_000,
    total_tokens: 2_000_000,
    cost_usd: 2,
    captured_at: result.row.payload.captured_at,
  });
});

test("uses the configured Azure GPT-4o mini price", async () => {
    const result = {};
    await recordAiUsageEvent(
      "workspace-1",
      "user-1",
      "priority_ai",
      "gpt-4o-mini",
      1_000_000,
      1_000_000,
      insertClient(result),
    );

    assert.equal(result.row.payload.cost_usd, 0.75);
});

test("uses the configured prices for dated model identifiers", async () => {
  for (const [model, expectedCost] of [
    ["gpt-4.1-mini-2025-04-14", 2],
    ["gpt-4o-mini-2024-07-18", 0.75],
  ]) {
    const result = {};
    await recordAiUsageEvent(
      "workspace-1",
      "user-1",
      "priority_ai",
      model,
      1_000_000,
      1_000_000,
      insertClient(result),
    );
    assert.equal(result.row.payload.cost_usd, expectedCost);
  }
});

test("tracked Azure fetch records usage from successful chat completions", async () => {
    const result = {};
    const trackedFetch = createTrackedAzureOpenAIFetch(
      {},
      "workspace-1",
      "user-1",
      "ai_email_generator",
      "gpt-4.1-mini",
      async () => new Response(JSON.stringify({
        model: "gpt-4.1-mini",
        usage: { prompt_tokens: 15, completion_tokens: 7 },
        choices: [{ message: { content: "{}" } }],
      }), { status: 200 }),
      insertClient(result),
    );

    const response = await trackedFetch(
      "https://closeflow-test.openai.azure.com/openai/deployments/gpt-4-1-mini-test/chat/completions?api-version=2024-10-21",
      { method: "POST", body: JSON.stringify({ model: "gpt-4.1-mini", messages: [{ role: "user", content: "test" }] }) },
    );

    assert.equal(response.status, 200);
    assert.equal(result.row.event_type, "ai.usage");
    assert.equal(result.row.payload.prompt_tokens, 15);
    assert.equal(result.row.payload.completion_tokens, 7);
});

test("tracked Azure SDK client records a mocked completion for every AI feature", async () => {
  const features = [
    "ai_chat",
    "sales_copilot",
    "revenue_forecast",
    "activity_ai",
    "ai_insight",
    "ai_email_generator",
    "ai_email_rewrite",
    "ai_meeting_prep",
    "follow_up_ai",
    "follow_up_forecast_ai",
    "lead_memory_ai",
    "lead_ai_analysis",
    "lead_follow_up_ai",
    "priority_ai",
    "priority_analysis",
  ];

  for (const feature of features) {
    const result = {};
    let providerUrl;
    const client = createTrackedAzureOpenAIClient(
      {},
      "workspace-1",
      "user-1",
      feature,
      "gpt-4.1-mini",
      async (input, init) => {
        const request = new Request(input, init);
        providerUrl = request.url;
        assert.equal(request.headers.get("api-key"), "test-only-key");
        assert.equal(request.headers.has("authorization"), false);
        return new Response(JSON.stringify({
          id: "chatcmpl-mock",
          object: "chat.completion",
          created: 0,
          model: "gpt-4.1-mini",
          choices: [{
            index: 0,
            message: { role: "assistant", content: "Mock response" },
            finish_reason: "stop",
          }],
          usage: { prompt_tokens: 15, completion_tokens: 7, total_tokens: 22 },
        }), { status: 200, headers: { "content-type": "application/json" } });
      },
      insertClient(result),
    );

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: "Mock request" }],
    });

    assert.equal(completion.choices[0].message.content, "Mock response");
    assert.match(
      providerUrl,
      /^https:\/\/closeflow-test\.openai\.azure\.com\/openai\/deployments\/gpt-4-1-mini-test\/chat\/completions\?/,
    );
    assert.equal(result.row.event_type, "ai.usage");
    assert.equal(result.row.workspace_id, "workspace-1");
    assert.equal(result.row.actor_user_id, "user-1");
    assert.equal(result.row.payload.feature, feature);
    assert.equal(result.row.payload.prompt_tokens, 15);
    assert.equal(result.row.payload.completion_tokens, 7);
    assert.equal(result.row.payload.total_tokens, 22);
    assert.equal(result.row.payload.cost_usd, 0.000017);
  }
});

test("tracked Azure fetch fails closed when successful responses omit usage", async () => {
    const trackedFetch = createTrackedAzureOpenAIFetch(
      {},
      "workspace-1",
      "user-1",
      "ai_email_generator",
      "gpt-4.1-mini",
      async () => new Response(JSON.stringify({
        model: "gpt-4.1-mini",
        choices: [{ message: { content: "{}" } }],
      }), { status: 200 }),
      insertClient({}),
    );

    await assert.rejects(
      trackedFetch(
        "https://closeflow-test.openai.azure.com/openai/deployments/gpt-4-1-mini-test/chat/completions?api-version=2024-10-21",
        { method: "POST", body: JSON.stringify({ model: "gpt-4.1-mini", messages: [{ role: "user", content: "test" }] }) },
      ),
      /incomplete token usage/,
    );
});

test("tracked Azure fetch fails closed when cost persistence fails", async () => {
    const trackedFetch = createTrackedAzureOpenAIFetch(
      {},
      "workspace-1",
      "user-1",
      "ai_email_generator",
      "gpt-4.1-mini",
      async () => new Response(JSON.stringify({
        model: "gpt-4.1-mini",
        usage: { prompt_tokens: 15, completion_tokens: 7 },
      }), { status: 200 }),
      insertClient({ error: { message: "database unavailable" } }),
    );

    await assert.rejects(
      trackedFetch(
        "https://closeflow-test.openai.azure.com/openai/deployments/gpt-4-1-mini-test/chat/completions?api-version=2024-10-21",
        { method: "POST", body: JSON.stringify({ model: "gpt-4.1-mini", messages: [{ role: "user", content: "test" }] }) },
      ),
      /Could not record AI usage/,
    );
});

test("tracked Azure fetch does not record usage for provider error responses", async () => {
  const result = {};
  const trackedFetch = createTrackedAzureOpenAIFetch(
    {},
    "workspace-1",
    "user-1",
    "ai_email_generator",
    "gpt-4.1-mini",
    async () => new Response(JSON.stringify({
      error: { message: "provider unavailable" },
    }), { status: 503 }),
    insertClient(result),
  );

  const response = await trackedFetch(
    "https://closeflow-test.openai.azure.com/openai/deployments/gpt-4-1-mini-test/chat/completions?api-version=2024-10-21",
    { method: "POST", body: JSON.stringify({ model: "gpt-4.1-mini", messages: [{ role: "user", content: "test" }] }) },
  );

  assert.equal(response.status, 503);
  assert.equal(result.row, undefined);
});

test("tracked Azure fetch propagates provider transport failures", async () => {
  const trackedFetch = createTrackedAzureOpenAIFetch(
    {},
    "workspace-1",
    "user-1",
    "ai_email_generator",
    "gpt-4.1-mini",
    async () => {
      throw new Error("connection reset");
    },
    insertClient({}),
  );

  await assert.rejects(
    trackedFetch(
      "https://closeflow-test.openai.azure.com/openai/deployments/gpt-4-1-mini-test/chat/completions?api-version=2024-10-21",
      { method: "POST", body: JSON.stringify({ model: "gpt-4.1-mini", messages: [{ role: "user", content: "test" }] }) },
    ),
    /connection reset/,
  );
});

test("tracked Azure fetch ignores successful non-completion responses", async () => {
  const result = {};
  const trackedFetch = createTrackedAzureOpenAIFetch(
    {},
    "workspace-1",
    "user-1",
    "ai_email_generator",
    "gpt-4.1-mini",
    async () => new Response(JSON.stringify({ object: "list" }), { status: 200 }),
    insertClient(result),
  );

  const response = await trackedFetch("https://closeflow-test.openai.azure.com/openai/models", {
    method: "GET",
  });

  assert.equal(response.status, 200);
  assert.equal(result.row, undefined);
});

test("does not invent a price for an unconfigured model", async () => {
  await assert.rejects(
    recordAiUsageEvent(
      "workspace-1",
      "user-1",
      "ai_chat",
      "gpt-unpriced-model",
      12,
      8,
      insertClient({}),
    ),
    /AI cost is not configured/,
  );
});

test("rejects invalid token counts instead of coercing them to zero", async () => {
  await assert.rejects(
    recordAiUsageEvent(
      "workspace-1",
      "user-1",
      "ai_chat",
      "gpt-4.1-mini",
      Number.NaN,
      8,
      insertClient({}),
    ),
    /non-negative safe integers/,
  );
});

test("surfaces audit insert failures", async () => {
  await assert.rejects(
    recordAiUsageEvent(
      "workspace-1",
      "user-1",
      "ai_chat",
      "gpt-4.1-mini",
      12,
      8,
      insertClient({ error: { message: "database unavailable" } }),
    ),
    /Could not record AI usage/,
  );
});

test("summarizes stored tokens and costs per feature", async () => {
  const result = await summarizeWorkspaceAiUsage(
    summaryClient({
      data: [
        {
          payload: {
            feature: "ai_chat",
            prompt_tokens: 12,
            completion_tokens: 8,
            total_tokens: 20,
            cost_usd: 0.00002,
          },
        },
      ],
      error: null,
    }),
    "workspace-1",
    "2026-10",
  );

  assert.deepEqual(result, {
    prompt_tokens: 12,
    completion_tokens: 8,
    total_tokens: 20,
    cost_usd: 0.00002,
    calls: 1,
    by_feature: {
      ai_chat: {
        prompt_tokens: 12,
        completion_tokens: 8,
        total_tokens: 20,
        cost_usd: 0.00002,
        calls: 1,
      },
    },
  });
});

test("fails when the audit summary query fails", async () => {
  await assert.rejects(
    summarizeWorkspaceAiUsage(
      summaryClient({ data: null, error: { message: "database unavailable" } }),
      "workspace-1",
      "2026-10",
    ),
    /Could not read AI usage summary/,
  );
});

test("rejects invalid summary months", async () => {
  await assert.rejects(
    summarizeWorkspaceAiUsage(summaryClient({ data: [], error: null }), "workspace-1", "October"),
    /YYYY-MM format/,
  );
});
