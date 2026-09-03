"use client";
import { useMemo, useState } from "react";
import type { Activity, ActivityType } from "@/types";
type ActivityTimelineProps = {
    activities: Activity[];
};
export default function ActivityTimeline({ activities, }: ActivityTimelineProps) {
    const [filter, setFilter] = useState<"all" | "calls" | "emails" | "changes" | "ai">("all");
    const getActivityText = (activity: Activity) => (activity.title ||
        activity.action ||
        "")
        .trim()
        .toLowerCase();
    const getMetadataEvent = (activity: Activity) => {
        const metadata = activity.metadata;
        if (!metadata) {
            return "";
        }
        const event = (metadata as Record<string, unknown>)
            .event;
        return typeof event === "string"
            ? event.toLowerCase()
            : "";
    };
    const isTaskMutationActivity = (activity: Activity) => {
        const text = getActivityText(activity);
        const event = getMetadataEvent(activity);
        return (activity.type === "task_created" ||
            activity.type === "task_completed" ||
            event === "task_created" ||
            event === "task_updated" ||
            event === "task_completed" ||
            event === "task_reopened" ||
            event === "task_deleted" ||
            /^task\s+(created|updated|completed|reopened|deleted)\b/i.test(text));
    };
    const isCalendarMutationActivity = (activity: Activity) => {
        const text = getActivityText(activity);
        const event = getMetadataEvent(activity);
        return (activity.type === "meeting_created" ||
            activity.type === "meeting_updated" ||
            activity.type === "meeting_completed" ||
            activity.type === "meeting_deleted" ||
            event === "meeting_created" ||
            event === "meeting_updated" ||
            event === "meeting_completed" ||
            event === "meeting_deleted" ||
            /^meeting\s+(created|updated|completed|deleted)\b/i.test(text));
    };
    const getActivityIcon = (type?: ActivityType | string) => {
        switch (type) {
            case "status_changed":
                return "SC";
            case "note_added":
                return "NT";
            case "email_sent":
                return "EM";
            case "call_completed":
                return "CL";
            case "task_created":
                return "TC";
            case "task_completed":
                return "TD";
            case "created":
                return "NW";
            case "ai":
                return "KI";
            case "meeting_created":
            case "meeting_updated":
            case "meeting_completed":
            case "meeting_deleted":
                return "CA";
            default:
                return "EV";
        }
    };
    const getActivityIconFor = (activity: Activity) => {
        const event = getMetadataEvent(activity);
        if (event === "task_created" ||
            event === "task_updated" ||
            event === "task_deleted") {
            return "TC";
        }
        if (event === "task_completed" ||
            event === "task_reopened") {
            return "TD";
        }
        if (event === "meeting_created" ||
            event === "meeting_updated" ||
            event === "meeting_deleted" ||
            event === "meeting_completed") {
            return "CA";
        }
        return getActivityIcon(activity.type);
    };
    const filteredActivities = useMemo(() => {
        if (filter === "all") {
            return activities;
        }
        if (filter === "calls") {
            return activities.filter((a) => a.type === "call_completed");
        }
        if (filter === "emails") {
            return activities.filter((a) => a.type === "email_sent");
        }
        if (filter === "ai") {
            return activities.filter((a) => a.type === "ai");
        }
        return activities.filter((a) => a.type === "status_changed" ||
            a.type === "note_added" ||
            a.type === "created" ||
            isTaskMutationActivity(a) ||
            isCalendarMutationActivity(a) ||
            a.action
                ?.toLowerCase()
                .includes("status changed") ||
            a.action
                ?.toLowerCase()
                .includes("status changed"));
    }, [activities, filter]);
    const getTypeLabel = (type?: ActivityType | string) => {
        switch (type) {
            case "status_changed":
                return "Status Change";
            case "note_added":
                return "Note";
            case "email_sent":
                return "Email";
            case "call_completed":
                return "Call";
            case "task_created":
                return "Task Created";
            case "task_completed":
                return "Task Completed";
            case "meeting_created":
                return "Meeting Created";
            case "meeting_updated":
                return "Meeting Updated";
            case "meeting_completed":
                return "Meeting Completed";
            case "meeting_deleted":
                return "Meeting Deleted";
            case "created":
                return "Created";
            case "ai":
                return "AI";
            default:
                return "Event";
        }
    };
    const getTypeLabelFor = (activity: Activity) => {
        const event = getMetadataEvent(activity);
        if (event === "task_created" ||
            event === "task_updated" ||
            event === "task_deleted" ||
            event === "task_completed" ||
            event === "task_reopened") {
            return "Task";
        }
        if (event === "meeting_created" ||
            event === "meeting_updated" ||
            event === "meeting_completed" ||
            event === "meeting_deleted") {
            return "Meeting";
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
        const normalized = status
            .trim()
            .toLowerCase();
        const statusEntry = statusMap[normalized as keyof typeof statusMap];
        if (!statusEntry) {
            return status;
        }
        return statusEntry;
    };
    const getLocalizedAction = (action: string) => {
        const normalized = action.trim().toLowerCase();
                /* Status changes */
        const statusRegex = /status\s*changed\s*from\s+(.+?)\s+to\s+(.+)/i;
        const statusMatch = action.match(statusRegex);
        if (statusMatch) {
            const oldStatus = getStatusLabel(statusMatch[1]);
            const newStatus = getStatusLabel(statusMatch[2]);
            return `Status changed from ${oldStatus} to ${newStatus}`;
        }
        if (normalized === "lead_created" ||
            normalized === "lead created") {
            return "Lead created";
        }
        const taskCreatedMatch = action.match(/^task created:\s*(.+)$/i);
        if (taskCreatedMatch) {
            return `Task created: ${taskCreatedMatch[1]}`;
        }
        const taskUpdatedMatch = action.match(/^task updated:\s*(.+)$/i);
        if (taskUpdatedMatch) {
            return `Task updated: ${taskUpdatedMatch[1]}`;
        }
        const taskDeletedMatch = action.match(/^task deleted:\s*(.+)$/i);
        if (taskDeletedMatch) {
            return `Task deleted: ${taskDeletedMatch[1]}`;
        }
        const meetingCreatedMatch = action.match(/^meeting created:\s*(.+)$/i);
        if (meetingCreatedMatch) {
            return `Meeting created: ${meetingCreatedMatch[1]}`;
        }
        const meetingUpdatedMatch = action.match(/^meeting updated:\s*(.+)$/i);
        if (meetingUpdatedMatch) {
            return `Meeting updated: ${meetingUpdatedMatch[1]}`;
        }
        const meetingCompletedMatch = action.match(/^meeting completed:\s*(.+)$/i);
        if (meetingCompletedMatch) {
            return `Meeting completed: ${meetingCompletedMatch[1]}`;
        }
        const meetingDeletedMatch = action.match(/^meeting deleted:\s*(.+)$/i);
        if (meetingDeletedMatch) {
            return `Meeting deleted: ${meetingDeletedMatch[1]}`;
        }
        /*
          Automation Tasks
        */
        if (normalized ===
            "automation created task") {
            return "Automation created task";
        }
        /*
          Follow-up Automation
        */
        const followUpMatch = action.match(/^follow up:\s*(.+)$/i);
        if (followUpMatch) {
            return `Follow up: ${followUpMatch[1]}`;
        }
        /*
          Proposal Follow-up
        */
        const proposalFollowUpMatch = action.match(/^follow up proposal:\s*(.+)$/i);
        if (proposalFollowUpMatch) {
            return `Follow up proposal: ${proposalFollowUpMatch[1]}`;
        }
        /*
          Welcome Customer
        */
        const welcomeMatch = action.match(/^welcome customer:\s*(.+)$/i);
        if (welcomeMatch) {
            return `Welcome customer: ${welcomeMatch[1]}`;
        }
        /*
          Onboarding Meeting
        */
        const onboardingMatch = action.match(/^schedule onboarding meeting:\s*(.+)$/i);
        if (onboardingMatch) {
            return `Schedule onboarding meeting: ${onboardingMatch[1]}`;
        }
        /*
          First Check-in
        */
        const checkInMatch = action.match(/^first customer check-in:\s*(.+)$/i);
        if (checkInMatch) {
            return `First customer check-in: ${checkInMatch[1]}`;
        }
        /*
          Reactivation
        */
        const reactivationMatch = action.match(/^reactivation follow up:\s*(.+)$/i);
        if (reactivationMatch) {
            return `Reactivation follow up: ${reactivationMatch[1]}`;
        }
        /*
          Standard Activities
        */
        const translations: Record<string, string> = {
            "lead created": "Lead created",
            "lead imported from csv": "Lead imported from CSV",
            "lead notes updated": "Lead notes updated",
            "lead details updated": "Lead details updated",
            "task completed": "Task completed",
            "task reopened": "Task reopened",
            "task updated": "Task updated",
            "task deleted": "Task deleted",
            "task created": "Task created",
            "meeting created": "Meeting created",
            "meeting updated": "Meeting updated",
            "meeting completed": "Meeting completed",
            "meeting deleted": "Meeting deleted",
            "lead_created": "Lead created",
            "email sent": "Email sent",
            "automation created task": "Automation created task",
        };
        return (translations[normalized] ??
            action);
    };
    const getDisplayAction = (activity: Activity) => {
        const event = getMetadataEvent(activity);
        if (event === "task_updated") {
            return "Task updated";
        }
        if (event === "task_deleted") {
            return "Task deleted";
        }
        if (event === "task_reopened") {
            return "Task reopened";
        }
        return getLocalizedAction(activity.title ||
            activity.action ||
            ("Activity updated"));
    };
    return (<div className="rounded-xl bg-surface-1 p-6">

      <h2 className="mb-4 text-xl font-semibold text-foreground">
        {"Activity Timeline"}
      </h2>


      <div className="mb-4 flex flex-wrap gap-2">
        {[
            ["all", "All"],
            ["calls", "Calls"],
            ["emails", "Emails"],
            ["changes", "Changes"],
            ["ai", "AI"],
        ].map(([key, label]) => (<button key={key} onClick={() => setFilter(key as typeof filter)} className={`
              rounded-full
              px-3 py-1
              text-xs
              ${filter === key
                ? "bg-foreground text-background"
                : "bg-surface-2/80 text-foreground/80"}
            `}>
            {label}
          </button>))}
      </div>


      {filteredActivities.length === 0 ? (<p className="text-foreground/55">
          {"No activities yet."}
        </p>) : (<div className="space-y-3">

          {filteredActivities.map((activity) => (<div key={activity.id} className="border-b border-border-subtle pb-3">

              <div className="flex items-center gap-3">

                <span className="
                    inline-flex
                    h-7 w-7
                    items-center
                    justify-center
                    rounded-full
                    border
                    border-cyan-500/20
                    bg-cyan-500/10
                    text-[10px]
                    font-semibold
                    text-cyan-300
                  ">
                  {getActivityIconFor(activity)}
                </span>


                <div>

                  <p className="font-medium text-foreground">

                    {activity.type === "ai"
                    ? ("AI Assistant: ")
                    : ""}

                    {getDisplayAction(activity)}

                  </p>


                  <p className="text-xs text-foreground/55">
                    {getTypeLabelFor(activity)}
                  </p>


                  <p className="mt-1 text-xs text-foreground/55">
                    {new Date(activity.created_at).toLocaleString("en-US", {
                    dateStyle: "medium",
                    timeStyle: "short",
                })}
                  </p>

                </div>

              </div>

            </div>))}

        </div>)}

    </div>);
}
