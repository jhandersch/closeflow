"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
type SearchResult = {
    id: string;
    title: string;
    subtitle: string;
    href: string;
};
export default function SearchPage() {
    const searchParams = useSearchParams();
    const [query, setQuery] = useState(searchParams.get("q") || "");
    const [leads, setLeads] = useState<SearchResult[]>([]);
    const [customers, setCustomers] = useState<SearchResult[]>([]);
    const [tasks, setTasks] = useState<SearchResult[]>([]);
    const [pageResults, setPageResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    useEffect(() => {
        const q = query.trim();
        if (q.length < 2) {
            setLeads([]);
            setCustomers([]);
            setTasks([]);
            setPageResults([]);
            setError(null);
            return;
        }
        const controller = new AbortController();
        const run = async () => {
            try {
                setLoading(true);
                setError(null);
                const response = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
                    signal: controller.signal,
                    credentials: "include",
                });
                if (controller.signal.aborted) {
                    return;
                }
                const data = await response.json() as {
                    error?: string;
                    leads?: SearchResult[];
                    customers?: SearchResult[];
                    tasks?: SearchResult[];
                    pages?: SearchResult[];
                };
                if (!response.ok) {
                    throw new Error(data.error || "Could not complete search");
                }
                setLeads(data.leads ?? []);
                setCustomers(data.customers ?? []);
                setTasks(data.tasks ?? []);
                setPageResults(data.pages ?? []);
            }
            catch (error: any) {
                if (error.name === "AbortError") {
                    return;
                }
                console.error("Search failed:", error);
                setError(error instanceof Error ? error.message : "Could not complete search");
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
    const total = leads.length + customers.length + tasks.length + pageResults.length;
    return (<AuthGuard>
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-400">{"Search"}</p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">{"Global Search"}</h1>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-border-subtle bg-surface-1 px-5 py-3">
          <span className="text-xs uppercase tracking-[0.3em] text-foreground/40">{"Search"}</span>
          <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder={"Search leads, customers, tasks, and pages..."} className="w-full bg-transparent text-foreground outline-none placeholder:text-foreground/40"/>
          {loading ? <span className="text-xs text-foreground/45">{"Search..."}</span> : null}
        </div>

        {error ? <p className="text-sm text-rose-300">{error}</p> : null}

        {query.trim().length >= 2 && !loading && !error && total === 0 ? (<p className="text-sm text-foreground/55">{`No results found for "${query.trim()}".`}</p>) : null}

        {leads.length > 0 ? (<section>
            <p className="mb-3 text-xs uppercase tracking-[0.3em] text-foreground/50">{"Active Leads"} ({leads.length})</p>
            <div className="grid gap-2 sm:grid-cols-2">
                            {leads.map((lead) => (<Link key={lead.id} href={lead.href} className="rounded-2xl border border-border-subtle bg-surface-1 p-4 transition hover:bg-foreground/5">
                                    <p className="font-semibold text-foreground">{lead.title}</p>
                                    <p className="mt-0.5 text-sm text-foreground/55">{lead.subtitle}</p>
                </Link>))}
            </div>
          </section>) : null}

                {customers.length > 0 ? (<section>
                        <p className="mb-3 text-xs uppercase tracking-[0.3em] text-foreground/50">{"Customers"} ({customers.length})</p>
                        <div className="grid gap-2 sm:grid-cols-2">
                            {customers.map((customer) => (<Link key={customer.id} href={customer.href} className="rounded-2xl border border-border-subtle bg-surface-1 p-4 transition hover:bg-foreground/5">
                                    <p className="font-semibold text-foreground">{customer.title}</p>
                                    <p className="mt-0.5 text-sm text-foreground/55">{customer.subtitle}</p>
                                </Link>))}
                        </div>
                    </section>) : null}

        {tasks.length > 0 ? (<section>
            <p className="mb-3 text-xs uppercase tracking-[0.3em] text-foreground/50">{"Tasks"} ({tasks.length})</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {tasks.map((task) => (<Link key={task.id} href={task.href} className="rounded-2xl border border-border-subtle bg-surface-1 p-4 transition hover:bg-foreground/5">
                  <p className="font-semibold text-foreground">{task.title}</p>
                  <p className="mt-0.5 text-xs text-foreground/50">{task.subtitle}</p>
                </Link>))}
            </div>
          </section>) : null}

        {pageResults.length > 0 ? (<section>
            <p className="mb-3 text-xs uppercase tracking-[0.3em] text-foreground/50">{"Pages"} ({pageResults.length})</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {pageResults.map((page) => (<Link key={page.href} href={page.href} className="rounded-2xl border border-border-subtle bg-surface-1 p-4 transition hover:bg-foreground/5">
                  <p className="font-semibold text-foreground">{page.title}</p>
                  <p className="mt-0.5 text-xs text-foreground/50">{page.subtitle}</p>
                </Link>))}
            </div>
          </section>) : null}

        {query.trim().length < 2 ? (<div className="rounded-2xl border border-border-subtle bg-surface-1 p-8 text-center text-sm text-foreground/50">
            {"Type at least 2 characters to search."}
          </div>) : null}
      </div>
    </AuthGuard>);
}
