"use client";
import { getIntlLocale, translateText  } from "@/lib/i18n";
import { useAppPreferences } from "@/components/AppPreferencesProvider";


import { useMemo, useState } from "react";
import ActivityIcon from "@/components/ActivityIcon";
import type { Activity, ActivityType } from "@/types";

type ActivityTimelineProps = {
    activities: Activity[];
    timeZone: string;
    locale?: string;
};

const formatActivityTimestamp = (
    value: string,
    locale: string,
    timeZone: string,
) => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone,
    }).format(date);
};

export default function ActivityTimeline({
    activities,
    timeZone,
    locale = getIntlLocale(),
}: ActivityTimelineProps) {
    const { language } = useAppPreferences();
    const [filter, setFilter] = useState<
        "all" | "calls" | "emails" | "changes" | "ai"
    >("all");

    const getActivityText = (activity: Activity) =>
        (activity.title || activity.action || "")
            .trim()
            .toLowerCase();

    const getMetadataEvent = (activity: Activity) => {
        const metadata = activity.metadata;

        if (!metadata) {
            return "";
        }

        const event = (metadata as Record<string, unknown>).event;

        return typeof event === "string"
            ? event.toLowerCase()
            : "";
    };

    const isTaskMutationActivity = (activity: Activity) => {
        const text = getActivityText(activity);
        const event = getMetadataEvent(activity);

        return (
            activity.type === "task_created" ||
            activity.type === "task_completed" ||
            event === "task_created" ||
            event === "task_updated" ||
            event === "task_completed" ||
            event === "task_reopened" ||
            event === "task_deleted" ||
            /^task\s+(created|updated|completed|reopened|deleted)\b/i.test(
                text,
            )
        );
    };

    const isCalendarMutationActivity = (activity: Activity) => {
        const text = getActivityText(activity);
        const event = getMetadataEvent(activity);

        return (
            activity.type === "meeting_created" ||
            activity.type === "meeting_updated" ||
            activity.type === "meeting_completed" ||
            activity.type === "meeting_deleted" ||
            event === "meeting_created" ||
            event === "meeting_updated" ||
            event === "meeting_completed" ||
            event === "meeting_deleted" ||
            /^meeting\s+(created|updated|completed|deleted)\b/i.test(
                text,
            )
        );
    };

    const filteredActivities = useMemo(() => {
        if (filter === "all") {
            return activities;
        }

        if (filter === "calls") {
            return activities.filter(
                (activity) =>
                    activity.type === "call_completed",
            );
        }

        if (filter === "emails") {
            return activities.filter(
                (activity) =>
                    activity.type === "email_sent",
            );
        }

        if (filter === "ai") {
            return activities.filter(
                (activity) =>
                    activity.type === "ai",
            );
        }

        return activities.filter(
            (activity) =>
                activity.type === "status_changed" ||
                activity.type === "note_added" ||
                activity.type === "created" ||
                isTaskMutationActivity(activity) ||
                isCalendarMutationActivity(activity) ||
                activity.action
                    ?.toLowerCase()
                    .includes("status changed"),
        );
    }, [activities, filter]);

    const getTypeLabel = (
        type?: ActivityType | string,
    ) => {
        switch (type) {
            case "status_changed":
                return translateText("Status Change");
            case "note_added":
                return translateText("Note");
            case "email_sent":
                return translateText("Email");
            case "call_completed":
                return translateText("Call");
            case "task_created":
                return translateText("Task Created");
            case "task_completed":
                return translateText("Task Completed");
            case "meeting_created":
                return translateText("Meeting Created");
            case "meeting_updated":
                return translateText("Meeting Updated");
            case "meeting_completed":
                return translateText("Meeting Completed");
            case "meeting_deleted":
                return translateText("Meeting Deleted");
            case "created":
                return translateText("Created");
            case "customer_updated":
                return translateText("Customer Updated");
            case "ai":
                return translateText("AI");
            default:
                return translateText("Event");
        }
    };

    const getTypeLabelFor = (
        activity: Activity,
    ) => {
        const event = getMetadataEvent(activity);

        if (
            event === "task_created" ||
            event === "task_updated" ||
            event === "task_deleted" ||
            event === "task_completed" ||
            event === "task_reopened"
        ) {
            return translateText("Task");
        }

        if (
            event === "meeting_created" ||
            event === "meeting_updated" ||
            event === "meeting_completed" ||
            event === "meeting_deleted"
        ) {
            return translateText("Meeting");
        }

        return getTypeLabel(activity.type);
    };

    const statusMap = {
        new: "New",
        contacted: "Contacted",
        qualified: "Qualified",
        proposal: "Proposal",
        won: "Won",
        lost: "Lost",
    };

    const getStatusLabel = (status: string) => {
        const normalized = status.trim().toLowerCase();
        const statusEntry =
            statusMap[
                normalized as keyof typeof statusMap
            ];

        return statusEntry ? translateText(statusEntry) : status;
    };

    const getLocalizedAction = (action: string) => {
        const normalized = action.trim().toLowerCase();

        const statusRegex =
            /status\s*changed\s*from\s+(.+?)\s+to\s+(.+)/i;

        const statusMatch =
            action.match(statusRegex);

        if (statusMatch) {
            const oldStatus =
                getStatusLabel(statusMatch[1]);

            const newStatus =
                getStatusLabel(statusMatch[2]);

            return language === "de" ? `Status geändert von ${oldStatus} zu ${newStatus}` : `Status changed from ${oldStatus} to ${newStatus}`;
        }

        if (
            normalized === "lead_created" ||
            normalized === "lead created"
        ) {
            return translateText("Lead created");
        }

        const taskCreatedMatch =
            action.match(/^task created:\s*(.+)$/i);

        if (taskCreatedMatch) {
            return language === "de" ? `Aufgabe erstellt: ${taskCreatedMatch[1]}` : `Task created: ${taskCreatedMatch[1]}`;
        }

        const taskUpdatedMatch =
            action.match(/^task updated:\s*(.+)$/i);

        if (taskUpdatedMatch) {
            return language === "de" ? `Aufgabe aktualisiert: ${taskUpdatedMatch[1]}` : `Task updated: ${taskUpdatedMatch[1]}`;
        }

        const taskDeletedMatch =
            action.match(/^task deleted:\s*(.+)$/i);

        if (taskDeletedMatch) {
            return language === "de" ? `Aufgabe gelöscht: ${taskDeletedMatch[1]}` : `Task deleted: ${taskDeletedMatch[1]}`;
        }

        const meetingCreatedMatch =
            action.match(/^meeting created:\s*(.+)$/i);

        if (meetingCreatedMatch) {
            return language === "de" ? `Termin erstellt: ${meetingCreatedMatch[1]}` : `Meeting created: ${meetingCreatedMatch[1]}`;
        }

        const meetingUpdatedMatch =
            action.match(/^meeting updated:\s*(.+)$/i);

        if (meetingUpdatedMatch) {
            return language === "de" ? `Termin aktualisiert: ${meetingUpdatedMatch[1]}` : `Meeting updated: ${meetingUpdatedMatch[1]}`;
        }

        const meetingCompletedMatch =
            action.match(/^meeting completed:\s*(.+)$/i);

        if (meetingCompletedMatch) {
            return language === "de" ? `Termin abgeschlossen: ${meetingCompletedMatch[1]}` : `Meeting completed: ${meetingCompletedMatch[1]}`;
        }

        const meetingDeletedMatch =
            action.match(/^meeting deleted:\s*(.+)$/i);

        if (meetingDeletedMatch) {
            return language === "de" ? `Termin gelöscht: ${meetingDeletedMatch[1]}` : `Meeting deleted: ${meetingDeletedMatch[1]}`;
        }

        if (
            normalized ===
            "automation created task"
        ) {
            return translateText("Automation created task");
        }

        const followUpMatch =
            action.match(/^follow up:\s*(.+)$/i);

        if (followUpMatch) {
            return language === "de" ? `Nachfassen: ${followUpMatch[1]}` : `Follow up: ${followUpMatch[1]}`;
        }

        const proposalFollowUpMatch =
            action.match(
                /^follow up proposal:\s*(.+)$/i,
            );

        if (proposalFollowUpMatch) {
            return language === "de" ? `Angebot nachfassen: ${proposalFollowUpMatch[1]}` : `Follow up proposal: ${proposalFollowUpMatch[1]}`;
        }

        const welcomeMatch =
            action.match(
                /^welcome customer:\s*(.+)$/i,
            );

        if (welcomeMatch) {
            return language === "de" ? `Kunde begrüßen: ${welcomeMatch[1]}` : `Welcome customer: ${welcomeMatch[1]}`;
        }

        const onboardingMatch =
            action.match(
                /^schedule onboarding meeting:\s*(.+)$/i,
            );

        if (onboardingMatch) {
            return language === "de" ? `Einführungstermin planen: ${onboardingMatch[1]}` : `Schedule onboarding meeting: ${onboardingMatch[1]}`;
        }

        const checkInMatch =
            action.match(
                /^first customer check-in:\s*(.+)$/i,
            );

        if (checkInMatch) {
            return language === "de" ? `Erster Kunden-Check-in: ${checkInMatch[1]}` : `First customer check-in: ${checkInMatch[1]}`;
        }

        const reactivationMatch =
            action.match(
                /^reactivation follow up:\s*(.+)$/i,
            );

        if (reactivationMatch) {
            return language === "de" ? `Erneute Kontaktaufnahme: ${reactivationMatch[1]}` : `Reactivation follow up: ${reactivationMatch[1]}`;
        }

        const translations: Record<
            string,
            string
        > = {
            "lead created":
                "Lead created",
            "lead imported from csv":
                "Lead imported from CSV",
            "lead notes updated":
                "Lead notes updated",
            "lead details updated":
                "Lead details updated",
            "task completed":
                "Task completed",
            "task reopened":
                "Task reopened",
            "task updated":
                "Task updated",
            "task deleted":
                "Task deleted",
            "task created":
                "Task created",
            "meeting created":
                "Meeting created",
            "meeting updated":
                "Meeting updated",
            "meeting completed":
                "Meeting completed",
            "meeting deleted":
                "Meeting deleted",
            lead_created:
                "Lead created",
            "email sent":
                "Email sent",
            "automation created task":
                "Automation created task",
        };

        return (
            translations[normalized] ??
            action
        );
    };

    const getDisplayAction = (
        activity: Activity,
    ) => {
        const event =
            getMetadataEvent(activity);

        if (event === "task_updated") {
            return translateText("Task updated");
        }

        if (event === "task_deleted") {
            return translateText("Task deleted");
        }

        if (event === "task_reopened") {
            return translateText("Task reopened");
        }

        return getLocalizedAction(
            activity.title ||
                activity.action ||
                "Activity updated",
        );
    };

    return (
        <div className="rounded-xl bg-surface-1 p-6">
            <h2 className="mb-4 text-xl font-semibold text-foreground">
                {translateText("Activity Timeline")}</h2>

            <div className="mb-4 flex flex-wrap gap-2">
                {[
                    ["all", "All"],
                    ["calls", "Calls"],
                    ["emails", "Emails"],
                    ["changes", "Changes"],
                    ["ai", "AI"],
                ].map(([key, label]) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() =>
                            setFilter(
                                key as typeof filter,
                            )
                        }
                        className={`rounded-full px-3 py-1 text-xs ${
                            filter === key
                                ? "bg-foreground text-background"
                                : "bg-surface-2/80 text-foreground/80"
                        }`}
                    >
                        {translateText(label)}
                    </button>
                ))}
            </div>

            {filteredActivities.length === 0 ? (
                <p className="text-foreground/55">
                    {translateText("No activities yet.")}</p>
            ) : (
                <div className="space-y-3">
                    {filteredActivities.map(
                        (activity) => (
                            <div
                                key={activity.id}
                                className="border-b border-border-subtle pb-3"
                            >
                                <div className="flex items-center gap-3">
                                    <ActivityIcon
                                        size="sm"
                                        activity={activity}
                                    />

                                    <div>
                                        <p className="font-medium text-foreground">
                                            {activity.type ===
                                            "ai"
                                                ? `${translateText("AI Assistant")}: `
                                                : ""}

                                            {getDisplayAction(
                                                activity,
                                            )}
                                        </p>

                                        <p className="text-xs text-foreground/55">
                                            {getTypeLabelFor(
                                                activity,
                                            )}
                                        </p>

                                        <p className="mt-1 text-xs text-foreground/55">
                                            {formatActivityTimestamp(
                                                activity.created_at,
                                                locale,
                                                timeZone,
                                            )}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ),
                    )}
                </div>
            )}
        </div>
    );
}
