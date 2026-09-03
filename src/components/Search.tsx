"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SearchInput from "@/components/search/SearchInput";
import SearchResults from "@/components/search/SearchResults";
import { supabase } from "@/lib/supabase/client";
type ResultItem = {
    id: string;
    title: string;
    subtitle?: string;
    href: string;
};
const pageLinks: ResultItem[] = [
    {
        id: "dashboard",
        title: "Dashboard",
        href: "/dashboard",
    },
    {
        id: "leads",
        title: "Leads",
        href: "/leads",
    },
    {
        id: "customers",
        title: "Customers",
        href: "/customers",
    },
    {
        id: "pipeline",
        title: "Pipeline",
        href: "/pipeline",
    },
    {
        id: "tasks",
        title: "Tasks",
        href: "/tasks",
    },
    {
        id: "activities",
        title: "Activities",
        href: "/activities",
    },
    {
        id: "analytics",
        title: "Analytics",
        href: "/analytics",
    },
    {
        id: "forecast",
        title: "Forecast",
        href: "/forecast",
    },
    {
        id: "ai",
        title: "AI Assistant",
        href: "/ai",
    },
    {
        id: "automations",
        title: "Automations",
        href: "/automations",
    },
    {
        id: "notifications",
        title: "Notifications",
        href: "/notifications",
    },
    {
        id: "team",
        title: "Team",
        href: "/team",
    },
    {
        id: "billing",
        title: "Billing",
        href: "/billing",
    },
    {
        id: "settings",
        title: "Settings",
        href: "/settings",
    },
];
export default function Search() {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [leads, setLeads] = useState<ResultItem[]>([]);
    const [tasks, setTasks] = useState<ResultItem[]>([]);
    const [pages, setPages] = useState<ResultItem[]>([]);
    /*
      Ctrl + K
    */
    useEffect(() => {
        const handler = (event: KeyboardEvent) => {
            if ((event.ctrlKey || event.metaKey)
                &&
                    event.key.toLowerCase() === "k") {
                event.preventDefault();
                setOpen(true);
            }
            if (event.key === "Escape") {
                setOpen(false);
            }
        };
        window.addEventListener("keydown", handler);
        return () => {
            window.removeEventListener("keydown", handler);
        };
    }, []);
    /*
      Search
    */
    useEffect(() => {
        if (!open)
            return;
        const search = async () => {
            const value = query.trim();
            if (value.length < 2) {
                setLeads([]);
                setTasks([]);
                setPages([]);
                return;
            }
            try {
                /*
                  Leads
                */
                const leadResponse = await fetch(`/api/leads/search?q=${encodeURIComponent(value)}`, {
                    credentials: "include",
                });
                if (leadResponse.ok) {
                    const leadData = await leadResponse.json();
                    setLeads(Array.isArray(leadData)
                        ?
                            leadData.map((lead: any) => ({
                                id: lead.id,
                                title: lead.name ||
                                    "Unbekannter Lead",
                                subtitle: lead.company ||
                                    lead.email ||
                                    "",
                                href: `/leads/${lead.id}`
                            }))
                        :
                            []);
                }
                /*
                  Tasks
                */
                const { data: taskData } = await supabase
                    .from("tasks")
                    .select("id,title,lead_id")
                    .ilike("title", `%${value}%`)
                    .limit(10);
                setTasks((taskData || [])
                    .map((task: any) => ({
                    id: task.id,
                    title: task.title,
                    subtitle: "Task",
                    href: `/leads/${task.lead_id}`
                })));
                /*
                  Seiten
                */
                setPages(pageLinks.filter(page => page.title
                    .toLowerCase()
                    .includes(value.toLowerCase())));
                setSelectedIndex(0);
            }
            catch (error) {
                console.error("SEARCH ERROR", error);
            }
        };
        const timeout = setTimeout(search, 250);
        return () => clearTimeout(timeout);
    }, [
        query,
        open
    ]);
    const allResults = [
        ...leads,
        ...tasks,
        ...pages,
    ];
    const selectNext = () => {
        if (allResults.length === 0)
            return;
        setSelectedIndex(value => Math.min(value + 1, allResults.length - 1));
    };
    const selectPrevious = () => {
        if (allResults.length === 0)
            return;
        setSelectedIndex(value => Math.max(value - 1, 0));
    };
    const openSelected = () => {
        const item = allResults[selectedIndex];
        if (!item)
            return;
        setOpen(false);
        router.push(item.href);
    };
    if (!open)
        return null;
    return (<div className="
      fixed
      inset-0
      z-50
      flex
      items-start
      justify-center
      bg-black/60
      px-4
      py-10
      backdrop-blur-sm
      " onClick={() => setOpen(false)}>


      <div className="
        w-full
        max-w-2xl
        rounded-3xl
        border
        border-border-subtle
        bg-surface-1
        p-5
        shadow-2xl
        " onClick={(e) => e.stopPropagation()}>


        <SearchInput value={query} onChange={setQuery} onClose={() => setOpen(false)} onEnter={openSelected} onArrowDown={selectNext} onArrowUp={selectPrevious}/>



        <div className="mt-5">


          <SearchResults leads={leads} tasks={tasks} pages={pages} selectedIndex={selectedIndex} onSelect={setSelectedIndex} onClose={() => setOpen(false)}/>


        </div>



      </div>


    </div>);
}
