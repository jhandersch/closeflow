import { NextResponse } from "next/server";
import {
  getRouteUser,
  loadWorkspaceForUser,
} from "@/lib/supabase/route";

type CalendarEventRow = {
  id: string;
  workspace_id: string | null;
  user_id: string;
  lead_id: string | null;
  title: string;
  description: string | null;
  scheduled_at: string;
  status: string;
  created_at: string;
  updated_at: string;
};

const DEFAULT_TIMEZONE = "Europe/Berlin";

const isValidIso = (value: string) =>
  !Number.isNaN(Date.parse(value));

const allowedStatuses = new Set([
  "scheduled",
  "completed",
  "cancelled",
]);

const selectClause = `
  id,
  workspace_id,
  user_id,
  lead_id,
  title,
  description,
  scheduled_at,
  status,
  created_at,
  updated_at
`;

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

const getDateKey = (
  date: Date,
  timeZone: string
) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

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

const createCalendarActivity = async ({
  supabase,
  workspaceId,
  userId,
  leadId,
  type,
  title,
  description,
  metadata,
}: {
  supabase: Awaited<
    ReturnType<typeof getRouteUser>
  >["supabase"];
  workspaceId: string;
  userId: string;
  leadId: string | null;
  type:
    | "meeting_created"
    | "meeting_updated"
    | "meeting_completed"
    | "meeting_deleted";
  title: string;
  description: string | null;
  metadata: Record<string, unknown>;
}) => {
  await supabase.from("activities").insert({
    workspace_id: workspaceId,
    user_id: userId,
    lead_id: leadId,
    type,
    title,
    description,
    action: title,
    metadata: {
      ...metadata,
      event: type,
    },
  });
};

