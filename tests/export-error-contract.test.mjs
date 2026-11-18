import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("lead export does not expose fallback database errors", async () => {
  const source = await readFile(
    new URL("../src/app/api/leads/export/route.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /LEAD EXPORT FALLBACK LOAD ERROR/);
  assert.doesNotMatch(source, /error:\s*fallback\.error\.message/);
  assert.match(source, /Could not export leads/);
});
