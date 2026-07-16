"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"

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
  { href: "/dashboard", title: "Dashboard" },
  { href: "/leads", title: "Leads" },
  { href: "/customers", title: "Customers" },
  { href: "/pipeline", title: "Pipeline" },
  { href: "/tasks", title: "Tasks" },
  { href: "/activities", title: "Activities" },
  { href: "/analytics", title: "Analytics" },
  { href: "/analytics/revenue", title: "Revenue Analytics" },
  { href: "/forecast", title: "Forecast" },
  { href: "/ai", title: "AI Assistant" },
  { href: "/automations", title: "Automations" },
  { href: "/notifications", title: "Notifications" },
  { href: "/team", title: "Team" },
  { href: "/billing", title: "Billing" },
  { href: "/pricing", title: "Pricing" },
  { href: "/demo", title: "Demo" },
  { href: "/admin", title: "Admin" },
  { href: "/settings/profile", title: "Profile Settings" },
  { href: "/settings", title: "Settings" },
]

export default function Search() {
  const router = useRouter()
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
    return pageLinks.filter((page) => page.title.toLowerCase().includes(value))
  }, [query])

  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 py-10 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-3xl border border-border-subtle bg-surface-1 p-5 shadow-2xl">
        <div className="flex items-center gap-3 rounded-2xl border border-border-subtle bg-surface-2 px-4 py-3">
          <span className="text-xs uppercase tracking-[0.3em] text-cyan-400">Search</span>
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search leads, tasks, pages..."
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-foreground/40"
          />
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <SearchSection title="Leads">
            {leads.map((lead) => (
              <button
                key={lead.id}
                onClick={() => {
                  setOpen(false)
                  router.push(`/leads/${lead.id}`)
                }}
                className="w-full rounded-2xl border border-border-subtle bg-surface-2/80 px-4 py-3 text-left text-sm text-foreground/85 transition hover:bg-foreground/5"
              >
                <div className="font-medium text-foreground">{lead.name || "Untitled lead"}</div>
                <div className="mt-1 text-xs text-foreground/55">{lead.company || lead.email || "No company"}</div>
              </button>
            ))}
          </SearchSection>

          <SearchSection title="Tasks">
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
                <div className="mt-1 text-xs text-foreground/55">Lead task</div>
              </button>
            ))}
          </SearchSection>

          <SearchSection title="Pages">
            {pageResults.map((page) => (
              <Link
                key={page.href}
                href={page.href}
                onClick={() => setOpen(false)}
                className="block rounded-2xl border border-border-subtle bg-surface-2/80 px-4 py-3 text-sm text-foreground/85 transition hover:bg-foreground/5"
              >
                {page.title}
              </Link>
            ))}
          </SearchSection>
        </div>

        <p className="mt-4 text-xs text-foreground/45">Press Esc to close. Shortcut: Ctrl + K.</p>
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