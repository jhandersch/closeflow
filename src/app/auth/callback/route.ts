import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
const sanitizeNextPath = (nextPath: string | null, baseUrl: string) => {
    if (!nextPath)
        return null;
    if (!nextPath.startsWith("/"))
        return null;
    if (nextPath.startsWith("//"))
        return null;
    try {
        if (new URL(nextPath, baseUrl).origin !== new URL(baseUrl).origin) {
            return null;
        }
    }
    catch {
        return null;
    }
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
        language: metadata.language === "en" ? "en" : "de",
        role: "owner",
    });
}
export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get("code");
    const type = requestUrl.searchParams.get("type");
    const oauthError = requestUrl.searchParams.get("error");
    const oauthErrorDescription = requestUrl.searchParams.get("error_description");
    const nextPath = sanitizeNextPath(requestUrl.searchParams.get("next"), request.url);
    const requestedLanguage = requestUrl.searchParams.get("language");
    if (oauthError) {
        return toLoginRedirect(request, nextPath, oauthErrorDescription ||
            oauthError);
    }
    const tokenHash = requestUrl.searchParams.get("token_hash");
    if (!code && !tokenHash) {
        return toLoginRedirect(request, nextPath, "Authentication callback without code");
    }
    const supabase = await createClient();
    /*
     * Email links with token_hash work on any device/browser, unlike the PKCE
     * code which needs the code verifier cookie of the browser that started the flow.
     */
    const emailOtpTypes = ["signup", "magiclink", "recovery", "invite", "email", "email_change"];
    let exchange;
    if (tokenHash) {
        if (!type || !emailOtpTypes.includes(type)) {
            return toLoginRedirect(request, nextPath, "Authentication code could not be verified");
        }
        const verified = await supabase.auth.verifyOtp({
            type: type as "signup" | "magiclink" | "recovery" | "invite" | "email" | "email_change",
            token_hash: tokenHash,
        });
        exchange = { data: { user: verified.data.user }, error: verified.error };
    }
    else {
        exchange = await supabase.auth.exchangeCodeForSession(code as string);
    }
    const { data: { user }, error: exchangeError } = exchange;
    if (exchangeError || !user) {
        return toLoginRedirect(
            request,
            nextPath,
            "Authentication code could not be verified",
        );
    }
    /*
     * PASSWORD RECOVERY
     *
     * Recovery must go to the reset-password
     * UI and must NOT go directly to the dashboard.
     */
    if (type === "recovery" || nextPath === "/login?mode=reset") {
        return NextResponse.redirect(new URL("/login?mode=reset", request.url));
    }
    let profileUser = user;
    if (requestedLanguage === "de" || requestedLanguage === "en") {
        const updatedUser = await supabase.auth.updateUser({
            data: { language: requestedLanguage },
        });
        if (!updatedUser.error && updatedUser.data.user) {
            profileUser = updatedUser.data.user;
        }
    }
    if (user) {
        await syncProfile(supabase, profileUser);
    }
    /*
     * Normal OAuth / authentication flow.
     */
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
