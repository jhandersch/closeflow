export const DEFAULT_MAX_BODY_BYTES = 1024 * 1024;

// Routes that legitimately receive large payloads (they enforce their own limits).
const LARGE_BODY_PREFIXES = [
  "/api/leads/import",
  "/api/customers/import",
  "/api/files",
  "/api/profile/avatar",
  "/api/stripe/webhook",
];

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export const isOversizedApiRequest = (
  method: string,
  pathname: string,
  contentLength: string | null,
  maxBytes: number = DEFAULT_MAX_BODY_BYTES,
): boolean => {
  if (!WRITE_METHODS.has(method.toUpperCase())) return false;
  if (pathname !== "/api" && !pathname.startsWith("/api/")) return false;
  if (LARGE_BODY_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) return false;
  if (!contentLength) return false;

  const bytes = Number(contentLength);
  return Number.isFinite(bytes) && bytes > maxBytes;
};
