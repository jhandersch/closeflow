const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// Server-to-server callers: no browser session cookie, authenticated by signature or bearer secret.
const EXEMPT_PREFIXES = ["/api/stripe/webhook", "/api/cron/"];

type CsrfInput = {
  method: string;
  pathname: string;
  origin: string | null;
  host: string | null;
  secFetchSite: string | null;
  hasAuthorizationHeader: boolean;
};

/*
 * Defense in depth next to SameSite cookies: a browser-initiated write to /api
 * that comes from another site is rejected. Requests with an explicit
 * Authorization header are not ambient (cookie) credentials and pass.
 */
export function isCrossSiteApiWrite(input: CsrfInput) {
  const { method, pathname } = input;
  if (!WRITE_METHODS.has(method.toUpperCase())) return false;
  if (pathname !== "/api" && !pathname.startsWith("/api/")) return false;
  if (EXEMPT_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return false;
  if (input.hasAuthorizationHeader) return false;

  if (input.secFetchSite === "cross-site") return true;

  if (input.origin && input.host) {
    try {
      return new URL(input.origin).host !== input.host;
    } catch {
      return true;
    }
  }
  return false;
}
