import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("critical writes validate identifiers, email, and profile field lengths", async () => {
  const [validation, invite, role, remove, profile] = await Promise.all([
    readFile(new URL("../src/lib/requestValidation.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/api/workspaces/invite/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/api/workspaces/update-role/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/api/workspaces/remove-member/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/api/profile/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(validation, /UUID_PATTERN/);
  assert.match(validation, /EMAIL_PATTERN/);
  assert.match(invite, /isUuid\(workspaceId\)/);
  assert.match(invite, /isEmail\(email\)/);
  assert.match(role, /isUuid\(userId\)/);
  assert.match(remove, /isUuid\(userId\)/);
  assert.match(profile, /fullName\.length > 200/);
});
