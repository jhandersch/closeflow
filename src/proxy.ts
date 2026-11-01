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

const hardenedHeaders = {
  "Cache-Control": "no-store",
  "Retry-After": "3600",
  "X-Robots-Tag": "noindex, nofollow",
};

export async function proxy(request: NextRequest) {
  if (!isMaintenanceEnabled(process.env.MAINTENANCE_MODE)) {
    return NextResponse.next();
  }

  const { pathname, searchParams } = request.nextUrl;

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

  return new NextResponse(maintenanceHtml(searchParams.get("access") === "denied"), {
    status: 503,
    headers: { "Content-Type": "text/html; charset=utf-8", ...hardenedHeaders },
  });
}

export const config = {
  matcher: "/:path*",
};
