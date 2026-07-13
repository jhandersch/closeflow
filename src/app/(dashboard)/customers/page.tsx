"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import AuthGuard from "@/components/AuthGuard"
import { useLeadsData } from "@/hooks/useLeadsData"

const VIP_THRESHOLD = 50000

type CustomerFilter = "all" | "active" | "lost" | "vip"

type CustomerSummary = {
  id: string
  company: string
  contacts: string[]
  totalRevenue: number
  deals: number
  wonDeals: number
  lostDeals: number
  lastContactAt: string | null
}

export default function CustomersPage() {
  const { leads, loading, error } = useLeadsData({ activityLimit: 0 })

  const [filter, setFilter] = useState<CustomerFilter>("all")
  const [query, setQuery] = useState("")

  const customers = useMemo(() => {
    const byCompany = new Map<string, CustomerSummary>()

    for (const lead of leads) {
      const key = (lead.company || "").trim().toLowerCase()
      if (!key) continue

      const existing = byCompany.get(key)
      const lastActivity = lead.last_activity_at || lead.updated_at || lead.created_at || null

      if (!existing) {
        byCompany.set(key, {
          id: key,
          company: lead.company,
          contacts: lead.name ? [lead.name] : [],
          totalRevenue: lead.status === "won" ? lead.value || 0 : 0,
          deals: 1,
          wonDeals: lead.status === "won" ? 1 : 0,
          lostDeals: lead.status === "lost" ? 1 : 0,
          lastContactAt: lastActivity,
        })
        continue
      }

      if (lead.name && !existing.contacts.includes(lead.name)) {
        existing.contacts.push(lead.name)
      }

      existing.deals += 1
      existing.wonDeals += lead.status === "won" ? 1 : 0
      existing.lostDeals += lead.status === "lost" ? 1 : 0
      existing.totalRevenue += lead.status === "won" ? lead.value || 0 : 0

      if (lastActivity && (!existing.lastContactAt || new Date(lastActivity) > new Date(existing.lastContactAt))) {
        existing.lastContactAt = lastActivity
      }
    }

    return Array.from(byCompany.values()).sort((a, b) => b.totalRevenue - a.totalRevenue)
  }, [leads])

  const filteredCustomers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return customers
      .filter((customer) => {
        const matchesQuery = !normalizedQuery || customer.company.toLowerCase().includes(normalizedQuery)
        if (!matchesQuery) return false

        if (filter === "active") return customer.wonDeals > 0
        if (filter === "lost") return customer.wonDeals === 0 && customer.lostDeals > 0
        if (filter === "vip") return customer.totalRevenue >= VIP_THRESHOLD
        return true
      })
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
  }, [customers, filter, query])

  return (
    <AuthGuard>
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-400">Customers</p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">Customer Management</h1>
          <p className="mt-2 text-sm text-foreground/65">Manage active customers, churn risk, and high-value VIP accounts.</p>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto_auto]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search customers..."
            className="w-full rounded-xl border border-border-subtle bg-surface-1 px-4 py-2 text-sm text-foreground outline-none"
          />

          <button
            onClick={() => setFilter("all")}
            className={`rounded-xl border px-4 py-2 text-sm ${filter === "all" ? "border-foreground bg-foreground text-background" : "border-border-subtle text-foreground/80"}`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("active")}
            className={`rounded-xl border px-4 py-2 text-sm ${filter === "active" ? "border-foreground bg-foreground text-background" : "border-border-subtle text-foreground/80"}`}
          >
            Active Customers
          </button>
          <button
            onClick={() => setFilter("lost")}
            className={`rounded-xl border px-4 py-2 text-sm ${filter === "lost" ? "border-foreground bg-foreground text-background" : "border-border-subtle text-foreground/80"}`}
          >
            Lost Customers
          </button>
          <button
            onClick={() => setFilter("vip")}
            className={`rounded-xl border px-4 py-2 text-sm ${filter === "vip" ? "border-foreground bg-foreground text-background" : "border-border-subtle text-foreground/80"}`}
          >
            VIP
          </button>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200">
            Could not load customers: {error}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-2xl border border-border-subtle bg-surface-1 p-6 text-foreground">Loading customers...</div>
        ) : filteredCustomers.length === 0 ? (
          <div className="rounded-2xl border border-border-subtle bg-surface-1 p-8 text-sm text-foreground/65">No customers found for the selected filter.</div>
        ) : (
          <div className="space-y-3">
            {filteredCustomers.map((customer) => (
              <Link
                key={customer.id}
                href={`/customers/${encodeURIComponent(customer.id)}`}
                className="block rounded-2xl border border-border-subtle bg-surface-1 p-5 transition hover:border-cyan-400/30"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">{customer.company}</h2>
                    <p className="mt-1 text-sm text-foreground/65">Contacts: {customer.contacts.join(", ") || "n/a"}</p>
                  </div>

                  <div className="grid gap-3 text-sm md:grid-cols-3">
                    <div>
                      <p className="text-foreground/55">Revenue</p>
                      <p className="font-semibold text-emerald-300">EUR {customer.totalRevenue.toLocaleString("de-DE")}</p>
                    </div>
                    <div>
                      <p className="text-foreground/55">Deals</p>
                      <p className="font-semibold text-foreground">{customer.deals}</p>
                    </div>
                    <div>
                      <p className="text-foreground/55">Last Contact</p>
                      <p className="font-semibold text-foreground">
                        {customer.lastContactAt ? new Date(customer.lastContactAt).toLocaleDateString("de-DE") : "n/a"}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AuthGuard>
  )
}
