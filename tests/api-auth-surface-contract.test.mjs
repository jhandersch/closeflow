import assert from "node:assert/strict";
import test from "node:test";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../src/app/api/", import.meta.url));
const publicRoutes = new Set([
  "health/route.ts",
  "feedback/route.ts",
  "stripe/webhook/route.ts",
  "cron/alerts/route.ts",
  "cron/automations/route.ts",
  "cron/notifications/route.ts",
]);

async function findRoutes(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const routes = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) routes.push(...await findRoutes(path));
    else if (entry.name === "route.ts") routes.push(path);
  }
  return routes;
}

test("API route surface has an explicit authentication marker", async () => {
  const routes = await findRoutes(root);
  const unaudited = [];
  for (const route of routes) {
    const source = await readFile(route, "utf8");
    const routeName = relative(root, route).replaceAll("\\", "/");
    if (
      publicRoutes.has(routeName) ||
      /getRouteUser|auth\.getUser|requireAiWorkspaceQuota|CRON_SECRET|stripe-signature|verifyFeedbackToken/.test(source)
    ) {
      continue;
    }
    unaudited.push(routeName);
  }
  assert.deepEqual(unaudited, []);
});
