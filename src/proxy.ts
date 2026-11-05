import { NextResponse, type NextRequest } from "next/server";

import {
  BYPASS_COOKIE,
  BYPASS_HEADER,
  MAINTENANCE_API_BODY,
  ROBOTS_TXT,
  hasBypass,
  isAllowedDuringMaintenance,
  isMaintenanceEnabled,
  maintenanceHtml,
} from "./lib/maintenance";
import { isOversizedApiRequest } from "./lib/inputLimits";
import { isCrossSiteApiWrite } from "./lib/csrf";

import { buildCsp, generateNonce } from "./lib/csp";

// Pages get a per-request nonce CSP; API routes return JSON and keep the static headers.
function withCsp(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/api" || pathname.startsWith("/api/")) {
    return NextResponse.next();
  }
  const nonce = generateNonce();
  const csp = buildCsp({
    nonce,
    isDev: process.env.NODE_ENV === "development",
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  });
  // CSP_REPORT_ONLY=1 lets a rollout observe violations in the browser console without blocking.
  const headerName = process.env.CSP_REPORT_ONLY === "1" ? "Content-Security-Policy-Report-Only" : "Content-Security-Policy";
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set(headerName, csp);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set(headerName, csp);
  return response;
}
const hardenedHeaders = {
  "Cache-Control": "no-store",
  "Retry-After": "3600",
  "X-Robots-Tag": "noindex, nofollow",
};

export async function proxy(request: NextRequest) {
  if (isOversizedApiRequest(request.method, request.nextUrl.pathname, request.headers.get("content-length"))) {
    return NextResponse.json({ error: "Request body too large" }, { status: 413 });
  }

  if (
    isCrossSiteApiWrite({
      method: request.method,
      pathname: request.nextUrl.pathname,
      origin: request.headers.get("origin"),
      host: request.headers.get("x-forwarded-host") ?? request.headers.get("host"),
      secFetchSite: request.headers.get("sec-fetch-site"),
      hasAuthorizationHeader: request.headers.has("authorization"),
    })
  ) {
    return NextResponse.json({ error: "Cross-site request blocked" }, { status: 403 });
  }

  if (!isMaintenanceEnabled(process.env.MAINTENANCE_MODE)) {
    return withCsp(request);
  }

  const { pathname } = request.nextUrl;

  if (isAllowedDuringMaintenance(pathname)) {
    return withCsp(request);
  }

  const allowed = await hasBypass(
    {
      cookie: request.cookies.get(BYPASS_COOKIE)?.value,
      header: request.headers.get(BYPASS_HEADER),
    },
    process.env.MAINTENANCE_BYPASS_SECRET,
  );
  if (allowed) {
    return withCsp(request);
  }

  if (pathname === "/robots.txt") {
    return new NextResponse(ROBOTS_TXT, {
      status: 200,
      headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" },
    });
  }

  if (pathname === "/api" || pathname.startsWith("/api/")) {
    return NextResponse.json(MAINTENANCE_API_BODY, { status: 503, headers: hardenedHeaders });
  }

  return new NextResponse(maintenanceHtml(), {
    status: 503,
    headers: { "Content-Type": "text/html; charset=utf-8", ...hardenedHeaders },
  });
}

export const config = {
  matcher: "/:path*",
};
