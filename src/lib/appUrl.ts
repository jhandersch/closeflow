const isLocalhost = (value: string) =>
  /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/i.test(value);

/*
 * Base URL for Stripe return links. In production, localhost values from
 * the environment are ignored and the request origin is used instead.
 */
export function getAppBaseUrl(request: Request) {
  const configured = (process.env.NEXT_PUBLIC_SITE_URL || "").trim().replace(/\/$/, "");
  const production = process.env.NODE_ENV === "production";

  if (configured && !(production && isLocalhost(configured))) {
    return configured;
  }

  if (production) {
    return new URL(request.url).origin;
  }

  return "http://localhost:3000";
}

export function resolveReturnUrl(
  request: Request,
  override: string | undefined,
  path: string
) {
  const value = (override || "").trim();

  if (value && !(process.env.NODE_ENV === "production" && isLocalhost(value))) {
    return value;
  }

  return `${getAppBaseUrl(request)}${path}`;
}
