import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const workflowFiles = [
  "../.github/workflows/ci.yml",
  "../.github/workflows/codeql.yml",
];

test("GitHub Actions third-party and first-party actions are pinned to commit SHAs", async () => {
  for (const file of workflowFiles) {
    const workflow = await readFile(new URL(file, import.meta.url), "utf8");
    const uses = [...workflow.matchAll(/^\s*-?\s*uses:\s*([^\s#]+)/gm)].map((match) => match[1]);

    assert.ok(uses.length > 0, `${file} has action references`);
    for (const action of uses) {
      assert.match(
        action,
        /^[^/]+\/[^@]+@[0-9a-f]{40}$/,
        `${file} action ${action} must use an immutable commit SHA`,
      );
    }
  }
});
