"use client";
import { translateText } from "@/lib/i18n";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SearchInput from "@/components/search/SearchInput";
import SearchResults from "@/components/search/SearchResults";
type ResultItem = {
    id: string;
    title: string;
    subtitle?: string;
    href: string;
};
const pageLinks: ResultItem[] = [
    {
        id: "dashboard",
        title: translateText("Dashboard"),
        href: "/dashboard",
    },
    {
        id: "leads",
        title: translateText("Leads"),
        href: "/leads",
    },
    {
        id: "customers",
        title: translateText("Customers"),
        href: "/customers",
    },
    {
        id: "pipeline",
        title: translateText("Pipeline"),
        href: "/pipeline",
    },
    {
        id: "tasks",
        title: translateText("Tasks"),
        href: "/tasks",
    },
    {
        id: "activities",
        title: translateText("Activities"),
        href: "/activities",
    },
    {
        id: "analytics",
        title: translateText("Analytics"),
        href: "/analytics",
    },
    {
        id: "forecast",
        title: translateText("Forecast"),
        href: "/forecast",
    },
    {
        id: "ai",
        title: translateText("AI Assistant"),
        href: "/ai",
    },
    {
        id: "automations",
        title: translateText("Automations"),
        href: "/automations",
    },
    {
        id: "notifications",
        title: translateText("Notifications"),
        href: "/notifications",
    },
    {
        id: "team",
        title: translateText("Team"),
        href: "/team",
    },
    {
        id: "billing",
        title: translateText("Billing"),
        href: "/billing",
    },
    {
        id: "settings",
        title: translateText("Settings"),
        href: "/settings",
    },
];
export default function Search() {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [leads, setLeads] = useState<ResultItem[]>([]);
    const [customers, setCustomers] = useState<ResultItem[]>([]);
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
                setCustomers([]);
                setTasks([]);
                setPages([]);
                return;
            }
            try {
                const response = await fetch(`/api/search?q=${encodeURIComponent(value)}`, {
                    credentials: "include",
                });
                if (response.ok) {
                    const data = await response.json() as {
                        leads?: ResultItem[];
                        customers?: ResultItem[];
                        tasks?: ResultItem[];
                        pages?: ResultItem[];
                    };
                    setLeads(data.leads ?? []);
                    setCustomers(data.customers ?? []);
                    setTasks(data.tasks ?? []);
                    setPages(data.pages ?? []);
                }
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
        ...customers,
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


          <SearchResults leads={leads} customers={customers} tasks={tasks} pages={pages} selectedIndex={selectedIndex} onSelect={setSelectedIndex} onClose={() => setOpen(false)}/>


        </div>



      </div>


    </div>);
}
