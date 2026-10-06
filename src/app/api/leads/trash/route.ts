import { NextResponse } from "next/server";
import { getRouteUser, loadWorkspaceForUser } from "@/lib/supabase/route";

export async function DELETE(request: Request) {
  try {
    const { supabase, user, error: authError } = await getRouteUser(request);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { workspace } = await loadWorkspaceForUser(
      supabase,
      user.id
    );

    if (!workspace?.id) {
      return NextResponse.json(
        { error: "Workspace required" },
        { status: 403 }
      );
    }

    const { data: deletedLeads, error: leadsError } = await supabase
      .from("leads")
      .delete()
      .eq("workspace_id", workspace.id)
      .not("deleted_at", "is", null)
      .select("id");

    if (leadsError) {
      console.error("EMPTY TRASH LEADS ERROR:", leadsError);

      return NextResponse.json(
        { error: leadsError.message },
        { status: 500 }
      );
    }

    const { data: deletedTasks, error: tasksError } = await supabase
      .from("tasks")
      .delete()
      .eq("workspace_id", workspace.id)
      .not("deleted_at", "is", null)
      .select("id");

    if (tasksError) {
      console.error("EMPTY TRASH TASKS ERROR:", tasksError);

      return NextResponse.json(
        { error: tasksError.message },
        { status: 500 }
      );
    }

    const { data: deletedCalendarEvents, error: calendarEventsError } = await supabase
      .from("calendar_events")
      .delete()
      .eq("workspace_id", workspace.id)
      .eq("user_id", user.id)
      .not("deleted_at", "is", null)
      .select("id");

    if (calendarEventsError) {
      console.error("EMPTY TRASH CALENDAR EVENTS ERROR:", calendarEventsError);
      return NextResponse.json(
        { error: calendarEventsError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      deletedLeads: deletedLeads?.length ?? 0,
      deletedTasks: deletedTasks?.length ?? 0,
      deletedCalendarEvents: deletedCalendarEvents?.length ?? 0,
    });
  } catch (error) {
    console.error("EMPTY TRASH CRASH:", error);

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
