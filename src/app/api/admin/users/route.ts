import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRouteUser, requireAal2 } from "@/lib/supabase/route";
import { isPlatformAdminUser } from "@/lib/platformAdmin";

export async function GET(request: Request) {
    const { supabase, user, error } = await getRouteUser(request);

    if (error || !user) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }

    if (!isPlatformAdminUser(user)) {
        return NextResponse.json(
            { error: "Forbidden" },
            { status: 403 }
        );
    }

    const authz = await requireAal2(request, supabase);

    if (!authz.ok) {
        return NextResponse.json(
            { error: authz.message },
            { status: authz.status }
        );
    }

    try {
        const admin = createAdminClient();

        const { data, error: usersError } =
            await admin.auth.admin.listUsers({
                page: 1,
                perPage: 100,
            });

        if (usersError) {
            console.error("ADMIN USER LIST ERROR:", usersError);

            return NextResponse.json(
                { error: "Could not load users" },
                { status: 500 }
            );
        }

        const users = (data.users || []).map((user) => ({
            id: user.id,
            email: user.email || null,
            created_at: user.created_at,
            last_sign_in_at: user.last_sign_in_at || null,
            email_confirmed_at: user.email_confirmed_at || null,
            banned_until: user.banned_until || null,
            user_metadata: {
                name: user.user_metadata?.name || null,
                username: user.user_metadata?.username || null,
                company_name: user.user_metadata?.company_name || null,
            },
            is_platform_admin: isPlatformAdminUser(user),
        }));

        return NextResponse.json({
            users,
            total: users.length,
        });
    } catch (error) {
        console.error("ADMIN USERS ERROR:", error);

        return NextResponse.json(
            { error: "Could not load users" },
            { status: 500 }
        );
    }
}