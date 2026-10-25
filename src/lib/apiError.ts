import { getUserFacingErrorMessage } from "@/lib/errorRecovery";

const MAX_MESSAGE_LENGTH = 200;

const TWO_FACTOR_MESSAGE =
  "2FA required for this action. Verify 2FA in Settings -> Security.";

function messageFromPayload(payload: unknown): string {
  if (typeof payload === "string") {
    return payload;
  }

  if (typeof payload !== "object" || payload === null) {
    return "";
  }

  const record = payload as { error?: unknown; message?: unknown };

  for (const candidate of [record.error, record.message]) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate;
    }

    if (typeof candidate === "object" && candidate !== null) {
      const nested = messageFromPayload(candidate);

      if (nested) {
        return nested;
      }
    }
  }

  return "";
}

/**
 * Turns anything that may carry an error (JSON text, `{ error: ... }`
 * payloads, Error objects) into one readable sentence for the user.
 */
export function toDisplayMessage(
  value: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  let message = "";

  if (typeof value === "string") {
    const text = value.trim();

    if (text.startsWith("{") || text.startsWith("[")) {
      try {
        message = messageFromPayload(JSON.parse(text));
      } catch {
        message = "";
      }
    } else if (!text.startsWith("<")) {
      message = text;
    }
  } else if (value instanceof Error) {
    return toDisplayMessage(value.message, fallback);
  } else {
    message = messageFromPayload(value);
  }

  message = message.trim();

  if (!message || message.length > MAX_MESSAGE_LENGTH) {
    return fallback;
  }

  if (/two-factor authentication required/i.test(message)) {
    return TWO_FACTOR_MESSAGE;
  }

  if (/row-level security|violates row-level|permission denied/i.test(message)) {
    return getUserFacingErrorMessage(message, fallback);
  }

  return message;
}

/**
 * Reads the body of a failed fetch response once and returns a plain
 * user-facing message, never raw JSON.
 */
export async function readApiError(
  response: Response,
  fallback: string,
): Promise<string> {
  let text = "";

  try {
    text = await response.text();
  } catch {
    return fallback;
  }

  return toDisplayMessage(text, fallback);
}
