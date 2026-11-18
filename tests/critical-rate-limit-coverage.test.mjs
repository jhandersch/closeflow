import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("destructive account and billing mutations have server-side rate limits", async () => {
  const [deleteRoute, billingRoute] = await Promise.all([
    readFile(
      new URL("../src/app/api/profile/delete/route.ts", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../src/app/api/stripe/change-plan/route.ts", import.meta.url),
      "utf8",
    ),
  ]);
  assert.match(deleteRoute, /checkRateLimit\(`profile:delete:/);
  assert.match(billingRoute, /checkRateLimit\(`billing:change-plan:/);
  assert.doesNotMatch(billingRoute, /error:\s*subscriptionError\.message/);
});
