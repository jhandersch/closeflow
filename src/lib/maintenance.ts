export const BYPASS_COOKIE = "cf_maintenance_access";
export const BYPASS_HEADER = "x-maintenance-bypass";
const MIN_SECRET_LENGTH = 24;

export const isMaintenanceEnabled = (value: string | undefined) =>
  ["on", "1", "true", "yes"].includes((value ?? "").trim().toLowerCase());

export const isUsableBypassSecret = (
  secret: string | undefined,
): secret is string =>
  typeof secret === "string" && secret.length >= MIN_SECRET_LENGTH;

/** Only these stay reachable: health monitoring, secret-protected cron and signed Stripe webhooks. */
export const isAllowedDuringMaintenance = (pathname: string) =>
  pathname === "/api/health" ||
  pathname === "/api/stripe/webhook" ||
  pathname === "/api/cron" ||
  pathname.startsWith("/api/cron/");

export async function bypassToken(secret: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`closeflow-maintenance:${secret}`),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export function tokensMatch(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

export async function hasBypass(
  input: { cookie?: string | null; header?: string | null },
  secret: string | undefined,
) {
  if (!isUsableBypassSecret(secret)) return false;
  const expected = await bypassToken(secret);
  if (input.cookie && tokensMatch(input.cookie, expected)) return true;
  if (input.header && tokensMatch(await bypassToken(input.header), expected))
    return true;
  return false;
}

export const MAINTENANCE_API_BODY = {
  error: "CloseFlow is currently under maintenance. Please try again later.",
  maintenance: true,
};

export const ROBOTS_TXT = "User-agent: *\nDisallow: /\n";

export function maintenanceHtml() {
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>CloseFlow – in Arbeit</title>
<style>
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#0b1020;color:#e8ecf5;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
main{max-width:520px;text-align:center}
h1{font-size:28px;margin:0 0 12px}
p{line-height:1.6;color:#aab3c7;margin:8px 0}
.en{font-size:14px;opacity:.8;margin-top:20px}
</style>
</head>
<body>
<main>
<h1>CloseFlow ist in Arbeit</h1>
<p>Wir überarbeiten CloseFlow gerade und sind bald wieder für Sie da. Anmeldung und Registrierung sind in dieser Zeit nicht verfügbar.</p>
<p class="en">CloseFlow is currently under construction. Sign-in and sign-up are temporarily unavailable. We will be back soon.</p>
</main>
</body>
</html>`;
}
