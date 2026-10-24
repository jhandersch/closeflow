import { NextResponse, type NextRequest } from "next/server";

const BYPASS_COOKIE = "cf_wip_bypass";
const BYPASS_PARAM = "wip_bypass";

// Platzhalterseite aktiv, bis WIP_MODE=off gesetzt wird.
const wipEnabled = () => (process.env.WIP_MODE || "").trim().toLowerCase() !== "off";

export function proxy(request: NextRequest) {
  if (!wipEnabled()) return NextResponse.next();

  const { pathname, searchParams } = request.nextUrl;
  if (pathname === "/wip") return NextResponse.next();

  const token = (process.env.WIP_BYPASS_TOKEN || "").trim();

  if (token && searchParams.get(BYPASS_PARAM) === token) {
    const clean = request.nextUrl.clone();
    clean.searchParams.delete(BYPASS_PARAM);
    const response = NextResponse.redirect(clean);
    response.cookies.set(BYPASS_COOKIE, token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  }

  if (token && request.cookies.get(BYPASS_COOKIE)?.value === token) {
    return NextResponse.next();
  }

  const target = request.nextUrl.clone();
  target.pathname = "/wip";
  target.search = "";
  return NextResponse.rewrite(target, {
    status: 503,
    headers: { "Retry-After": "86400", "X-Robots-Tag": "noindex, nofollow" },
  });
}

export const config = {
  matcher: [
    // API-Routen (Stripe-Webhook, Health, Cron) und statische Dateien bleiben erreichbar.
    "/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico|txt|xml|webmanifest)$).*)",
  ],
};
