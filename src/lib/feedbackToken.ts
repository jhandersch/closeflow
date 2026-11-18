import { translateText } from "@/lib/i18n";
import { createHmac, timingSafeEqual } from "node:crypto";

export const FEEDBACK_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const getTokenSecret = (secret = process.env.SUPABASE_SERVICE_ROLE_KEY) => {
  if (!secret) {
    throw new Error(translateText("Feedback token signing is not configured"));
  }

  return secret;
};

export const createFeedbackToken = (
  workspaceId: string,
  secret?: string,
  now = Date.now(),
) => {
  const expiresAt = now + FEEDBACK_TOKEN_TTL_MS;
  const signature = createHmac("sha256", getTokenSecret(secret))
    .update(`closeflow-feedback:${workspaceId}:${expiresAt}`)
    .digest("base64url");
  return `${expiresAt}.${signature}`;
};

export const verifyFeedbackToken = (
  workspaceId: string,
  token: string,
  secret?: string,
  now = Date.now(),
) => {
  const separator = token.indexOf(".");
  if (separator <= 0 || separator === token.length - 1) {
    return false;
  }
  const expiresAt = Number(token.slice(0, separator));
  const signature = token.slice(separator + 1);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= now || !/^[A-Za-z0-9_-]{43}$/.test(signature)) {
    return false;
  }
  const expected = Buffer.from(
    createHmac("sha256", getTokenSecret(secret))
      .update(`closeflow-feedback:${workspaceId}:${expiresAt}`)
      .digest("base64url"),
  );
  const actual = Buffer.from(signature);

  return actual.length === expected.length && timingSafeEqual(actual, expected);
};
