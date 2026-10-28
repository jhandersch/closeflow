import { normalizeLanguage, translateText } from "@/lib/i18n";
import { NextResponse } from "next/server";
import { getRouteUser, loadWorkspaceForUser } from "@/lib/supabase/route";

type SearchResult = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

type LeadRow = {
  id: string;
  name: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  status: "new" | "contacted" | "proposal" | "won" | "lost" | null;
};

const MAX_SEARCH_RESULTS = 1000;

const searchLeadRows = async (
  supabase: Awaited<ReturnType<typeof getRouteUser>>["supabase"],
  workspaceId: string,
  statuses: LeadRow["status"][],
  query: string,
) => {
  const searchTerm = `%${query}%`;
  const baseQuery = () => supabase
    .from("leads")
    .select("id, name, company, email, phone, status")
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .in("status", statuses);

  const results = await Promise.all([
    baseQuery().ilike("name", searchTerm).limit(MAX_SEARCH_RESULTS),
    baseQuery().ilike("company", searchTerm).limit(MAX_SEARCH_RESULTS),
    baseQuery().ilike("email", searchTerm).limit(MAX_SEARCH_RESULTS),
    baseQuery().ilike("phone", searchTerm).limit(MAX_SEARCH_RESULTS),
  ]);
  const error = results.find((result) => result.error)?.error;

  if (error) {
    throw error;
  }

  return Array.from(new Map(
    results.flatMap((result) => result.data ?? [])
      .map((lead) => [lead.id, lead as LeadRow]),
  ).values());
};

export async function GET(request: Request) {
  const { supabase, user, error } = await getRouteUser(request);
  if (error || !user) {
    return NextResponse.json({
      error: "Unauthorized"
    }, {
      status: 401
    });
  }
  const { workspace } = await loadWorkspaceForUser(supabase, user.id);
  if (!workspace?.id) {
    return NextResponse.json({ leads: [], customers: [], tasks: [], pages: [] });
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("language")
    .eq("id", user.id)
    .maybeSingle();
  const language = normalizeLanguage(profile?.language ?? user.user_metadata?.language);
  const t = (text: string) => translateText(text, language);
  const { searchParams } = new URL(request.url);
  const query = searchParams
    .get("q")
    ?.trim();
  if (!query || query.length < 2) {
    return NextResponse.json({
      leads: [],
      customers: [],
      tasks: [],
      pages: []
    });
  }
  try {
    const [activeLeadRows, customerRows, taskResult] = await Promise.all([
      searchLeadRows(supabase, workspace.id, ["new", "contacted", "proposal"], query),
      searchLeadRows(supabase, workspace.id, ["won", "lost"], query),
      supabase
        .from("tasks")
        .select("id, title, lead_id")
        .eq("workspace_id", workspace.id)
        .ilike("title", `%${query}%`)
        .limit(MAX_SEARCH_RESULTS),
    ]);

    if (taskResult.error) {
      throw taskResult.error;
    }

    const leads: SearchResult[] = activeLeadRows.map((lead) => ({
      id: lead.id,
      title: lead.name || t("Untitled lead"),
      subtitle: lead.company || lead.email || lead.phone || t("Active lead"),
      href: `/leads/${lead.id}`,
    }));
    const customersById = new Map<string, SearchResult>();
    for (const lead of customerRows) {
      const company = lead.company?.trim();
      const isPrivateCustomer = !company;
      const customerId = isPrivateCustomer
        ? `private:${lead.id}`
        : company.toLowerCase();

      customersById.set(customerId, {
        id: customerId,
        title: company || lead.name || t("Untitled customer"),
        subtitle: isPrivateCustomer
          ? `${t(lead.status === "won" ? "Won" : "Lost")} ${t("Private customer")}`
          : `${lead.name || t("Unknown contact")} · ${t(lead.status === "won" ? "Won" : "Lost")}`,
        href: `/customers/${encodeURIComponent(customerId)}`,
      });
    }
    const customers = Array.from(customersById.values());
    const tasks: SearchResult[] = (taskResult.data ?? []).map((task) => ({
      id: task.id,
      title: task.title,
      subtitle: t("Task"),
      href: `/leads/${task.lead_id}`,
    }));
    /*
      Statische Seiten
    */
    const pages = [
      {
        id: "dashboard",
        title: t("Dashboard"),
        href: "/dashboard",
      },
      {
        id: "leads",
        title: t("Leads"),
        href: "/leads",
      },
      {
        id: "customers",
        title: t("Customers"),
        href: "/customers",
      },
      {
        id: "pipeline",
        title: t("Pipeline"),
        href: "/pipeline",
      },
      {
        id: "activities",
        title: t("Activities"),
        href: "/activities",
      },
      {
        id: "tasks",
        title: t("Tasks"),
        href: "/tasks",
      },
      {
        id: "calendar",
        title: t("Calendar"),
        href: "/calendar",
      },
      {
        id: "analytics",
        title: t("Analytics"),
        href: "/analytics",
      },
      {
        id: "forecast",
        title: t("Forecast"),
        href: "/forecast",
      },
      {
        id: "ai",
        title: t("AI"),
        href: "/ai",
      },
      {
        id: "automations",
        title: t("Automations"),
        href: "/automations",
      },
      {
        id: "notifications",
        title: t("Notifications"),
        href: "/notifications",
      },
      {
        id: "feedback",
        title: t("Feedback"),
        href: "/feedback",
      },
      {
        id: "team",
        title: t("Team"),
        href: "/team",
      },
      {
        id: "settings",
        title: t("Settings"),
        href: "/settings",
      },
      {
        id: "billing",
        title: t("Billing"),
        href: "/billing",
      },
      {
        id: "trash",
        title: t("Trash"),
        href: "/trash",
      },
      {
        id: "admin",
        title: t("Admin"),
        href: "/admin",
      },
    ]
      .filter((page) =>
        page.title
          .toLowerCase()
          .includes(query.toLowerCase())
      )
      .map((page) => ({
        id: page.id,
        title: page.title,
        subtitle: t("Page"),
        href: page.href,
      }))
    return NextResponse.json({ leads, customers, tasks, pages });
  }
  catch (error) {
    console.error("GLOBAL SEARCH ERROR:", error);
    return NextResponse.json({ error: "Could not complete search" }, { status: 500 });
  }
}
