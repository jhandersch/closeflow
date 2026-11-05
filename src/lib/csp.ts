export type CspOptions = {
  nonce: string;
  isDev?: boolean;
  supabaseUrl?: string | null;
};

const originOf = (value?: string | null) => {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

/**
 * Strict script policy: only scripts carrying the per-request nonce (and what
 * they load via 'strict-dynamic') run. Styles keep 'unsafe-inline' because React
 * style attributes cannot carry a nonce; script injection stays blocked.
 */
export function buildCsp({ nonce, isDev = false, supabaseUrl }: CspOptions) {
  const supabaseOrigin = originOf(supabaseUrl);
  const connect = ["'self'"];
  if (supabaseOrigin) {
    connect.push(supabaseOrigin, supabaseOrigin.replace(/^http/, "ws"));
  }
  if (isDev) connect.push("ws:", "http://localhost:*");

  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src ${connect.join(" ")}`,
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
  ];
  if (!isDev) directives.push("upgrade-insecure-requests");
  return directives.join("; ");
}

export function generateNonce() {
  return btoa(crypto.randomUUID());
}
