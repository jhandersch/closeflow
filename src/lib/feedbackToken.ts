import { createHmac, timingSafeEqual } from "node:crypto";

const getTokenSecret = (secret = process.env.SUPABASE_SERVICE_ROLE_KEY) => {
  if (!secret) {
    throw new Error("Feedback token signing is not configured");
  }

  return secret;
};

export const createFeedbackToken = (
  workspaceId: string,
  secret?: string,
) =>
  createHmac("sha256", getTokenSecret(secret))
    .update(`closeflow-feedback:${workspaceId}`)
    .digest("base64url");

export const verifyFeedbackToken = (
  workspaceId: string,
  token: string,
  secret?: string,
) => {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
    return false;
  }

  const expected = Buffer.from(createFeedbackToken(workspaceId, secret));
  const actual = Buffer.from(token);

  return actual.length === expected.length && timingSafeEqual(actual, expected);
};
