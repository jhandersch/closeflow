import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("onboarding, lead, and import writes enforce bounded payloads", async () => {
  const files = [
    "../src/app/api/onboarding/route.ts",
    "../src/app/api/leads/route.ts",
    "../src/app/api/customers/import/route.ts",
    "../src/app/api/leads/import/route.ts",
  ];
  const sources = await Promise.all(
    files.map((file) => readFile(new URL(file, import.meta.url), "utf8")),
  );
  assert.match(sources[0], /readJsonObject\(request\)/);
  assert.match(sources[0], /Onboarding fields exceed/);
  assert.match(sources[1], /readJsonObject\(req\)/);
  assert.match(sources[2], /5 \* 1024 \* 1024/);
  assert.match(sources[3], /5 \* 1024 \* 1024/);
});
