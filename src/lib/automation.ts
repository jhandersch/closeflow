import type {
  Lead,
  LeadStatus,
  TaskPriority,
} from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_TIMEZONE = "Europe/Berlin";

const isValidTimeZone = (value: string) => {
  try {
    Intl.DateTimeFormat("en-US", {
      timeZone: value,
    });

    return true;
  } catch {
    return false;
  }
};

const getDateKey = (
  value: Date,
  timeZone: string
) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);

  const year =
    parts.find((part) => part.type === "year")?.value ||
    "1970";

  const month =
    parts.find((part) => part.type === "month")?.value ||
    "01";

  const day =
    parts.find((part) => part.type === "day")?.value ||
    "01";

  return `${year}-${month}-${day}`;
};

const addCalendarDays = (
  dateKey: string,
  days: number
) => {
  const [year, month, day] = dateKey
    .split("-")
    .map(Number);

  const date = new Date(
    Date.UTC(year, month - 1, day)
  );

  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
};

const getTimeZoneOffsetMs = (
  date: Date,
  timeZone: string
) => {
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

  const getPart = (type: string) =>
    Number(
      parts.find((part) => part.type === type)?.value || 0
    );

  const asUtc = Date.UTC(
    getPart("year"),
    getPart("month") - 1,
    getPart("day"),
    getPart("hour"),
    getPart("minute"),
    getPart("second")
  );

  return asUtc - date.getTime();
};

const zonedLocalToISOString = (
  localDate: string,
  timeZone: string
) => {
  const [year, month, day] = localDate
    .split("-")
    .map(Number);

  const wallClockUtc = new Date(
    Date.UTC(year, month - 1, day)
  );

  let utcTime = wallClockUtc.getTime();

  for (let index = 0; index < 3; index++) {
    const probe = new Date(utcTime);
    const offset = getTimeZoneOffsetMs(
      probe,
      timeZone
    );

    const nextUtcTime =
      wallClockUtc.getTime() - offset;

    if (nextUtcTime === utcTime) {
      break;
    }

    utcTime = nextUtcTime;
  }

  return new Date(utcTime).toISOString();
};

const getUserTimeZone = async (
  supabase: SupabaseClient
) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const storedTimezone =
    typeof user?.user_metadata?.timezone === "string"
      ? user.user_metadata.timezone
      : DEFAULT_TIMEZONE;

  return isValidTimeZone(storedTimezone)
    ? storedTimezone
    : DEFAULT_TIMEZONE;
};

async function openTaskAlreadyExists(
  supabase: SupabaseClient,
  leadId: string,
  title: string
) {
  const { data } = await supabase
    .from("tasks")
    .select("id")
    .eq("lead_id", leadId)
    .eq("title", title)
    .eq("completed", false)
    .maybeSingle();

  return !!data;
}

async function createAutomationTask(
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string,
  lead: Lead,
  triggerKey: string,
  title: string,
  priority: TaskPriority,
  dueDate: string
) {
  console.log("Creating automation task", {
    lead: lead.name,
    triggerKey,
    title,
    dueDate,
  });

  /*
   * No duplicate open automation task.
   */
  if (
    await openTaskAlreadyExists(
      supabase,
      lead.id,
      title
    )
  ) {
    console.log("Automation task already exists");
    return null;
  }

  /*
   * Create task.
   *
   * Task due dates are pure calendar dates.
   */
  const {
    data: task,
    error: taskError,
  } = await supabase
    .from("tasks")
    .insert({
      workspace_id: workspaceId,
      user_id: userId,
      lead_id: lead.id,
      title,
      priority,
      due_date: dueDate,
      completed: false,
    })
    .select()
    .single();

  console.log("Task insert result", {
    task,
    taskError,
  });

  if (taskError) {
    throw taskError;
  }

  /*
   * Save automation.
   */
  const {
    error: automationError,
  } = await supabase
    .from("lead_automations")
    .insert({
      workspace_id: workspaceId,
      lead_id: lead.id,
      trigger_key: triggerKey,
      task_id: task.id,
    });

  if (automationError) {
    throw automationError;
  }

  /*
   * Create activity.
   */
  const {
    error: activityError,
  } = await supabase
    .from("activities")
    .insert({
      workspace_id: workspaceId,
      lead_id: lead.id,
      user_id: userId,
      title: "Automation created task",
      description: title,
      action: title,
      type: "task_created",
      metadata: {
        automation: true,
        trigger: triggerKey,
        task_id: task.id,
        due_date: dueDate,
      },
    });

  if (activityError) {
    console.error(
      "Automation activity error:",
      activityError
    );
  }

  console.log(
    "Automation finished",
    task.id
  );

  return task;
}

async function updateNextAction(
  supabase: SupabaseClient,
  leadId: string,
  action: string,
  actionDate: string | null
) {
  const { error } = await supabase
    .from("leads")
    .update({
      next_action: action,
      next_action_date: actionDate,
      last_activity_at: new Date().toISOString(),
    })
    .eq("id", leadId);

  if (error) {
    throw error;
  }
}

export async function runLeadAutomation(
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string,
  lead: Lead,
  previousStatus: LeadStatus
) {
  console.log("Automation started", {
    lead: lead.name,
    previousStatus,
    currentStatus: lead.status,
    userId,
    workspaceId,
  });

  const timeZone = await getUserTimeZone(
    supabase
  );

  if (
    previousStatus !== lead.status &&
    (lead.status === "new" ||
      lead.status === "lost")
  ) {
    await updateNextAction(
      supabase,
      lead.id,
      "No action planned",
      null
    );
  }

  /*
   * CONTACTED
   */
  if (
    previousStatus !== "contacted" &&
    lead.status === "contacted"
  ) {
    const todayKey = getDateKey(
      new Date(),
      timeZone
    );

    const dueDate = addCalendarDays(
      todayKey,
      3
    );

    const actionDate =
      zonedLocalToISOString(
        dueDate,
        timeZone
      );

    await updateNextAction(
      supabase,
      lead.id,
      "Follow up with lead",
      actionDate
    );

    await createAutomationTask(
      supabase,
      userId,
      workspaceId,
      lead,
      "contacted_followup",
      `Follow up: ${lead.name}`,
      "medium",
      dueDate
    );
  }

  /*
   * PROPOSAL
   */
  if (
    previousStatus !== "proposal" &&
    lead.status === "proposal"
  ) {
    const todayKey = getDateKey(
      new Date(),
      timeZone
    );

    const dueDate = addCalendarDays(
      todayKey,
      5
    );

    const actionDate =
      zonedLocalToISOString(
        dueDate,
        timeZone
      );

    await updateNextAction(
      supabase,
      lead.id,
      "Follow up on proposal",
      actionDate
    );

    await createAutomationTask(
      supabase,
      userId,
      workspaceId,
      lead,
      "proposal_followup",
      `Follow up proposal: ${lead.name}`,
      "high",
      dueDate
    );
  }
}