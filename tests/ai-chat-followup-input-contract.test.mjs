import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("AI chat and lead follow-up use bounded object input and safe output parsing", async () => {
  const [chat, followUp] = await Promise.all([
    readFile(new URL("../src/app/api/ai/chat/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/api/leads/[id]/follow-up-ai/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(chat, /readJsonObject\(request\)/);
  assert.match(chat, /const parsed: unknown = JSON\.parse/);
  assert.match(followUp, /readJsonObject\(request\)/);
  assert.match(followUp, /isUuid\(id\)/);
  assert.doesNotMatch(followUp, /request\.json\(\)\.catch/);
});
