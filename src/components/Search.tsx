"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { useAppPreferences } from "@/components/AppPreferencesProvider"

type SearchLead = {
  id: string
  name: string | null
  company: string | null
  email: string | null
}

type SearchTask = {
  id: string
  title: string
  lead_id: string
}

const pageLinks = [
  { href: "/dashboard", titleDe: "Dashboard", titleEn: "Dashboard" },
  { href: "/leads", titleDe: "Leads", titleEn: "Leads" },
  { href: "/customers", titleDe: "Kunden", titleEn: "Customers" },
  { href: "/pipeline", titleDe: "Pipeline", titleEn: "Pipeline" },
  { href: "/tasks", titleDe: "Aufgaben", titleEn: "Tasks" },
  { href: "/activities", titleDe: "Aktivitäten", titleEn: "Activities" },
  { href: "/analytics", titleDe: "Analysen", titleEn: "Analytics" },
  { href: "/analytics/revenue", titleDe: "Umsatzanalysen", titleEn: "Revenue Analytics" },
  { href: "/forecast", titleDe: "Prognose", titleEn: "Forecast" },
  { href: "/ai", titleDe: "KI-Assistent", titleEn: "AI Assistant" },
  { href: "/automations", titleDe: "Automatisierungen", titleEn: "Automations" },
  { href: "/notifications", titleDe: "Benachrichtigungen", titleEn: "Notifications" },
  { href: "/team", titleDe: "Team", titleEn: "Team" },
  { href: "/billing", titleDe: "Abrechnung", titleEn: "Billing" },
  { href: "/pricing", titleDe: "Preise", titleEn: "Pricing" },
  { href: "/demo", titleDe: "Demo", titleEn: "Demo" },
  { href: "/admin", titleDe: "Admin", titleEn: "Admin" },
  { href: "/settings/profile", titleDe: "Profileinstellungen", titleEn: "Profile Settings" },
  { href: "/settings", titleDe: "Einstellungen", titleEn: "Settings" },
]

export default function Search() {
  const router = useRouter()
  const { language } = useAppPreferences()
  const isDe = language === "de"
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [leads, setLeads] = useState<SearchLead[]>([])
  const [tasks, setTasks] = useState<SearchTask[]>([])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setOpen(true)
      }

      if (event.key === "Escape") {
        setOpen(false)
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  useEffect(() => {
    const search = async () => {
      const value = query.trim()

      if (!open || value.length < 2) {
        setLeads([])
        setTasks([])
        return
      }

      const [leadResponse, userResult] = await Promise.all([
        fetch(`/api/leads/search?q=${encodeURIComponent(value)}`),
        supabase.auth.getUser(),
      ])

      if (leadResponse.ok) {
        setLeads((await leadResponse.json()) as SearchLead[])
      }

      const user = userResult.data.user

      if (user) {
        const { data } = await supabase
          .from("tasks")
          .select("id, title, lead_id")
          .eq("user_id", user.id)
          .ilike("title", `%${value}%`)
          .limit(10)

        setTasks((data || []) as SearchTask[])
      }
    }

    void search()
  }, [open, query])

  const pageResults = useMemo(() => {
    const value = query.trim().toLowerCase()
    if (!value) return []
    return pageLinks.filter((page) => (isDe ? page.titleDe : page.titleEn).toLowerCase().includes(value))
  }, [isDe, query])

  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 py-10 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-3xl border border-border-subtle bg-surface-1 p-5 shadow-2xl">
        <div className="flex items-center gap-3 rounded-2xl border border-border-subtle bg-surface-2 px-4 py-3">
          <span className="text-xs uppercase tracking-[0.3em] text-cyan-400">{isDe ? "Suche" : "Search"}</span>
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && query.trim().length >= 2) {
                setOpen(false)
                router.push(`/search?q=${encodeURIComponent(query.trim())}`)
              }
            }}
            placeholder={isDe ? "Leads, Aufgaben, Seiten suchen… (Eingabetaste für volle Ergebnisse)" : "Search leads, tasks, pages… (Enter for full results)"}
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-foreground/40"
          />
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <SearchSection title={isDe ? "Leads" : "Leads"}>
            {leads.map((lead) => (
              <button
                key={lead.id}
                onClick={() => {
                  setOpen(false)
                  router.push(`/leads/${lead.id}`)
                }}
                className="w-full rounded-2xl border border-border-subtle bg-surface-2/80 px-4 py-3 text-left text-sm text-foreground/85 transition hover:bg-foreground/5"
              >
                <div className="font-medium text-foreground">{lead.name || (isDe ? "Unbenannter Lead" : "Untitled lead")}</div>
                <div className="mt-1 text-xs text-foreground/55">{lead.company || lead.email || (isDe ? "Keine Firma" : "No company")}</div>
              </button>
            ))}
          </SearchSection>

          <SearchSection title={isDe ? "Aufgaben" : "Tasks"}>
            {tasks.map((task) => (
              <button
                key={task.id}
                onClick={() => {
                  setOpen(false)
                  router.push(`/leads/${task.lead_id}`)
                }}
                className="w-full rounded-2xl border border-border-subtle bg-surface-2/80 px-4 py-3 text-left text-sm text-foreground/85 transition hover:bg-foreground/5"
              >
                <div className="font-medium text-foreground">{task.title}</div>
                <div className="mt-1 text-xs text-foreground/55">{isDe ? "Lead-Aufgabe" : "Lead task"}</div>
              </button>
            ))}
          </SearchSection>

          <SearchSection title={isDe ? "Seiten" : "Pages"}>
            {pageResults.map((page) => (
              <Link
                key={page.href}
                href={page.href}
                onClick={() => setOpen(false)}
                className="block rounded-2xl border border-border-subtle bg-surface-2/80 px-4 py-3 text-sm text-foreground/85 transition hover:bg-foreground/5"
              >
                {isDe ? page.titleDe : page.titleEn}
              </Link>
            ))}
          </SearchSection>
        </div>

        <p className="mt-4 text-xs text-foreground/45">{isDe ? "Eingabetaste öffnet die volle Suche · Esc schließt · Strg+K öffnet erneut." : "Press Enter to open full search · Esc to close · Ctrl+K to reopen."}</p>
      </div>
    </div>
  )
}

function SearchSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 rounded-2xl border border-border-subtle bg-surface-2/60 p-4">
      <p className="text-xs uppercase tracking-[0.25em] text-foreground/55">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  )
}