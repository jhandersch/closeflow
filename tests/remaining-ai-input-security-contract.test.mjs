import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("remaining AI and lead email inputs are validated and bounded", async () => {
  const [insight, score, generator, email] = await Promise.all([
    readFile(new URL("../src/app/api/ai-insight/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/api/ai/lead-score/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/api/ai/email-generator/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/api/leads/[id]/email/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(insight, /readJsonObject\(request\)/);
  assert.match(insight, /result\.headline\.length > 300/);
  assert.match(score, /readJsonObject\(request\)/);
  assert.match(generator, /readJsonObject\(request\)/);
  assert.match(email, /checkRateLimit\(`lead:email:/);
  assert.match(email, /readJsonObject\(request\)/);
  assert.match(email, /isUuid\(leadId\)/);
});
