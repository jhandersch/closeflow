import { NextResponse, type NextRequest } from "next/server";

import {
  BYPASS_COOKIE,
  bypassToken,
  isMaintenanceEnabled,
  isUsableBypassSecret,
  tokensMatch,
} from "@/lib/maintenance";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const secret = process.env.MAINTENANCE_BYPASS_SECRET;
  const form = await request.formData().catch(() => null);
  const password = String(form?.get("password") ?? "");

  const denied = () => NextResponse.redirect(new URL("/?access=denied", request.url), 303);

  if (!isMaintenanceEnabled(process.env.MAINTENANCE_MODE)) {
    return NextResponse.redirect(new URL("/", request.url), 303);
  }
  if (!isUsableBypassSecret(secret) || !password) return denied();

  const [given, expected] = await Promise.all([bypassToken(password), bypassToken(secret)]);
  if (!tokensMatch(given, expected)) return denied();

  const response = NextResponse.redirect(new URL("/", request.url), 303);
  response.cookies.set(BYPASS_COOKIE, expected, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
  return response;
}
