import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("invite acceptance does not expose unexpected exception messages", async () => {
  const source = await readFile(
    new URL("../src/app/api/workspaces/invite/accept/route.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /error: "The invitation could not be accepted\."/);
  assert.match(source, /confirmationRequired/);
  assert.doesNotMatch(
    source,
    /error:\s*error instanceof Error\s*\?\s*error\.message/,
  );
});
