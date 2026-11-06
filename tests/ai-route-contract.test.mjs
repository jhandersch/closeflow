import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import test from "node:test";

const apiRoot = join(process.cwd(), "src", "app", "api");
const EXEMPT = new Map([["health/route.ts", "checks Azure OpenAI configuration; no provider call"]]);

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
  /createTrackedAzureOpenAI(Client|Fetch)\(/.test(src);
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
    const recorded = /createTrackedAzureOpenAI(Client|Fetch)\(/.test(r.src) || /recordAiUsageEvent\(/.test(r.src);
    assert.ok(recorded, `${r.rel}: provider call without cost tracking`);
  }
});

test("no AI route reads the provider key from the client or logs it", () => {
  for (const r of aiRoutes) {
    assert.ok(!/NEXT_PUBLIC_OPENAI/.test(r.src), `${r.rel}: public OpenAI key`);
    assert.ok(!/NEXT_PUBLIC_AZURE_OPENAI/.test(r.src), `${r.rel}: public Azure OpenAI key`);
    assert.ok(!/console\.\w+\([^)]*apiKey/.test(r.src), `${r.rel}: logs the API key`);
  }
});

test("exempt routes stay free of provider calls", () => {
  for (const rel of EXEMPT.keys()) {
    const r = routes.find((x) => x.rel === rel);
    assert.ok(r, `${rel} missing`);
    assert.ok(!/createTrackedAzureOpenAI(Client|Fetch)\(/.test(r.src), `${rel} now calls the provider`);
  }
});

test("AI API routes use Azure endpoints and no direct OpenAI provider configuration", () => {
  for (const r of aiRoutes) {
    assert.ok(!/OPENAI_API_KEY|api\.openai\.com|createTrackedOpenAI/.test(r.src), `${r.rel}: OpenAI configuration remains`);
  }
});

test("the shared provider transport applies the injection guard and clamps requests", () => {
  const src = readFileSync(join(process.cwd(), "src", "lib", "aiCost.ts"), "utf8");
  assert.match(src, /url\.includes\("\/chat\/completions"\)[\s\S]*?withAiInjectionGuard\(init\)/);
  assert.match(src, /MAX_AI_COMPLETION_TOKENS\s*=\s*1200/);
  assert.match(src, /MAX_AI_REQUEST_CHARS\s*=\s*256\s*\*\s*1024/);
  assert.match(src, /server-side authorization/);
});

test("chat lead context is verified in the authorized workspace and is not retained redundantly", () => {
  const route = routes.find((r) => r.rel === "ai/chat/route.ts");
  assert.ok(route);
  const leadLookup = route.src.indexOf('.from("leads")');
  const providerCall = route.src.indexOf("createTrackedAzureOpenAIClient(");
  assert.ok(leadLookup > -1 && providerCall > leadLookup, "lead access must be checked before the provider call");
  assert.match(route.src.slice(leadLookup, providerCall), /\.eq\("workspace_id",\s*workspace\.id\)/);
  assert.ok(!route.src.includes('.from("ai_conversations")'), "do not persist duplicate prompt and response content");
});

test("customer email generation sends an allowlisted lead context and excludes internal deal costs", () => {
  const route = routes.find((r) => r.rel === "ai/email-generator/route.ts");
  assert.ok(route);
  assert.match(route.src, /name: textField\(sourceLead\.name/);
  assert.match(route.src, /notes: textField\(sourceLead\.notes/);
  assert.match(route.src, /JSON\.stringify\(lead\)/);
  assert.ok(!route.src.includes("formatPersonalDealCostsForLead"));
  assert.match(route.src, /MAX_OUTPUT_LENGTH/);
});
