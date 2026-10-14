import assert from "node:assert/strict";
import test from "node:test";
import {
  createTrackedOpenAIFetch,
  recordAiUsageEvent,
  summarizeWorkspaceAiUsage,
} from "../src/lib/aiCost.ts";

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

test("uses the published GPT-4o mini price", async () => {
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

test("tracked OpenAI fetch records usage from successful chat completions", async () => {
    const result = {};
    const trackedFetch = createTrackedOpenAIFetch(
      {},
      "workspace-1",
      "user-1",
      "ai_email_generator",
      async () => new Response(JSON.stringify({
        model: "gpt-4.1-mini",
        usage: { prompt_tokens: 15, completion_tokens: 7 },
        choices: [{ message: { content: "{}" } }],
      }), { status: 200 }),
      insertClient(result),
    );

    const response = await trackedFetch(
      "https://api.openai.com/v1/chat/completions",
      { method: "POST", body: JSON.stringify({ model: "gpt-4.1-mini" }) },
    );

    assert.equal(response.status, 200);
    assert.equal(result.row.event_type, "ai.usage");
    assert.equal(result.row.payload.prompt_tokens, 15);
    assert.equal(result.row.payload.completion_tokens, 7);
});

test("tracked OpenAI fetch fails closed when successful responses omit usage", async () => {
    const trackedFetch = createTrackedOpenAIFetch(
      {},
      "workspace-1",
      "user-1",
      "ai_email_generator",
      async () => new Response(JSON.stringify({
        model: "gpt-4.1-mini",
        choices: [{ message: { content: "{}" } }],
      }), { status: 200 }),
      insertClient({}),
    );

    await assert.rejects(
      trackedFetch(
        "https://api.openai.com/v1/chat/completions",
        { method: "POST", body: JSON.stringify({ model: "gpt-4.1-mini" }) },
      ),
      /incomplete token usage/,
    );
});

test("tracked OpenAI fetch fails closed when cost persistence fails", async () => {
    const trackedFetch = createTrackedOpenAIFetch(
      {},
      "workspace-1",
      "user-1",
      "ai_email_generator",
      async () => new Response(JSON.stringify({
        model: "gpt-4.1-mini",
        usage: { prompt_tokens: 15, completion_tokens: 7 },
      }), { status: 200 }),
      insertClient({ error: { message: "database unavailable" } }),
    );

    await assert.rejects(
      trackedFetch(
        "https://api.openai.com/v1/chat/completions",
        { method: "POST", body: JSON.stringify({ model: "gpt-4.1-mini" }) },
      ),
      /Could not record AI usage/,
    );
});

test("tracked OpenAI fetch does not record usage for provider error responses", async () => {
  const result = {};
  const trackedFetch = createTrackedOpenAIFetch(
    {},
    "workspace-1",
    "user-1",
    "ai_email_generator",
    async () => new Response(JSON.stringify({
      error: { message: "provider unavailable" },
    }), { status: 503 }),
    insertClient(result),
  );

  const response = await trackedFetch(
    "https://api.openai.com/v1/chat/completions",
    { method: "POST", body: JSON.stringify({ model: "gpt-4.1-mini" }) },
  );

  assert.equal(response.status, 503);
  assert.equal(result.row, undefined);
});

test("tracked OpenAI fetch propagates provider transport failures", async () => {
  const trackedFetch = createTrackedOpenAIFetch(
    {},
    "workspace-1",
    "user-1",
    "ai_email_generator",
    async () => {
      throw new Error("connection reset");
    },
    insertClient({}),
  );

  await assert.rejects(
    trackedFetch(
      "https://api.openai.com/v1/chat/completions",
      { method: "POST", body: JSON.stringify({ model: "gpt-4.1-mini" }) },
    ),
    /connection reset/,
  );
});

test("tracked OpenAI fetch ignores successful non-completion responses", async () => {
  const result = {};
  const trackedFetch = createTrackedOpenAIFetch(
    {},
    "workspace-1",
    "user-1",
    "ai_email_generator",
    async () => new Response(JSON.stringify({ object: "list" }), { status: 200 }),
    insertClient(result),
  );

  const response = await trackedFetch("https://api.openai.com/v1/models", {
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
