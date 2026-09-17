import { NextResponse } from "next/server";

import {
    getRouteUser,
    loadWorkspaceForUser,
} from "@/lib/supabase/route";

const DEFAULT_TIMEZONE = "Europe/Berlin";

const allowedTypes = new Set([
    "created",
    "status_changed",
    "note_added",
    "email_sent",
    "call_completed",
    "task_created",
    "task_completed",
    "meeting_created",
    "meeting_updated",
    "meeting_completed",
    "meeting_deleted",
    "ai",
    "other",
]);

function getTimezoneOffsetMs(
    date: Date,
    timeZone: string,
) {
    const parts =
        new Intl.DateTimeFormat("en-US", {
            timeZone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hourCycle: "h23",
        }).formatToParts(date);

    const values = Object.fromEntries(
        parts
            .filter(
                (part) =>
                    part.type !== "literal",
            )
            .map((part) => [
                part.type,
                part.value,
            ]),
    );

    const localAsUTC = Date.UTC(
        Number(values.year),
        Number(values.month) - 1,
        Number(values.day),
        Number(values.hour),
        Number(values.minute),
        Number(values.second),
    );

    return (
        localAsUTC -
        date.getTime()
    );
}

function zonedLocalToISOString(
    value: string,
    timeZone: string,
) {
    const match =
        /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(
            value,
        );

    if (!match) {
        return null;
    }

    const [, year, month, day, hour, minute] =
        match;

    const wallClockUTC = Date.UTC(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        0,
    );

    let timestamp = wallClockUTC;

    for (let index = 0; index < 3; index += 1) {
        const offset =
            getTimezoneOffsetMs(
                new Date(timestamp),
                timeZone,
            );

        const nextTimestamp =
            wallClockUTC - offset;

        if (
            nextTimestamp ===
            timestamp
        ) {
            break;
        }

        timestamp = nextTimestamp;
    }

    return new Date(
        timestamp,
    ).toISOString();
}

function getUserTimezone(user: {
    user_metadata?: Record<
        string,
        unknown
    > | null;
}) {
    const savedTimezone =
        typeof user.user_metadata?.timezone ===
            "string" &&
        user.user_metadata.timezone.trim()
            ? user.user_metadata.timezone
            : DEFAULT_TIMEZONE;

    try {
        new Intl.DateTimeFormat(
            "en-US",
            {
                timeZone: savedTimezone,
            },
        );

        return savedTimezone;
    } catch {
        return DEFAULT_TIMEZONE;
    }
}

function getFromDate(
    filter: string,
    timeZone: string,
) {
    const now = new Date();

    if (filter === "today") {
        const parts =
            new Intl.DateTimeFormat(
                "en-CA",
                {
                    timeZone,
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                },
            ).formatToParts(now);

        const values =
            Object.fromEntries(
                parts
                    .filter(
                        (part) =>
                            part.type !==
                            "literal",
                    )
                    .map((part) => [
                        part.type,
                        part.value,
                    ]),
            );

        const localMidnight =
            `${values.year}-${values.month}-${values.day}T00:00`;

        const iso =
            zonedLocalToISOString(
                localMidnight,
                timeZone,
            );

        return iso
            ? new Date(iso)
            : new Date(
                  now.getTime(),
              );
    }

    if (filter === "week") {
        return new Date(
            now.getTime() -
                7 *
                    24 *
                    60 *
                    60 *
                    1000,
        );
    }

    return new Date(
        now.getTime() -
            30 *
                24 *
                60 *
                60 *
                1000,
    );
}

