"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { useMeetings } from "@/hooks/useMeetings";

type Props = {
    leadId: string;
    timeZone: string;
};

const getTimezoneOffsetMs = (date: Date, timeZone: string) => {
    const parts = new Intl.DateTimeFormat("en-US", {
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
            .filter((part) => part.type !== "literal")
            .map((part) => [part.type, part.value]),
    );

    const asUTC = Date.UTC(
        Number(values.year),
        Number(values.month) - 1,
        Number(values.day),
        Number(values.hour),
        Number(values.minute),
        Number(values.second),
    );

    return asUTC - date.getTime();
};

const zonedLocalToISOString = (
    value: string,
    timeZone: string,
) => {
    const match =
        /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);

    if (!match) {
        return null;
    }

    const [, year, month, day, hour, minute] = match;

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
        const offset = getTimezoneOffsetMs(
            new Date(timestamp),
            timeZone,
        );

        const nextTimestamp = wallClockUTC - offset;

        if (nextTimestamp === timestamp) {
            break;
        }

        timestamp = nextTimestamp;
    }

    return new Date(timestamp).toISOString();
};

const formatMeetingDate = (
    value: string,
    timeZone: string,
) => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone,
    }).format(date);
};

export default function LeadMeetings({
    leadId,
    timeZone,
}: Props) {
    const {
        meetings,
        loading,
        addMeeting,
        deleteMeeting,
    } = useMeetings(leadId);

    const [title, setTitle] = useState("");
    const [date, setDate] = useState("");
    const [description, setDescription] = useState("");

    async function create() {
        if (!title || !date) {
            return;
        }

        try {
            const startsAt = zonedLocalToISOString(
                date,
                timeZone,
            );

            if (!startsAt) {
                toast.error("Invalid meeting date");
                return;
            }

            await addMeeting({
                title,
                description,
                starts_at: startsAt,
            });

            setTitle("");
            setDate("");
            setDescription("");

            toast.success("Meeting created");
        } catch (error) {
            console.error(error);
            toast.error("Could not create meeting");
        }
    }

    return (
        <div className="
space-y-5
rounded-xl
border
border-border-subtle
bg-surface-1
p-6
">
            <h2 className="text-xl font-semibold">
                Meetings
            </h2>

            <div className="space-y-3">
                <input
                    value={title}
                    onChange={(event) =>
                        setTitle(event.target.value)
                    }
                    placeholder="Title"
                    className="
w-full
rounded-xl
border
border-border-subtle
bg-surface-2
px-4
py-3
"
                />

                <input
                    type="datetime-local"
                    value={date}
                    onChange={(event) =>
                        setDate(event.target.value)
                    }
                    className="
w-full
rounded-xl
border
border-border-subtle
bg-surface-2
px-4
py-3
"
                />

                <textarea
                    value={description}
                    onChange={(event) =>
                        setDescription(event.target.value)
                    }
                    placeholder="Description"
                    className="
h-24
w-full
rounded-xl
border
border-border-subtle
bg-surface-2
px-4
py-3
"
                />

                <button
                    onClick={create}
                    className="
rounded-xl
bg-foreground
px-5
py-3
font-semibold
text-background
"
                >
                    Create meeting
                </button>
            </div>

            <div className="space-y-3">
                {loading ? (
                    <p>Loading...</p>
                ) : (
                    meetings.map((meeting) => (
                        <div
                            key={meeting.id}
                            className="
rounded-xl
border
border-border-subtle
bg-surface-2
p-4
"
                        >
                            <h3 className="font-semibold">
                                {meeting.title}
                            </h3>

                            <p className="text-sm text-foreground/60">
                                {formatMeetingDate(
                                    meeting.starts_at,
                                    timeZone,
                                )}
                            </p>

                            {meeting.description && (
                                <p className="mt-2 text-sm">
                                    {meeting.description}
                                </p>
                            )}

                            <button
                                onClick={() =>
                                    deleteMeeting(meeting.id)
                                }
                                className="
mt-3
text-sm
text-red-400
"
                            >
                                Delete
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}