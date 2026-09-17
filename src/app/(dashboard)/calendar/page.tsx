"use client";

import {
    useEffect,
    useMemo,
    useState,
    type ComponentType,
} from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabase/client";
import {
    Plus,
    X,
    Calendar,
    Users,
    Trash2,
} from "lucide-react";

type CalendarEvent = {
    id: string;
    type: "calendar_event";
    activityType: "meeting";
    title: string;
    description: string | null;
    date: string;
    leadId: string | null;
    status: "scheduled" | "completed" | "cancelled";
};

const DEFAULT_TIMEZONE = "Europe/Berlin";

const typeIcon: Record<
    string,
    ComponentType<{
        size?: number;
        className?: string;
    }>
> = {
    meeting: Users,
};

const typeColor: Record<string, string> = {
    meeting:
        "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
};

const getBrowserTimezone = () => {
    if (typeof Intl === "undefined") {
        return DEFAULT_TIMEZONE;
    }

    return (
        Intl.DateTimeFormat().resolvedOptions()
            .timeZone || DEFAULT_TIMEZONE
    );
};

const isValidTimezone = (
    timezone: string,
): boolean => {
    try {
        new Intl.DateTimeFormat("en-US", {
            timeZone: timezone,
        }).format();

        return true;
    } catch {
        return false;
    }
};

const getTimezoneParts = (
    date: Date,
    timezone: string,
) => {
    const formatter = new Intl.DateTimeFormat(
        "en-US",
        {
            timeZone: timezone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hourCycle: "h23",
        },
    );

    const parts = formatter.formatToParts(date);

    const get = (type: string) =>
        Number(
            parts.find(
                (part) =>
                    part.type === type,
            )?.value || 0,
        );

    return {
        year: get("year"),
        month: get("month"),
        day: get("day"),
        hour: get("hour"),
        minute: get("minute"),
        second: get("second"),
    };
};

const getTimezoneOffsetMs = (
    date: Date,
    timezone: string,
) => {
    const parts = getTimezoneParts(
        date,
        timezone,
    );

    const asUtc = Date.UTC(
        parts.year,
        parts.month - 1,
        parts.day,
        parts.hour,
        parts.minute,
        parts.second,
    );

    return asUtc - date.getTime();
};

const zonedLocalToISOString = (
    value: string,
    timezone: string,
) => {
    if (!value) return "";

    const [datePart, timePart = "00:00"] =
        value.split("T");

    const [year, month, day] =
        datePart.split("-").map(Number);

    const [hour, minute] =
        timePart.split(":").map(Number);

    let guess = new Date(
        Date.UTC(
            year,
            month - 1,
            day,
            hour,
            minute,
            0,
        ),
    );

    for (let i = 0; i < 2; i += 1) {
        const offset = getTimezoneOffsetMs(
            guess,
            timezone,
        );

        guess = new Date(
            Date.UTC(
                year,
                month - 1,
                day,
                hour,
                minute,
                0,
            ) - offset,
        );
    }

    return guess.toISOString();
};

const formatForDateTimeLocal = (
    iso: string,
    timezone: string,
) => {
    const date = new Date(iso);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    const parts = getTimezoneParts(
        date,
        timezone,
    );

    return [
        `${parts.year}`.padStart(4, "0"),
        `${parts.month}`.padStart(2, "0"),
        `${parts.day}`.padStart(2, "0"),
    ].join("-") +
        "T" +
        [
            `${parts.hour}`.padStart(2, "0"),
            `${parts.minute}`.padStart(2, "0"),
        ].join(":");
};

    const formatDate = (
        dateKey: string,
        locale: string,
        _timezone: string,
    ) => {
        const [year, month, day] =
            dateKey.split("-").map(Number);

        const date = new Date(
            Date.UTC(
                year,
                month - 1,
                day,
            ),
        );

        return new Intl.DateTimeFormat(
            locale,
            {
                timeZone: "UTC",
                weekday: "short",
                month: "short",
                day: "numeric",
            },
        ).format(date);
    };

const formatTime = (
    iso: string,
    locale: string,
    timezone: string,
) => {
    const date = new Date(iso);

    const hourString =
        new Intl.DateTimeFormat("en-US", {
            timeZone: timezone,
            hour: "2-digit",
            minute: "2-digit",
            hourCycle: "h23",
        }).format(date);

    if (hourString === "00:00") {
        return "All day";
    }

    return date.toLocaleTimeString(
        locale,
        {
            timeZone: timezone,
            hour: "2-digit",
            minute: "2-digit",
        },
    );
};

