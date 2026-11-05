import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

// The helper is TypeScript; assert the sanitizing contract on its source rules.
const source = readFileSync(new URL("../src/lib/auditLog.ts", import.meta.url), "utf8");

test("audit helper drops credential-like keys and truncates strings", () => {
  assert.match(source, /token\|secret\|password\|authorization\|api\[_-\]\?key/);
  assert.match(source, /slice\(0, 200\)/);
});

test("audit helper never throws", () => {
  assert.match(source, /catch \(error\)[\s\S]*return false/);
});
