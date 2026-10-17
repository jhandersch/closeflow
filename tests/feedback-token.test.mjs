import assert from "node:assert/strict";
import test from "node:test";
import {
  createFeedbackToken,
  verifyFeedbackToken,
} from "../src/lib/feedbackToken.ts";

test("feedback tokens bind a public link to exactly one workspace", () => {
  const token = createFeedbackToken(
    "8b4d3c20-3e7c-4f2d-9b75-8e40ac1c75b1",
    "test-signing-secret",
  );

  assert.equal(
    verifyFeedbackToken(
      "8b4d3c20-3e7c-4f2d-9b75-8e40ac1c75b1",
      token,
      "test-signing-secret",
    ),
    true,
  );
  assert.equal(
    verifyFeedbackToken(
      "52b7dfd4-bd7a-4de3-9b9e-9a35650e1d29",
      token,
      "test-signing-secret",
    ),
    false,
  );
  assert.equal(
    verifyFeedbackToken(
      "8b4d3c20-3e7c-4f2d-9b75-8e40ac1c75b1",
      `${token.slice(0, -1)}x`,
      "test-signing-secret",
    ),
    false,
  );
});