const getDateKey = (
    iso: string,
    timezone: string,
) => {
    const parts = getTimezoneParts(
        new Date(iso),
        timezone,
    );

    return [
        `${parts.year}`.padStart(4, "0"),
        `${parts.month}`.padStart(2, "0"),
        `${parts.day}`.padStart(2, "0"),
    ].join("-");
};

const getTodayKey = (
    timezone: string,
) => {
    return getDateKey(
        new Date().toISOString(),
        timezone,
    );
};

const groupByDate = (
    events: CalendarEvent[],
    timezone: string,
) => {
    const map = new Map<
        string,
        CalendarEvent[]
    >();

    for (const event of events) {
        const date = getDateKey(
            event.date,
            timezone,
        );

        if (!map.has(date)) {
            map.set(date, []);
        }

        map.get(date)!.push(event);
    }

    return map;
};

export default function CalendarPage() {
    const locale = "en-US";

    const [events, setEvents] = useState<
        CalendarEvent[]
    >([]);
    const [loading, setLoading] =
        useState(true);
    const [showNew, setShowNew] =
        useState(false);
    const [
        editingEvent,
        setEditingEvent,
    ] =
        useState<CalendarEvent | null>(
            null,
        );
    const [newTitle, setNewTitle] =
        useState("");
    const [newDate, setNewDate] =
        useState("");
    const [newDesc, setNewDesc] =
        useState("");
    const [creating, setCreating] =
        useState(false);
    const [savingEdit, setSavingEdit] =
        useState(false);
    const [timezone, setTimezone] =
        useState(DEFAULT_TIMEZONE);

    useEffect(() => {
        const loadTimezone = async () => {
            const {
                data: { user },
            } =
                await supabase.auth.getUser();

            const metadata =
                user?.user_metadata || {};

            const storedTimezone =
                metadata.timezone;

            if (
                typeof storedTimezone ===
                    "string" &&
                isValidTimezone(
                    storedTimezone,
                )
            ) {
                setTimezone(
                    storedTimezone,
                );
                return;
            }

            const browserTimezone =
                getBrowserTimezone();

            setTimezone(
                isValidTimezone(
                    browserTimezone,
                )
                    ? browserTimezone
                    : DEFAULT_TIMEZONE,
            );
        };

        void loadTimezone();
    }, []);

    const getHeaders = async () => {
        const {
            data: { session },
        } =
            await supabase.auth.getSession();

        const headers: Record<
            string,
            string
        > = {
            "Content-Type":
                "application/json",
        };

        if (session?.access_token) {
            headers.Authorization =
                `Bearer ${session.access_token}`;
        }

        return headers;
    };

    const load = async () => {
        setLoading(true);

        try {
            const response = await fetch(
                "/api/calendar/events",
                {
                    headers:
                        await getHeaders(),
                    credentials:
                        "include",
                },
            );

            if (response.ok) {
                const data =
                    await response.json();

                const calendarEvents =
                    (data.events ||
                        []) as CalendarEvent[];

                setEvents(
                    calendarEvents,
                );
            }
        } catch (error) {
            console.error(error);
            toast.error(
                "Could not load calendar.",
            );
        }

        setLoading(false);
    };

    useEffect(() => {
        void load();
    }, []);

    const resetForm = () => {
        setNewTitle("");
        setNewDesc("");
        setNewDate(
            formatForDateTimeLocal(
                new Date().toISOString(),
                timezone,
            ),
        );
    };

    const createMeeting = async () => {
        if (!newTitle.trim()) {
            toast.error("Title missing.");
            return;
        }

        if (!newDate) {
            toast.error(
                "Date and time missing.",
            );
            return;
        }

        setCreating(true);

        const response = await fetch(
            "/api/calendar/events",
            {
                method: "POST",
                headers:
                    await getHeaders(),
                credentials:
                    "include",
                body: JSON.stringify({
                    title: newTitle.trim(),
                    scheduled_at:
                        zonedLocalToISOString(
                            newDate,
                            timezone,
                        ),
                    description:
                        newDesc.trim() ||
                        null,
                }),
            },
        );

        if (response.ok) {
            toast.success(
                "Meeting created.",
            );

            setShowNew(false);
            resetForm();
            await load();
        } else {
            const data =
                await response
                    .json()
                    .catch(() => null);

            toast.error(
                data?.error ||
                    "Creation failed.",
            );
        }

        setCreating(false);
    };

    const startEdit = (
        event: CalendarEvent,
    ) => {
        setEditingEvent(event);
        setNewTitle(event.title);
        setNewDesc(
            event.description || "",
        );
        setNewDate(
            formatForDateTimeLocal(
                event.date,
                timezone,
            ),
        );
    };

    const saveEdit = async () => {
        if (!editingEvent) return;

        if (!newTitle.trim()) {
            toast.error("Title missing.");
            return;
        }

        if (!newDate) {
            toast.error(
                "Date and time missing.",
            );
            return;
        }

        setSavingEdit(true);

        const response = await fetch(
            "/api/calendar/events",
            {
                method: "PUT",
                headers:
                    await getHeaders(),
                credentials:
                    "include",
                body: JSON.stringify({
                    id: editingEvent.id,
                    title: newTitle.trim(),
                    description:
                        newDesc.trim() ||
                        null,
                    scheduled_at:
                        zonedLocalToISOString(
                            newDate,
                            timezone,
                        ),
                }),
            },
        );

        if (response.ok) {
            toast.success(
                "Meeting updated.",
            );

            setEditingEvent(null);
            resetForm();
            await load();
        } else {
            toast.error("Save failed.");
        }

        setSavingEdit(false);
    };

    const deleteEvent = async (
        id: string,
    ) => {
        const confirmed =
            window.confirm(
                "Delete meeting?",
            );

        if (!confirmed) return;

        const response = await fetch(
            `/api/calendar/events?id=${id}`,
            {
                method: "DELETE",
                headers:
                    await getHeaders(),
                credentials:
                    "include",
            },
        );

        if (response.ok) {
            toast.success(
                "Meeting deleted.",
            );

            setEvents((prev) =>
                prev.filter(
                    (event) =>
                        event.id !== id,
                ),
            );
        } else {
            const data =
                await response
                    .json()
                    .catch(() => null);

            toast.error(
                data?.error ||
                    "Delete failed.",
            );
        }
    };

    const grouped = useMemo(
        () =>
            groupByDate(
                events,
                timezone,
            ),
        [events, timezone],
    );

    const sortedDays = useMemo(
        () =>
            Array.from(
                grouped.keys(),
            ).sort(),
        [grouped],
    );

    const today = useMemo(
        () => getTodayKey(timezone),
        [timezone],
    );

    return (
        <AuthGuard>
            <div className="mx-auto max-w-4xl space-y-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-sm uppercase tracking-[0.24em] text-cyan-400">
                            {"Calendar"}
                        </p>

                        <h1 className="mt-2 text-3xl font-bold text-foreground">
                            {"Meetings"}
                        </h1>

                        <p className="mt-1 text-sm text-foreground/60">
                            {events.length}{" "}
                            {"scheduled meetings"}
                        </p>

                        <p className="mt-1 text-xs text-foreground/45">
                            {timezone}
                        </p>
                    </div>

                    <button
                        onClick={() => {
                            resetForm();
                            setEditingEvent(
                                null,
                            );
                            setShowNew(true);
                        }}
                        className="flex items-center gap-2 rounded-2xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white"
                    >
                        <Plus size={15} />
                        {"New Meeting"}
                    </button>
                </div>

                {(showNew ||
                    editingEvent) && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
                        <div className="w-full max-w-md rounded-3xl border border-border-subtle bg-surface-1 p-6">
                            <div className="mb-5 flex justify-between">
                                <h2 className="font-semibold text-foreground">
                                    {editingEvent
                                        ? "Edit meeting"
                                        : "Create meeting"}
                                </h2>

                                <button
                                    onClick={() => {
                                        setShowNew(false);
                                        setEditingEvent(
                                            null,
                                        );
                                    }}
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="space-y-3">
                                <input
                                    value={newTitle}
                                    onChange={(
                                        event,
                                    ) =>
                                        setNewTitle(
                                            event
                                                .target
                                                .value,
                                        )
                                    }
                                    placeholder="Title"
                                    className="w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-2.5 text-foreground"
                                />

                                <label className="block">
                                    <span className="mb-1 block text-xs text-foreground/55">
                                        Date & Time
                                    </span>

                                    <input
                                        type="datetime-local"
                                        value={
                                            newDate
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            setNewDate(
                                                event
                                                    .target
                                                    .value,
                                            )
                                        }
                                        className="w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-2.5 text-foreground"
                                    />

                                    <span className="mt-1 block text-xs text-foreground/45">
                                        Time zone:{" "}
                                        {
                                            timezone
                                        }
                                    </span>
                                </label>

                                <textarea
                                    value={newDesc}
                                    onChange={(
                                        event,
                                    ) =>
                                        setNewDesc(
                                            event
                                                .target
                                                .value,
                                        )
                                    }
                                    placeholder="Description"
                                    rows={3}
                                    className="w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-2.5 text-foreground"
                                />
                            </div>

                            <div className="mt-5 flex justify-end gap-2">
                                <button
                                    onClick={() => {
                                        setShowNew(false);
                                        setEditingEvent(
                                            null,
                                        );
                                    }}
                                    className="rounded-xl border border-border-subtle px-4 py-2 text-foreground/75"
                                >
                                    {"Cancel"}
                                </button>

                                <button
                                    disabled={
                                        creating ||
                                        savingEdit
                                    }
                                    onClick={() =>
                                        editingEvent
                                            ? void saveEdit()
                                            : void createMeeting()
                                    }
                                    className="rounded-xl bg-cyan-600 px-5 py-2 text-white"
                                >
                                    {creating ||
                                    savingEdit
                                        ? "..."
                                        : "Save"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {loading && (
                    <p className="text-sm text-foreground/60">
                        {"Loading calendar..."}
                    </p>
                )}

                <div className="space-y-6">
                    {sortedDays.map(
                        (day) => {
                            const dayEvents =
                                grouped.get(
                                    day,
                                ) || [];

                            const isToday =
                                day ===
                                today;

                            return (
                                <div
                                    key={day}
                                >
                                    <h3
                                        className={`mb-3 font-semibold ${
                                            isToday
                                                ? "text-cyan-300"
                                                : "text-foreground"
                                        }`}
                                    >
                                        {isToday
                                            ? `Today - ${formatDate(
                                                  day,
                                                  locale,
                                                  timezone,
                                              )}`
                                            : formatDate(
                                                  day,
                                                  locale,
                                                  timezone,
                                              )}
                                    </h3>

                                    <div className="space-y-3">
                                        {dayEvents.map(
                                            (
                                                event,
                                            ) => {
                                                const Icon =
                                                    typeIcon[
                                                        event
                                                            .activityType
                                                    ] ||
                                                    Calendar;

                                                const color =
                                                    typeColor[
                                                        event
                                                            .activityType
                                                    ] ||
                                                    typeColor.meeting;

                                                return (
                                                    <div
                                                        key={
                                                            event.id
                                                        }
                                                        className={`flex gap-4 rounded-2xl border p-4 ${color}`}
                                                    >
                                                        <Icon
                                                            size={
                                                                18
                                                            }
                                                        />

                                                        <div className="flex-1">
                                                            <p className="font-semibold text-foreground">
                                                                {
                                                                    event.title
                                                                }
                                                            </p>

                                                            {event.description && (
                                                                <p className="text-sm text-foreground/60">
                                                                    {
                                                                        event.description
                                                                    }
                                                                </p>
                                                            )}

                                                            <p className="mt-1 text-xs text-foreground/50">
                                                                {formatTime(
                                                                    event.date,
                                                                    locale,
                                                                    timezone,
                                                                )}
                                                            </p>
                                                        </div>

                                                        <div className="flex flex-col gap-2">
                                                            <button
                                                                onClick={() =>
                                                                    startEdit(
                                                                        event,
                                                                    )
                                                                }
                                                                className="text-xs text-cyan-300"
                                                            >
                                                                {"Edit"}
                                                            </button>

                                                            <button
                                                                onClick={() =>
                                                                    void deleteEvent(
                                                                        event.id,
                                                                    )
                                                                }
                                                                className="flex items-center gap-1 text-xs text-red-400"
                                                            >
                                                                <Trash2
                                                                    size={
                                                                        12
                                                                    }
                                                                />

                                                                {"Delete"}
                                                            </button>

                                                            {event.leadId && (
                                                                <Link
                                                                    href={`/leads/${event.leadId}`}
                                                                    className="text-xs underline"
                                                                >
                                                                    {"Lead"}
                                                                </Link>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            },
                                        )}
                                    </div>
                                </div>
                            );
                        },
                    )}
                </div>
            </div>
        </AuthGuard>
    );
}