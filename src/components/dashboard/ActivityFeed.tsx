"use client";

import ActivityIcon from "@/components/ActivityIcon";

type ActivityFeedProps = {
    activities: Array<{
        id: string;
        title?: string | null;
        action?: string | null;
        created_at: string;
        type?: string;
        metadata?: unknown;
    }>;
    timeZone: string;
};

function getActivityTitle(activity: {
    title?: string | null;
    action?: string | null;
    type?: string;
}) {
    const raw = (
        activity.title ||
        activity.action ||
        ""
    ).trim();

    const normalized = raw.toLowerCase();

    switch (activity.type) {
        case "customer_updated":
            return "Customer updated";
        case "meeting_created":
            return "Meeting created";
        case "meeting_updated":
            return "Meeting updated";
        case "meeting_completed":
            return "Meeting completed";
        case "meeting_deleted":
            return "Meeting deleted";
    }

    if (normalized === "meeting created") {
        return "Meeting created";
    }

    if (normalized === "meeting updated") {
        return "Meeting updated";
    }

    if (normalized === "meeting completed") {
        return "Meeting completed";
    }

    if (normalized === "meeting deleted") {
        return "Meeting deleted";
    }

    return raw || "Activity";
}

function formatActivityDate(
    value: string,
    timeZone: string,
) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat("en-US", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        timeZone,
    }).format(date);
}

export default function ActivityFeed({
    activities,
    timeZone,
}: ActivityFeedProps) {
    return (
        <section className="
            cf-card
            cf-enter
            p-6
        ">
            <div className="flex items-center justify-between">
                <div>
                    <p className="cf-label">
                        Activity timeline
                    </p>

                    <h2 className="cf-title text-lg font-semibold text-foreground">
                        Customer journey
                    </h2>
                </div>
            </div>

            <div className="mt-5 space-y-3">
                {activities.length > 0 ? (
                    activities.map((activity) => {
                        return (
                            <div
                                key={activity.id}
                                className="
                                    flex
                                    gap-4
                                    rounded-xl
                                    border
                                    border-border-subtle
                                    bg-surface-2/60
                                    p-4
                                "
                            >
                                <ActivityIcon activity={activity} />

                                <div className="flex-1">
                                    <p className="
                                        text-sm
                                        font-medium
                                        text-foreground
                                    ">
                                        {getActivityTitle(
                                            activity,
                                        )}
                                    </p>

                                    <p className="
                                        mt-1
                                        text-xs
                                        text-foreground/55
                                    ">
                                        {formatActivityDate(
                                            activity.created_at,
                                            timeZone,
                                        )}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="
                        rounded-xl
                        border
                        border-dashed
                        border-border-subtle
                        bg-surface-2/60
                        p-4
                        text-sm
                        text-foreground/55
                    ">
                        No activity yet. Create a lead to start tracking sales momentum.
                    </div>
                )}
            </div>
        </section>
    );
}
