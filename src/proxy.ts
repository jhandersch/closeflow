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
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  if (isAllowedDuringMaintenance(pathname)) {
    return NextResponse.next();
  }

  const allowed = await hasBypass(
    {
      cookie: request.cookies.get(BYPASS_COOKIE)?.value,
      header: request.headers.get(BYPASS_HEADER),
    },
    process.env.MAINTENANCE_BYPASS_SECRET,
  );
  if (allowed) {
    return NextResponse.next();
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
