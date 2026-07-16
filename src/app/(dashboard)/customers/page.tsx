"use client"

import Link from "next/link"
import { useMemo, useRef, useState } from "react"
import AuthGuard from "@/components/AuthGuard"
import { useLeadsData } from "@/hooks/useLeadsData"
import * as XLSX from "xlsx"
import { supabase } from "@/lib/supabase/client"

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

type ImportIssue = {
  row: number
  reason: string
  company: string
  contact: string
}

const escapeCsv = (value: unknown) => {
  const text = String(value ?? "")
  if (text.includes(",") || text.includes("\n") || text.includes('"')) {
    return `"${text.replaceAll('"', '""')}"`
  }
  return text
}

export default function CustomersPage() {
  const { leads, loading, error, refresh } = useLeadsData({ activityLimit: 0 })

  const [filter, setFilter] = useState<CustomerFilter>("all")
  const [query, setQuery] = useState("")
  const [importingCsv, setImportingCsv] = useState(false)
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const [importIssues, setImportIssues] = useState<ImportIssue[]>([])
  const fileInputRef = useRef<HTMLInputElement | null>(null)

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

  const getAuthHeaders = async (includeJson = false) => {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    const headers: Record<string, string> = {}

    if (includeJson) {
      headers["Content-Type"] = "application/json"
    }

    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`
    }

    return headers
  }

  const downloadExport = async (format: "csv" | "xlsx") => {
    const response = await fetch(`/api/customers/export?format=${format}`, {
      headers: await getAuthHeaders(),
    })
    if (!response.ok) {
      setImportMessage(`${format.toUpperCase()} export failed.`)
      return
    }

    const buffer = await response.arrayBuffer()
    const blob = new Blob([buffer], {
      type:
        format === "xlsx"
          ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          : "text/csv;charset=utf-8;",
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `closeflow-customers-${new Date().toISOString().slice(0, 10)}.${format}`
    link.click()
    URL.revokeObjectURL(url)
  }

  const importCsv = async (file: File) => {
    setImportingCsv(true)
    setImportMessage(null)
    setImportIssues([])

    try {
      const lowerName = file.name.toLowerCase()
      const csvText = lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls")
        ? (() => {
            const parseWorkbook = async () => {
              const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" })
              const firstSheet = workbook.SheetNames[0]
              if (!firstSheet) {
                throw new Error("Import failed: workbook has no sheets.")
              }
              return XLSX.utils.sheet_to_csv(workbook.Sheets[firstSheet])
            }
            return parseWorkbook()
          })()
        : file.text()

      const resolvedCsvText = await csvText
      const response = await fetch("/api/customers/import", {
        method: "POST",
        headers: await getAuthHeaders(true),
        body: JSON.stringify({ csv: resolvedCsvText }),
      })

      if (!response.ok) {
        const text = await response.text()
        setImportMessage(text || "Import failed.")
        return
      }

      const data = (await response.json()) as { inserted?: number; skipped?: number; issues?: ImportIssue[] }
      const issues = Array.isArray(data.issues) ? data.issues : []
      setImportIssues(issues)
      setImportMessage(
        `Import done. Added ${data.inserted || 0} customers, skipped ${data.skipped || 0}${issues.length ? `. ${issues.length} issue(s) available in report.` : "."}`
      )
      await refresh()
    } catch (importError) {
      setImportMessage(importError instanceof Error ? importError.message : "Import failed.")
    } finally {
      setImportingCsv(false)
    }
  }

  const downloadImportIssuesReport = () => {
    if (!importIssues.length) return

    const headers = ["row", "reason", "company", "contact"]
    const rows = importIssues.map((issue) => [
      issue.row,
      issue.reason,
      issue.company,
      issue.contact,
    ])

    const csv = [headers.join(","), ...rows.map((row) => row.map(escapeCsv).join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `closeflow-customers-import-issues-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

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

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => void downloadExport("csv")}
            className="rounded-xl border border-border-subtle bg-surface-1 px-4 py-2 text-sm text-foreground/80 hover:bg-foreground/5"
          >
            Export CSV
          </button>
          <button
            onClick={() => void downloadExport("xlsx")}
            className="rounded-xl border border-border-subtle bg-surface-1 px-4 py-2 text-sm text-foreground/80 hover:bg-foreground/5"
          >
            Export Excel
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importingCsv}
            className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-300 disabled:opacity-60"
          >
            {importingCsv ? "Importing..." : "Import File"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) {
                void importCsv(file)
              }
              event.currentTarget.value = ""
            }}
          />
          {importIssues.length ? (
            <button
              onClick={downloadImportIssuesReport}
              className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-200"
            >
              Download Import Issues
            </button>
          ) : null}
          {importMessage ? <p className="text-sm text-foreground/65">{importMessage}</p> : null}
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