export async function GET(request: Request) {
  const {
    supabase,
    user,
    error,
  } = await getRouteUser(request);

  if (error || !user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const url = new URL(request.url);

  const storedTimezone =
    typeof user.user_metadata?.timezone === "string"
      ? user.user_metadata.timezone
      : DEFAULT_TIMEZONE;

  const timeZone = isValidTimeZone(storedTimezone)
    ? storedTimezone
    : DEFAULT_TIMEZONE;

  const todayKey = getDateKey(
    new Date(),
    timeZone
  );

  const from =
    url.searchParams.get("from") ||
    addCalendarDays(todayKey, -7);

  const to =
    url.searchParams.get("to") ||
    addCalendarDays(todayKey, 60);

  const fromUtc = zonedLocalToISOString(
    from,
    timeZone
  );

  const toExclusiveUtc = zonedLocalToISOString(
    addCalendarDays(to, 1),
    timeZone
  );

  const {
    workspace,
  } = await loadWorkspaceForUser(
    supabase,
    user.id
  );

  if (!workspace?.id) {
    return NextResponse.json(
      { error: "Workspace required" },
      { status: 403 }
    );
  }

  const {
    data,
    error: queryError,
  } = await supabase
    .from("calendar_events")
    .select(selectClause)
    .eq("workspace_id", workspace.id)
    .gte("scheduled_at", fromUtc)
    .lt("scheduled_at", toExclusiveUtc)
    .order("scheduled_at", {
      ascending: true,
    });

  if (queryError) {
    return NextResponse.json(
      { error: queryError.message },
      { status: 500 }
    );
  }

  const events = (data ?? []).map(
    (event: CalendarEventRow) => ({
      id: event.id,
      type: "calendar_event" as const,
      activityType: "meeting" as const,
      title: event.title,
      description: event.description,
      date: event.scheduled_at,
      leadId: event.lead_id,
      status: event.status,
    })
  );

  return NextResponse.json({
    events,
    workspace_id: workspace.id,
    timezone: timeZone,
  });
}

export async function POST(request: Request) {
  const {
    supabase,
    user,
    error,
  } = await getRouteUser(request);

  if (error || !user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const body = await request.json();

  const title =
    typeof body.title === "string"
      ? body.title.trim()
      : "";

  const description =
    typeof body.description === "string"
      ? body.description.trim()
      : null;

  const scheduledAt =
    typeof body.scheduled_at === "string" &&
    isValidIso(body.scheduled_at)
      ? body.scheduled_at
      : new Date().toISOString();

  const leadId =
    typeof body.lead_id === "string" &&
    body.lead_id.trim()
      ? body.lead_id.trim()
      : null;

  const status =
    typeof body.status === "string" &&
    allowedStatuses.has(body.status.trim())
      ? body.status.trim()
      : "scheduled";

  if (!title) {
    return NextResponse.json(
      { error: "Title required" },
      { status: 400 }
    );
  }

  const {
    workspace,
  } = await loadWorkspaceForUser(
    supabase,
    user.id
  );

  if (!workspace?.id) {
    return NextResponse.json(
      { error: "Workspace required" },
      { status: 403 }
    );
  }

  if (leadId) {
    const {
      data: lead,
      error: leadError,
    } = await supabase
      .from("leads")
      .select("id")
      .eq("id", leadId)
      .eq("workspace_id", workspace.id)
      .single();

    if (leadError || !lead) {
      return NextResponse.json(
        { error: "Lead not found" },
        { status: 404 }
      );
    }
  }

  const {
    data,
    error: insertError,
  } = await supabase
    .from("calendar_events")
    .insert({
      workspace_id: workspace.id,
      user_id: user.id,
      lead_id: leadId,
      title,
      description,
      scheduled_at: scheduledAt,
      status,
    })
    .select(selectClause)
    .single();

  if (insertError) {
    return NextResponse.json(
      { error: insertError.message },
      { status: 500 }
    );
  }

  await createCalendarActivity({
    supabase,
    workspaceId: workspace.id,
    userId: user.id,
    leadId,
    type:
      status === "completed"
        ? "meeting_completed"
        : "meeting_created",
    title:
      status === "completed"
        ? "Meeting completed"
        : "Meeting created",
    description: description || title,
    metadata: {
      event_id: data.id,
      scheduled_at: data.scheduled_at,
      status: data.status,
    },
  });

  return NextResponse.json(data);
}

export async function PUT(request: Request) {
  const {
    supabase,
    user,
    error,
  } = await getRouteUser(request);

  if (error || !user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const body = await request.json();

  const id =
    typeof body.id === "string"
      ? body.id.trim()
      : "";

  const title =
    typeof body.title === "string"
      ? body.title.trim()
      : undefined;

  const description =
    typeof body.description === "string"
      ? body.description.trim()
      : undefined;

  const scheduledAt =
    typeof body.scheduled_at === "string" &&
    isValidIso(body.scheduled_at)
      ? body.scheduled_at
      : undefined;

  const leadId =
    typeof body.lead_id === "string"
      ? body.lead_id.trim() || null
      : undefined;

  const status =
    typeof body.status === "string" &&
    allowedStatuses.has(body.status.trim())
      ? body.status.trim()
      : body.status === null
        ? null
        : undefined;

  if (!id) {
    return NextResponse.json(
      { error: "Missing id" },
      { status: 400 }
    );
  }

  const {
    workspace,
  } = await loadWorkspaceForUser(
    supabase,
    user.id
  );

  if (!workspace?.id) {
    return NextResponse.json(
      { error: "Workspace required" },
      { status: 403 }
    );
  }

  if (leadId) {
    const {
      data: lead,
      error: leadError,
    } = await supabase
      .from("leads")
      .select("id")
      .eq("id", leadId)
      .eq("workspace_id", workspace.id)
      .single();

    if (leadError || !lead) {
      return NextResponse.json(
        { error: "Lead not found" },
        { status: 404 }
      );
    }
  }

  const updatePayload: Record<
    string,
    unknown
  > = {};

  if (title !== undefined) {
    updatePayload.title = title;
  }

  if (body.description !== undefined) {
    updatePayload.description = description;
  }

  if (scheduledAt !== undefined) {
    updatePayload.scheduled_at = scheduledAt;
  }

  if (body.lead_id !== undefined) {
    updatePayload.lead_id = leadId;
  }

  if (body.status !== undefined) {
    updatePayload.status = status;
  }

  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json(
      { error: "No changes provided" },
      { status: 400 }
    );
  }

  const {
    data,
    error: updateError,
  } = await supabase
    .from("calendar_events")
    .update(updatePayload)
    .eq("id", id)
    .eq("workspace_id", workspace.id)
    .select(selectClause)
    .maybeSingle();

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: "Event not found" },
      { status: 404 }
    );
  }

  await createCalendarActivity({
    supabase,
    workspaceId: workspace.id,
    userId: user.id,
    leadId: data.lead_id,
    type:
      data.status === "completed"
        ? "meeting_completed"
        : "meeting_updated",
    title:
      data.status === "completed"
        ? "Meeting completed"
        : "Meeting updated",
    description: data.description || data.title,
    metadata: {
      event_id: data.id,
      scheduled_at: data.scheduled_at,
      status: data.status,
    },
  });

  return NextResponse.json(data);
}

export async function DELETE(request: Request) {
  const {
    supabase,
    user,
    error,
  } = await getRouteUser(request);

  if (error || !user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Missing id" },
      { status: 400 }
    );
  }

  const {
    workspace,
  } = await loadWorkspaceForUser(
    supabase,
    user.id
  );

  if (!workspace?.id) {
    return NextResponse.json(
      { error: "Workspace required" },
      { status: 403 }
    );
  }

  const {
    data,
    error: deleteError,
  } = await supabase
    .from("calendar_events")
    .delete()
    .eq("id", id)
    .eq("workspace_id", workspace.id)
    .select(
      "id, lead_id, title, scheduled_at"
    )
    .maybeSingle();

  if (deleteError) {
    return NextResponse.json(
      { error: deleteError.message },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: "Event not found" },
      { status: 404 }
    );
  }

  await createCalendarActivity({
    supabase,
    workspaceId: workspace.id,
    userId: user.id,
    leadId: data.lead_id,
    type: "meeting_deleted",
    title: "Meeting deleted",
    description: data.title,
    metadata: {
      event_id: data.id,
      scheduled_at: data.scheduled_at,
    },
  });

  return NextResponse.json({
    success: true,
    deleted: id,
  });
}