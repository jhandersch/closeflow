import { NextResponse } from "next/server";

import { getRouteUser } from "@/lib/supabase/route";

export async function GET(request: Request) {
    const { supabase, user, error } =
        await getRouteUser(request);

    if (error || !user) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 },
        );
    }

    const { data: profile, error: profileError } =
        await supabase
            .from("profiles")
            .select(
                "id, full_name, username, company_name, avatar_url, role, language, created_at, updated_at",
            )
            .eq("id", user.id)
            .maybeSingle();

    if (profileError) {
        return NextResponse.json(
            { error: profileError.message },
            { status: 500 },
        );
    }

    const metadata = user.user_metadata || {};

    return NextResponse.json({
        id: user.id,
        email: user.email || "",
        name: profile?.full_name || "",
        username:
            profile?.username ||
            metadata.username ||
            "",
        company:
            profile?.company_name || "",
        avatar:
            profile?.avatar_url || "",
        role: profile?.role || "",
        phone: metadata.phone || "",
        timezone:
            metadata.timezone ||
            "Europe/Berlin",
        language:
            profile?.language ||
            metadata.language ||
            "en",
        created_at:
            profile?.created_at || null,
        updated_at:
            profile?.updated_at || null,
    });
}

export async function PATCH(request: Request) {
    const { supabase, user, error } =
        await getRouteUser(request);

    if (error || !user) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 },
        );
    }

    const body = await request.json();

    const fullName =
        typeof body.full_name === "string"
            ? body.full_name.trim()
            : typeof body.name === "string"
              ? body.name.trim()
              : "";

    const username =
        typeof body.username === "string"
            ? body.username.trim()
            : "";

    const avatar =
        typeof body.avatar_url === "string"
            ? body.avatar_url.trim()
            : typeof body.avatar === "string"
              ? body.avatar.trim()
              : "";

    const company =
        typeof body.company_name === "string"
            ? body.company_name.trim()
            : typeof body.company === "string"
              ? body.company.trim()
              : "";

    const phone =
        typeof body.phone === "string"
            ? body.phone.trim()
            : "";

    const timezone =
        typeof body.timezone === "string"
            ? body.timezone.trim()
            : "Europe/Berlin";

    const language =
        typeof body.language === "string"
            ? body.language.trim()
            : "en";

    const { error: updateError } =
        await supabase
            .from("profiles")
            .upsert({
                id: user.id,
                full_name: fullName,
                username,
                avatar_url: avatar,
                company_name: company,
                language,
            });

    if (updateError) {
        return NextResponse.json(
            { error: updateError.message },
            { status: 400 },
        );
    }

    const { error: authUpdateError } =
        await supabase.auth.updateUser({
            data: {
                name: fullName,
                full_name: fullName,
                username,
                avatar_url: avatar,
                company_name: company,
                phone,
                timezone,
                language,
            },
        });

    if (authUpdateError) {
        return NextResponse.json(
            { error: authUpdateError.message },
            { status: 400 },
        );
    }

    return NextResponse.json({
        ok: true,
        profile: {
            full_name: fullName,
            username,
            company_name: company,
            avatar_url: avatar,
            phone,
            timezone,
            language,
        },
    });
}