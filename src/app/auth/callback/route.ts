import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
const sanitizeNextPath = (nextPath: string | null) => {
    if (!nextPath)
        return null;
    if (!nextPath.startsWith("/"))
        return null;
    if (nextPath.startsWith("//"))
        return null;
    return nextPath;
};
const toLoginRedirect = (request: NextRequest, nextPath: string | null, oauthError: string) => {
    const loginUrl = new URL("/login", request.url);
    if (nextPath) {
        loginUrl.searchParams.set("next", nextPath);
    }
    loginUrl.searchParams.set("oauthError", oauthError);
    return NextResponse.redirect(loginUrl);
};
async function syncProfile(supabase: any, user: any) {
    const metadata = user.user_metadata || {};
    await supabase
        .from("profiles")
        .upsert({
        id: user.id,
        full_name: metadata.full_name ||
            metadata.name ||
            "",
        username: metadata.username ||
            "",
        company_name: metadata.company_name ||
            "",
        avatar_url: metadata.avatar_url ||
            metadata.picture ||
            "",
        language: "en",
        role: "owner",
    });
}
export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get("code");
    const type = requestUrl.searchParams.get("type");
    const oauthError = requestUrl.searchParams.get("error");
    const oauthErrorDescription = requestUrl.searchParams.get("error_description");
    const nextPath = sanitizeNextPath(requestUrl.searchParams.get("next"));
    if (oauthError) {
        return toLoginRedirect(request, nextPath, oauthErrorDescription ||
            oauthError);
    }
    if (!code) {
        return toLoginRedirect(request, nextPath, "Authentication callback without code");
    }
    const supabase = await createClient();
    const { data: { user }, } = await supabase.auth.getUser();
    if (user) {
        await syncProfile(supabase, user);
    }
    /*
     * PASSWORD RECOVERY
     *
     * Recovery must go to the reset-password
     * UI and must NOT go directly to the dashboard.
     */
    if (type === "recovery") {
        return NextResponse.redirect(new URL("/login?mode=reset", request.url));
    }
    /*
     * Normal OAuth / authentication flow.
     */
    const isPasswordRecovery = type === "recovery" ||
        nextPath === "/login?mode=reset";
    if (isPasswordRecovery) {
        return NextResponse.redirect(new URL("/login?mode=reset", request.url));
    }
    let destination = nextPath ||
        "/dashboard";
    if (user &&
        !user.user_metadata
            ?.onboarding_completed) {
        destination = nextPath
            ? `/onboarding?next=${encodeURIComponent(nextPath)}`
            : "/onboarding";
    }
    return NextResponse.redirect(new URL(destination, request.url));
}
