import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import test from "node:test";

const apiRoot = join(process.cwd(), "src", "app", "api");
const EXEMPT = new Map([["health/route.ts", "reads only whether OPENAI_API_KEY is configured; no provider call"]]);

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : name === "route.ts" ? [p] : [];
  });

const routes = walk(apiRoot).map((file) => ({
  file,
  rel: relative(apiRoot, file).replaceAll("\\", "/"),
  src: readFileSync(file, "utf8"),
}));

const callsProvider = (src) =>
  /from ["']openai["']|new OpenAI\(|api\.openai\.com|createTrackedOpenAI(Client|Fetch)/.test(src);
const aiRoutes = routes.filter((r) => callsProvider(r.src) && !EXEMPT.has(r.rel));

test("AI route discovery finds the known provider routes", () => {
  assert.ok(aiRoutes.length >= 12, `only ${aiRoutes.length} AI routes found`);
  for (const expected of ["ai/chat/route.ts", "sales-copilot/route.ts", "priority-analysis/route.ts"]) {
    assert.ok(aiRoutes.some((r) => r.rel === expected), `${expected} not discovered`);
  }
});

test("every AI route authenticates, resolves a workspace and enforces the AI quota", () => {
  for (const r of aiRoutes) {
    const shared = /requireAiWorkspaceQuota\(/.test(r.src);
    const manual =
      (/getRouteUser\(/.test(r.src) || /auth\.getUser\(/.test(r.src)) &&
      /enforceAndTrackUsageLimit\(/.test(r.src) &&
      (/loadWorkspaceForUser\(/.test(r.src) || /\.context\b/.test(r.src));
    assert.ok(shared || manual, `${r.rel}: missing auth + workspace + quota guard`);
  }
});

test("the shared AI guard rejects anonymous users and missing workspaces before the quota", () => {
  const src = readFileSync(join(process.cwd(), "src", "lib", "aiAccess.ts"), "utf8");
  const auth = src.indexOf("status: 401");
  const workspace = src.indexOf("status: 403");
  const quota = src.indexOf("enforceAndTrackUsageLimit(");
  assert.ok(auth > -1 && workspace > auth && quota > workspace, "guard order must be 401 -> 403 -> quota");
  assert.match(src, /"ai"/, "quota must be tracked under the ai metric");
});

test("every AI route records token cost telemetry", () => {
  for (const r of aiRoutes) {
    const recorded = /createTrackedOpenAI(Client|Fetch)\(/.test(r.src) || /recordAiUsageEvent\(/.test(r.src);
    assert.ok(recorded, `${r.rel}: provider call without cost tracking`);
  }
});

test("no AI route reads the provider key from the client or logs it", () => {
  for (const r of aiRoutes) {
    assert.ok(!/NEXT_PUBLIC_OPENAI/.test(r.src), `${r.rel}: public OpenAI key`);
    assert.ok(!/console\.\w+\([^)]*apiKey/.test(r.src), `${r.rel}: logs the API key`);
  }
});

test("exempt routes stay free of provider calls", () => {
  for (const rel of EXEMPT.keys()) {
    const r = routes.find((x) => x.rel === rel);
    assert.ok(r, `${rel} missing`);
    assert.ok(!/api\.openai\.com|new OpenAI\(|createTrackedOpenAI/.test(r.src), `${rel} now calls the provider`);
  }
});
