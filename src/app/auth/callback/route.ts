import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const sanitizeNextPath = (nextPath: string | null) => {
  if (!nextPath) return null
  if (!nextPath.startsWith("/")) return null
  if (nextPath.startsWith("//")) return null
  return nextPath
}

const toLoginRedirect = (request: NextRequest, nextPath: string | null, oauthError: string) => {
  const loginUrl = new URL("/login", request.url)

  if (nextPath) {
    loginUrl.searchParams.set("next", nextPath)
  }

  loginUrl.searchParams.set("oauthError", oauthError)
  return NextResponse.redirect(loginUrl)
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const oauthError = requestUrl.searchParams.get("error")
  const oauthErrorDescription = requestUrl.searchParams.get("error_description")
  const nextPath = sanitizeNextPath(requestUrl.searchParams.get("next"))

  if (oauthError) {
    return toLoginRedirect(request, nextPath, oauthErrorDescription || oauthError)
  }

  if (!code) {
    return toLoginRedirect(request, nextPath, "OAuth callback without code")
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return toLoginRedirect(request, nextPath, error.message || "OAuth sign-in failed")
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let destination = nextPath || "/dashboard"

  if (user && !user.user_metadata?.onboarding_completed) {
    destination = nextPath ? `/onboarding?next=${encodeURIComponent(nextPath)}` : "/onboarding"
  }

  return NextResponse.redirect(new URL(destination, request.url))
}
