import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("authenticated dashboard sessions have an inactivity timeout", async () => {
  const source = await readFile(
    new URL("../src/components/AuthGuard.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /SESSION_IDLE_TIMEOUT_MS = 30 \* 60 \* 1000/);
  assert.match(source, /supabase\.auth\.signOut\(\{ scope: "local" \}\)/);
  assert.match(source, /pointerdown/);
  assert.match(source, /keydown/);
  assert.match(source, /touchstart/);
});
