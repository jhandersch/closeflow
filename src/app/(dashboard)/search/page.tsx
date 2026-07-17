"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import AuthGuard from "@/components/AuthGuard"
import { useAppPreferences } from "@/components/AppPreferencesProvider"
import { supabase } from "@/lib/supabase/client"

type LeadResult = {
  id: string
  name: string | null
  company: string | null
  email: string | null
  status: string | null
  value: number | null
}

type TaskResult = {
  id: string
  title: string
  lead_id: string
}

type PageLink = { href: string; titleEn: string; titleDe: string }

const pageLinks: PageLink[] = [
  { href: "/dashboard",         titleEn: "Dashboard",          titleDe: "Dashboard" },
  { href: "/leads",             titleEn: "Leads",              titleDe: "Leads" },
  { href: "/customers",         titleEn: "Customers",          titleDe: "Kunden" },
  { href: "/pipeline",          titleEn: "Pipeline",           titleDe: "Pipeline" },
  { href: "/tasks",             titleEn: "Tasks",              titleDe: "Aufgaben" },
  { href: "/activities",        titleEn: "Activities",         titleDe: "Aktivitäten" },
  { href: "/analytics",         titleEn: "Analytics",          titleDe: "Analysen" },
  { href: "/analytics/revenue", titleEn: "Revenue Analytics",  titleDe: "Umsatz-Analysen" },
  { href: "/forecast",          titleEn: "Forecast",           titleDe: "Prognose" },
  { href: "/ai",                titleEn: "AI Assistant",       titleDe: "KI-Assistent" },
  { href: "/automations",       titleEn: "Automations",        titleDe: "Automationen" },
  { href: "/notifications",     titleEn: "Notifications",      titleDe: "Benachrichtigungen" },
  { href: "/team",              titleEn: "Team",               titleDe: "Team" },
  { href: "/billing",           titleEn: "Billing",            titleDe: "Abrechnung" },
  { href: "/pricing",           titleEn: "Pricing",            titleDe: "Preise" },
  { href: "/settings",          titleEn: "Settings",           titleDe: "Einstellungen" },
  { href: "/admin",             titleEn: "Admin",              titleDe: "Admin" },
]

const statusColor: Record<string, string> = {
  won:      "text-emerald-300",
  lost:     "text-rose-300",
  proposal: "text-amber-300",
  new:      "text-cyan-300",
}

export default function SearchPage() {
  const { language } = useAppPreferences()
  const isDe = language === "de"

  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get("q") || "")
  const [leads, setLeads] = useState<LeadResult[]>([])
  const [tasks, setTasks] = useState<TaskResult[]>([])
  const [pageResults, setPageResults] = useState<PageLink[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const q = query.trim()

    if (q.length < 2) {
      setLeads([])
      setTasks([])
      setPageResults([])
      return
    }

    const lower = q.toLowerCase()
    setPageResults(pageLinks.filter((p) => (isDe ? p.titleDe : p.titleEn).toLowerCase().includes(lower)))

    const controller = new AbortController()

    const run = async () => {
      setLoading(true)
      const [leadResponse, userResult] = await Promise.all([
        fetch(`/api/leads/search?q=${encodeURIComponent(q)}`, { signal: controller.signal }),
        supabase.auth.getUser(),
      ])

      if (!controller.signal.aborted && leadResponse.ok) {
        setLeads((await leadResponse.json()) as LeadResult[])
      }

      const user = userResult.data.user
      if (user && !controller.signal.aborted) {
        const { data } = await supabase
          .from("tasks")
          .select("id, title, lead_id")
          .eq("user_id", user.id)
          .ilike("title", `%${q}%`)
          .limit(12)

        if (!controller.signal.aborted) {
          setTasks((data || []) as TaskResult[])
        }
      }

      if (!controller.signal.aborted) setLoading(false)
    }

    void run()

    return () => controller.abort()
  }, [isDe, query])

  const total = leads.length + tasks.length + pageResults.length

  return (
    <AuthGuard>
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-400">{isDe ? "Suche" : "Search"}</p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">{isDe ? "Globale Suche" : "Global Search"}</h1>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-border-subtle bg-surface-1 px-5 py-3">
          <span className="text-xs uppercase tracking-[0.3em] text-foreground/40">{isDe ? "Suche" : "Search"}</span>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isDe ? "Leads, Aufgaben, Seiten suchen..." : "Search leads, tasks, pages..."}
            className="w-full bg-transparent text-foreground outline-none placeholder:text-foreground/40"
          />
          {loading ? <span className="text-xs text-foreground/45">{isDe ? "Suche..." : "Searching..."}</span> : null}
        </div>

        {query.trim().length >= 2 && !loading && total === 0 ? (
          <p className="text-sm text-foreground/55">{isDe ? `Keine Ergebnisse für "${query.trim()}".` : `No results found for "${query.trim()}".`}</p>
        ) : null}

        {leads.length > 0 ? (
          <section>
            <p className="mb-3 text-xs uppercase tracking-[0.3em] text-foreground/50">{isDe ? "Leads" : "Leads"} ({leads.length})</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {leads.map((lead) => (
                <Link
                  key={lead.id}
                  href={`/leads/${lead.id}`}
                  className="rounded-2xl border border-border-subtle bg-surface-1 p-4 transition hover:bg-foreground/5"
                >
                  <p className="font-semibold text-foreground">{lead.name || (isDe ? "Ohne Titel" : "Untitled")}</p>
                  <p className="mt-0.5 text-sm text-foreground/55">{lead.company || lead.email || (isDe ? "-" : "-")}</p>
                  <div className="mt-2 flex items-center gap-3 text-xs">
                    {lead.status ? (
                      <span className={`capitalize font-medium ${statusColor[lead.status] || "text-foreground/60"}`}>{lead.status}</span>
                    ) : null}
                    {lead.value ? <span className="text-foreground/50">€{lead.value.toLocaleString()}</span> : null}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {tasks.length > 0 ? (
          <section>
            <p className="mb-3 text-xs uppercase tracking-[0.3em] text-foreground/50">{isDe ? "Aufgaben" : "Tasks"} ({tasks.length})</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {tasks.map((task) => (
                <Link
                  key={task.id}
                  href={`/leads/${task.lead_id}`}
                  className="rounded-2xl border border-border-subtle bg-surface-1 p-4 transition hover:bg-foreground/5"
                >
                  <p className="font-semibold text-foreground">{task.title}</p>
                  <p className="mt-0.5 text-xs text-foreground/50">{isDe ? "Lead-Aufgabe" : "Lead task"}</p>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {pageResults.length > 0 ? (
          <section>
            <p className="mb-3 text-xs uppercase tracking-[0.3em] text-foreground/50">{isDe ? "Seiten" : "Pages"} ({pageResults.length})</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {pageResults.map((page) => (
                <Link
                  key={page.href}
                  href={page.href}
                  className="rounded-2xl border border-border-subtle bg-surface-1 p-4 transition hover:bg-foreground/5"
                >
                  <p className="font-semibold text-foreground">{isDe ? page.titleDe : page.titleEn}</p>
                  <p className="mt-0.5 text-xs text-foreground/50">{page.href}</p>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {query.trim().length < 2 ? (
          <div className="rounded-2xl border border-border-subtle bg-surface-1 p-8 text-center text-sm text-foreground/50">
            {isDe ? "Gib mindestens 2 Zeichen für die Suche ein." : "Type at least 2 characters to search."}
          </div>
        ) : null}
      </div>
    </AuthGuard>
  )
}
