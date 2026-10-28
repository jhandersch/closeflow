"use client";
import { getIntlLocale, translateText  } from "@/lib/i18n";


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
            return translateText("Customer updated");
        case "meeting_created":
            return translateText("Meeting created");
        case "meeting_updated":
            return translateText("Meeting updated");
        case "meeting_completed":
            return translateText("Meeting completed");
        case "meeting_deleted":
            return translateText("Meeting deleted");
    }

    if (normalized === "meeting created") {
        return translateText("Meeting created");
    }

    if (normalized === "meeting updated") {
        return translateText("Meeting updated");
    }

    if (normalized === "meeting completed") {
        return translateText("Meeting completed");
    }

    if (normalized === "meeting deleted") {
        return translateText("Meeting deleted");
    }

    return translateText(raw || "Activity");
}

function formatActivityDate(
    value: string,
    timeZone: string,
) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat(getIntlLocale(), {
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
                        {translateText("Activity timeline")}</p>

                    <h2 className="cf-title text-lg font-semibold text-foreground">
                        {translateText("Customer journey")}</h2>
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
                        {translateText("No activity yet. Create a lead to start tracking sales momentum.")}</div>
                )}
            </div>
        </section>
    );
}
