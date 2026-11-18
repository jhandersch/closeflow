import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("critical profile and workspace writes reject non-object JSON payloads", async () => {
  const files = [
    "../src/app/api/profile/route.ts",
    "../src/app/api/profile/preferences/route.ts",
    "../src/app/api/workspaces/update-role/route.ts",
    "../src/app/api/workspaces/remove-member/route.ts",
    "../src/app/api/workspaces/invite/route.ts",
    "../src/app/api/workspaces/invite/accept/route.ts",
  ];
  const sources = await Promise.all(
    files.map((file) => readFile(new URL(file, import.meta.url), "utf8")),
  );
  for (const source of sources) {
    assert.match(source, /readJsonObject\(request\)/);
    assert.match(source, /Invalid request\./);
  }
});
