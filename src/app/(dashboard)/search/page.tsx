"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import { useAppPreferences } from "@/components/AppPreferencesProvider";
import { supabase } from "@/lib/supabase/client";
type LeadResult = {
    id: string;
    name: string | null;
    company: string | null;
    email: string | null;
    status: string | null;
    value: number | null;
};
type TaskResult = {
    id: string;
    title: string;
    lead_id: string;
};
type PageLink = {
    href: string;
    title: string;
};
const pageLinks: PageLink[] = [
    { href: "/dashboard", title: "Dashboard", },
    { href: "/leads", title: "Leads", },
    { href: "/customers", title: "Customers", },
    { href: "/pipeline", title: "Pipeline", },
    { href: "/tasks", title: "Tasks", },
    { href: "/activities", title: "Activities", },
    { href: "/analytics", title: "Analytics", },
    { href: "/analytics/revenue", title: "Revenue Analytics", },
    { href: "/forecast", title: "Forecast", },
    { href: "/ai", title: "AI Assistant", },
    { href: "/automations", title: "Automations", },
    { href: "/notifications", title: "Notifications", },
    { href: "/team", title: "Team", },
    { href: "/billing", title: "Billing", },
    { href: "/pricing", title: "Pricing", },
    { href: "/settings", title: "Settings", },
    { href: "/admin", title: "Admin", },
];
const statusColor: Record<string, string> = {
    won: "text-emerald-300",
    lost: "text-rose-300",
    proposal: "text-amber-300",
    new: "text-cyan-300",
};
export default function SearchPage() {
    const { language } = useAppPreferences();
    const searchParams = useSearchParams();
    const [query, setQuery] = useState(searchParams.get("q") || "");
    const [leads, setLeads] = useState<LeadResult[]>([]);
    const [tasks, setTasks] = useState<TaskResult[]>([]);
    const [pageResults, setPageResults] = useState<PageLink[]>([]);
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        const q = query.trim();
        if (q.length < 2) {
            setLeads([]);
            setTasks([]);
            setPageResults([]);
            return;
        }
        const lower = q.toLowerCase();
        setPageResults(pageLinks.filter((p) => (p.title).toLowerCase().includes(lower)));
        const controller = new AbortController();
        const run = async () => {
            try {
                setLoading(true);
                const [leadResponse, userResult] = await Promise.all([
                    fetch(`/api/leads/search?q=${encodeURIComponent(q)}`, {
                        signal: controller.signal,
                        credentials: "include",
                    }),
                    supabase.auth.getUser(),
                ]);
                if (controller.signal.aborted) {
                    return;
                }
                if (leadResponse.ok) {
                    const leadData = await leadResponse.json();
                    setLeads(leadData as LeadResult[]);
                }
                else {
                    // keep silent; empty result state is handled below
                }
                const user = userResult.data.user;
                if (user) {
                    const { data } = await supabase
                        .from("tasks")
                        .select("id,title,lead_id")
                        .eq("user_id", user.id)
                        .ilike("title", `%${q}%`)
                        .limit(12);
                    if (!controller.signal.aborted) {
                        setTasks((data || []) as TaskResult[]);
                    }
                }
            }
            catch (error: any) {
                if (error.name === "AbortError") {
                    return;
                }
                console.error("Search failed:", error);
            }
            finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        };
        void run();
        return () => controller.abort();
    }, [query]);
    const total = leads.length + tasks.length + pageResults.length;
    return (<AuthGuard>
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-400">{"Search"}</p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">{"Global Search"}</h1>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-border-subtle bg-surface-1 px-5 py-3">
          <span className="text-xs uppercase tracking-[0.3em] text-foreground/40">{"Search"}</span>
          <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder={"Leads, Tasks und Seiten durchsuchen..."} className="w-full bg-transparent text-foreground outline-none placeholder:text-foreground/40"/>
          {loading ? <span className="text-xs text-foreground/45">{"Search..."}</span> : null}
        </div>

        {query.trim().length >= 2 && !loading && total === 0 ? (<p className="text-sm text-foreground/55">{`No results found for "${query.trim()}".`}</p>) : null}

        {leads.length > 0 ? (<section>
            <p className="mb-3 text-xs uppercase tracking-[0.3em] text-foreground/50">{"Leads"} ({leads.length})</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {leads.map((lead) => (<Link key={lead.id} href={`/leads/${lead.id}`} className="rounded-2xl border border-border-subtle bg-surface-1 p-4 transition hover:bg-foreground/5">
                  <p className="font-semibold text-foreground">{lead.name || ("Untitled")}</p>
                  <p className="mt-0.5 text-sm text-foreground/55">{lead.company || lead.email || ("-")}</p>
                  <div className="mt-2 flex items-center gap-3 text-xs">
                    {lead.status ? (<span className={`capitalize font-medium ${statusColor[lead.status] || "text-foreground/60"}`}>{lead.status}</span>) : null}
                    {lead.value ? <span className="text-foreground/50">€{lead.value.toLocaleString()}</span> : null}
                  </div>
                </Link>))}
            </div>
          </section>) : null}

        {tasks.length > 0 ? (<section>
            <p className="mb-3 text-xs uppercase tracking-[0.3em] text-foreground/50">{"Tasks"} ({tasks.length})</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {tasks.map((task) => (<Link key={task.id} href={`/leads/${task.lead_id}`} className="rounded-2xl border border-border-subtle bg-surface-1 p-4 transition hover:bg-foreground/5">
                  <p className="font-semibold text-foreground">{task.title}</p>
                  <p className="mt-0.5 text-xs text-foreground/50">{"Lead-Task"}</p>
                </Link>))}
            </div>
          </section>) : null}

        {pageResults.length > 0 ? (<section>
            <p className="mb-3 text-xs uppercase tracking-[0.3em] text-foreground/50">{"Seiten"} ({pageResults.length})</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {pageResults.map((page) => (<Link key={page.href} href={page.href} className="rounded-2xl border border-border-subtle bg-surface-1 p-4 transition hover:bg-foreground/5">
                  <p className="font-semibold text-foreground">{page.title}</p>
                  <p className="mt-0.5 text-xs text-foreground/50">{page.href}</p>
                </Link>))}
            </div>
          </section>) : null}

        {query.trim().length < 2 ? (<div className="rounded-2xl border border-border-subtle bg-surface-1 p-8 text-center text-sm text-foreground/50">
            {"Type at least 2 characters to search."}
          </div>) : null}
      </div>
    </AuthGuard>);
}
