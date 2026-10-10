export function getUserFacingErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  const raw = typeof error === "string"
    ? error
    : error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error && typeof (error as { message?: unknown }).message === "string"
        ? (error as { message: string }).message
        : "";

  const message = raw.trim();
  if (!message) {
    return fallback;
  }

  const normalized = message.toLowerCase();

  if (/unauthorized|not authenticated|session expired|token expired|invalid login credentials/i.test(message)) {
    return "Please sign in again and try again.";
  }

  if (/too many requests|429|rate limit|timed out|timeout|fetch failed|failed to fetch|network|ecconnreset|econnrefused|temporarily unavailable|service unavailable/i.test(message)) {
    return "This request is temporarily unavailable. Please try again in a moment.";
  }

  if (/openai|ai service|chat completions|api key|model.*error/i.test(normalized)) {
    return "AI is temporarily unavailable. Please try again in a moment.";
  }

  if (/relation .* does not exist|column .* does not exist|schema cache|missing.*column|permission denied|duplicate key|database|supabase|postgres|connection pool|query failed/i.test(normalized)) {
    return "The data layer is temporarily unavailable. Please refresh and try again.";
  }

  if (/required|missing|invalid.*value|could not.*save|save failed|not found|already exists|invalid.*format/i.test(normalized)) {
    return message.length > 200 ? fallback : message;
  }

  return fallback;
}

export function getRetryableStatus(
  error: unknown,
  fallbackStatus = 500,
): number {
  const raw = typeof error === "string"
    ? error
    : error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error && typeof (error as { message?: unknown }).message === "string"
        ? (error as { message: string }).message
        : "";

  const normalized = raw.toLowerCase();

  if (/429|too many requests|rate limit|timed out|timeout|fetch failed|failed to fetch|network|ecconnreset|econnrefused|temporarily unavailable|service unavailable|openai|ai service/i.test(normalized)) {
    return 503;
  }

  return fallbackStatus;
}
