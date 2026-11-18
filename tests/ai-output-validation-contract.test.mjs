import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("priority analysis validates the input object and model output shape", async () => {
  const source = await readFile(
    new URL("../src/app/api/priority-analysis/route.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /readJsonObject\(request\)/);
  assert.match(source, /Invalid request\./);
  assert.match(source, /isPriorityAnalysisResponse/);
  assert.match(source, /explanation\.length <= 4000/);
  assert.match(source, /nextAction\.length <= 1000/);
  assert.match(source, /typeof content !== "string"/);
  assert.match(source, /if \(!isPriorityAnalysisResponse\(parsed\)\)/);
});

test("follow-up email validates the input object and model output shape", async () => {
  const source = await readFile(
    new URL("../src/app/api/follow-up-ai/route.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /readJsonObject\(request\)/);
  assert.match(source, /isFollowUpEmailResponse/);
  assert.match(source, /subject\.length <= 200/);
  assert.match(source, /email\.length <= 12000/);
  assert.match(source, /if \(!response\.ok\)/);
  assert.match(source, /if \(!isFollowUpEmailResponse\(parsed\)\)/);
});

test("activity analysis and meeting prep validate model output shapes", async () => {
  const [activity, meetingPrep] = await Promise.all([
    readFile(new URL("../src/app/api/activity-ai/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/api/ai/meeting-prep/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(activity, /readJsonObject\(req\)/);
  assert.match(activity, /isActivityAnalysisResponse/);
  assert.match(activity, /confidence >= 0 && response\.confidence <= 1/);
  assert.match(meetingPrep, /readJsonObject\(request\)/);
  assert.match(meetingPrep, /isMeetingPrepResponse/);
  assert.match(meetingPrep, /isStringList/);
});

test("chat, sales copilot and lead follow-up outputs stay bounded", async () => {
  const [chat, sales, leadFollowUp, rewrite] = await Promise.all([
    readFile(new URL("../src/app/api/ai/chat/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/api/sales-copilot/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/api/leads/[id]/follow-up-ai/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/api/ai/email-rewrite/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(chat, /result\.answer\.length > 12000/);
  assert.match(chat, /source\.length <= 500/);
  assert.match(sales, /Sales copilot returned an invalid response/);
  assert.match(sales, /isSalesCopilotResponse/);
  assert.match(leadFollowUp, /Lead follow-up AI returned an invalid response/);
  assert.match(leadFollowUp, /value\.length <= \(key === "email" \? 12000 : 2000\)/);
  assert.match(rewrite, /result\.text\.length > MAX_TEXT_LENGTH/);
});

test("priority AI validates the complete response schema", async () => {
  const source = await readFile(
    new URL("../src/app/api/priority-ai/route.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /readJsonObject\(request\)/);
  assert.match(source, /isPriorityResponse/);
  assert.match(source, /result\.headline\.length <= 500/);
  assert.match(source, /result\.riskLevel === "Low"/);
  assert.match(source, /Azure OpenAI returned an invalid priority response/);
});