export async function POST(
    request: Request,
) {
    const {
        supabase,
        user,
        error,
    } = await getRouteUser(request);

    if (error || !user) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 },
        );
    }

    const { workspace } =
        await loadWorkspaceForUser(
            supabase,
            user.id,
        );

    if (!workspace?.id) {
        return NextResponse.json(
            { error: "Workspace required" },
            { status: 403 },
        );
    }

    try {
        const body =
            await request.json();

        const leadId =
            typeof body.lead_id ===
            "string"
                ? body.lead_id.trim()
                : typeof body.leadId ===
                    "string"
                    ? body.leadId.trim()
                    : "";

        const type =
            typeof body.type ===
                "string" &&
            allowedTypes.has(
                body.type,
            )
                ? body.type
                : "other";

        const title =
            typeof body.title ===
                "string" &&
            body.title.trim()
                ? body.title.trim()
                : typeof body.action ===
                    "string" &&
                  body.action.trim()
                    ? body.action.trim()
                    : "Activity updated";

        const description =
            typeof body.description ===
                "string" &&
            body.description.trim()
                ? body.description.trim()
                : null;

        const metadata =
            typeof body.metadata ===
                "object" &&
            body.metadata !== null
                ? body.metadata
                : {};

        if (!leadId) {
            return NextResponse.json(
                {
                    error:
                        "lead_id is required",
                },
                { status: 400 },
            );
        }

        const {
            data: lead,
            error: leadError,
        } = await supabase
            .from("leads")
            .select(
                "id, workspace_id",
            )
            .eq(
                "id",
                leadId,
            )
            .eq(
                "workspace_id",
                workspace.id,
            )
            .single();

        if (leadError || !lead) {
            return NextResponse.json(
                {
                    error:
                        "Lead not found",
                },
                { status: 404 },
            );
        }

        const {
            data: created,
            error: createError,
        } = await supabase
            .from("activities")
            .insert({
                workspace_id:
                    workspace.id,
                lead_id: leadId,
                user_id: user.id,
                type,
                title,
                description,
                action: title,
                metadata,
            })
            .select(
                "id, workspace_id, user_id, lead_id, type, title, description, action, metadata, created_at",
            )
            .single();

        if (createError) {
            return NextResponse.json(
                {
                    error:
                        createError.message,
                },
                { status: 500 },
            );
        }

        return NextResponse.json(
            created,
            { status: 201 },
        );
    } catch (requestError) {
        console.error(
            requestError,
        );

        return NextResponse.json(
            {
                error:
                    "Activity failed",
            },
            { status: 500 },
        );
    }
}

export async function GET(
    request: Request,
) {
    const {
        supabase,
        user,
        error,
    } = await getRouteUser(request);

    if (error || !user) {
        return NextResponse.json(
            {
                error: "Unauthorized",
            },
            { status: 401 },
        );
    }

    const { workspace } =
        await loadWorkspaceForUser(
            supabase,
            user.id,
        );

    if (!workspace?.id) {
        return NextResponse.json(
            [],
        );
    }

    try {
        const url =
            new URL(request.url);

        const filter =
            url.searchParams.get(
                "filter",
            ) || "month";

        const timeZone =
            getUserTimezone(user);

        const from =
            getFromDate(
                filter,
                timeZone,
            );

        const {
            data,
            error: queryError,
        } = await supabase
            .from("activities")
            .select(
                "id, workspace_id, user_id, lead_id, type, title, description, action, metadata, created_at",
            )
            .eq(
                "workspace_id",
                workspace.id,
            )
            .gte(
                "created_at",
                from.toISOString(),
            )
            .order(
                "created_at",
                {
                    ascending: false,
                },
            );

        if (queryError) {
            return NextResponse.json(
                {
                    error:
                        queryError.message,
                },
                { status: 500 },
            );
        }

        const normalized =
            (data || []).map(
                (row) => ({
                    ...row,
                    title:
                        row.title ||
                        row.action ||
                        "Activity updated",
                    description:
                        row.description ||
                        null,
                }),
            );

        return NextResponse.json(
            normalized,
        );
    } catch (requestError) {
        console.error(
            requestError,
        );

        return NextResponse.json(
            {
                error:
                    "Activity load failed",
            },
            { status: 500 },
        );
    }
}